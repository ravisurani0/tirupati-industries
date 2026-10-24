const bcrypt = require('bcryptjs');
const db = require('../config/db');
const config = require('../config');
const ApiError = require('../utils/ApiError');
const { insertAndGetId } = require('../utils/insert');
const { toPublicUrl, removeStoredFile } = require('../utils/files');
const roleService = require('./role.service');

const USER_COLUMNS = [
  'u.id',
  'u.first_name',
  'u.last_name',
  'u.email',
  'u.phone',
  'u.address',
  'u.profile_logo',
  'u.role_id',
  'u.is_active',
  'u.last_login_at',
  'u.created_at',
  'u.updated_at',
  'r.name as role_name',
  'r.slug as role_slug',
];

function baseQuery() {
  return db('users as u').leftJoin('roles as r', 'r.id', 'u.role_id');
}

/** Shapes a DB row into the public user object (never includes the password). */
function toPublic(row) {
  if (!row) return null;
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    full_name: `${row.first_name} ${row.last_name}`.trim(),
    email: row.email,
    phone: row.phone,
    address: row.address,
    profile_logo: row.profile_logo,
    profile_logo_url: toPublicUrl(row.profile_logo),
    is_active: Boolean(row.is_active),
    last_login_at: row.last_login_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    role: row.role_id ? { id: row.role_id, name: row.role_name, slug: row.role_slug } : null,
  };
}

async function findById(id) {
  const row = await baseQuery().select(USER_COLUMNS).where('u.id', id).first();
  if (!row) throw ApiError.notFound('User not found');
  return toPublic(row);
}

/** Returns the raw row including the password hash - for authentication only. */
async function findForAuth(email) {
  return baseQuery()
    .select([...USER_COLUMNS, 'u.password'])
    .where('u.email', String(email).toLowerCase().trim())
    .first();
}

async function emailTaken(email, exceptId) {
  const q = db('users').where('email', String(email).toLowerCase().trim());
  if (exceptId) q.whereNot('id', exceptId);
  return Boolean(await q.first('id'));
}

async function resolveRoleId(roleId) {
  if (roleId === undefined || roleId === null || roleId === '') {
    const role = await roleService.findBySlug(config.defaultRoleSlug);
    if (!role) throw ApiError.badRequest(`Default role "${config.defaultRoleSlug}" is missing. Run the seeders.`);
    return role.id;
  }
  const role = await db('roles').where({ id: roleId }).first();
  if (!role) throw ApiError.unprocessable('Validation failed', [{ field: 'role_id', message: 'Selected role does not exist' }]);
  return role.id;
}

async function create(data) {
  if (await emailTaken(data.email)) {
    throw ApiError.conflict('Email is already registered', [{ field: 'email', message: 'Email is already registered' }]);
  }

  const record = {
    first_name: data.first_name.trim(),
    last_name: data.last_name.trim(),
    email: data.email.toLowerCase().trim(),
    phone: data.phone || null,
    address: data.address || null,
    profile_logo: data.profile_logo || null,
    password: await bcrypt.hash(data.password, config.bcryptRounds),
    role_id: await resolveRoleId(data.role_id),
    is_active: data.is_active === undefined ? true : Boolean(data.is_active),
  };

  const id = await insertAndGetId('users', record);
  return findById(id);
}

async function update(id, data) {
  const existing = await db('users').where({ id }).first();
  if (!existing) throw ApiError.notFound('User not found');

  if (data.email && (await emailTaken(data.email, id))) {
    throw ApiError.conflict('Email is already registered', [{ field: 'email', message: 'Email is already registered' }]);
  }

  const changes = { updated_at: db.fn.now() };
  ['first_name', 'last_name'].forEach((k) => {
    if (data[k] !== undefined) changes[k] = String(data[k]).trim();
  });
  ['phone', 'address'].forEach((k) => {
    if (data[k] !== undefined) changes[k] = data[k] || null;
  });
  if (data.email !== undefined) changes.email = data.email.toLowerCase().trim();
  if (data.password) changes.password = await bcrypt.hash(data.password, config.bcryptRounds);
  if (data.role_id !== undefined && data.role_id !== '') changes.role_id = await resolveRoleId(data.role_id);
  if (data.is_active !== undefined) changes.is_active = Boolean(data.is_active);
  if (data.profile_logo !== undefined) {
    changes.profile_logo = data.profile_logo || null;
    if (existing.profile_logo && existing.profile_logo !== data.profile_logo) removeStoredFile(existing.profile_logo);
  }

  await db('users').where({ id }).update(changes);
  return findById(id);
}

async function remove(id) {
  const existing = await db('users').where({ id }).first();
  if (!existing) throw ApiError.notFound('User not found');
  await db('users').where({ id }).del();
  removeStoredFile(existing.profile_logo);
}

async function list({ page = 1, perPage = 10, search = '', roleId } = {}) {
  const limit = Math.min(Math.max(Number(perPage) || 10, 1), 100);
  const current = Math.max(Number(page) || 1, 1);

  const filtered = () => {
    const q = baseQuery();
    if (search) {
      const term = `%${String(search).toLowerCase()}%`;
      q.where((w) =>
        w
          .whereRaw('LOWER(u.first_name) LIKE ?', [term])
          .orWhereRaw('LOWER(u.last_name) LIKE ?', [term])
          .orWhereRaw('LOWER(u.email) LIKE ?', [term])
          .orWhereRaw('LOWER(u.phone) LIKE ?', [term]),
      );
    }
    if (roleId) q.where('u.role_id', roleId);
    return q;
  };

  const [{ total }] = await filtered().count({ total: 'u.id' });
  const rows = await filtered()
    .select(USER_COLUMNS)
    .orderBy('u.id', 'desc')
    .limit(limit)
    .offset((current - 1) * limit);

  const totalNum = Number(total);
  return {
    items: rows.map(toPublic),
    meta: { page: current, per_page: limit, total: totalNum, last_page: Math.max(Math.ceil(totalNum / limit), 1) },
  };
}

async function stats() {
  const [{ users }] = await db('users').count({ users: '*' });
  const [{ active }] = await db('users').where({ is_active: true }).count({ active: '*' });
  const [{ roles }] = await db('roles').count({ roles: '*' });
  return { total_users: Number(users), active_users: Number(active), total_roles: Number(roles) };
}

async function touchLastLogin(id) {
  await db('users').where({ id }).update({ last_login_at: db.fn.now() });
}

module.exports = { findById, findForAuth, create, update, remove, list, stats, touchLastLogin, toPublic };
