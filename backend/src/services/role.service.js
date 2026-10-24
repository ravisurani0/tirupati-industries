const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const { insertAndGetId } = require('../utils/insert');

/** Roles created by the seeder that the app relies on - they cannot be deleted. */
const SYSTEM_ROLES = ['admin', 'manager'];

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function list() {
  return db('roles as r')
    .leftJoin('users as u', 'u.role_id', 'r.id')
    .select('r.id', 'r.name', 'r.slug', 'r.description', 'r.created_at', 'r.updated_at')
    .count({ users_count: 'u.id' })
    .groupBy('r.id', 'r.name', 'r.slug', 'r.description', 'r.created_at', 'r.updated_at')
    .orderBy('r.id', 'asc')
    .then((rows) => rows.map((r) => ({ ...r, users_count: Number(r.users_count), is_system: SYSTEM_ROLES.includes(r.slug) })));
}

async function findById(id) {
  const role = await db('roles').where({ id }).first();
  if (!role) throw ApiError.notFound('Role not found');
  return { ...role, is_system: SYSTEM_ROLES.includes(role.slug) };
}

async function findBySlug(slug) {
  return db('roles').where({ slug }).first();
}

async function create({ name, slug, description }) {
  const finalSlug = slugify(slug || name);
  if (!finalSlug) throw ApiError.unprocessable('Validation failed', [{ field: 'name', message: 'Role name is invalid' }]);

  const exists = await findBySlug(finalSlug);
  if (exists) throw ApiError.conflict('A role with this name already exists', [{ field: 'name', message: 'Role already exists' }]);

  const id = await insertAndGetId('roles', { name: name.trim(), slug: finalSlug, description: description || null });
  return findById(id);
}

async function update(id, { name, description }) {
  const role = await findById(id);
  const changes = { updated_at: db.fn.now() };
  if (name !== undefined) changes.name = name.trim();
  if (description !== undefined) changes.description = description || null;
  await db('roles').where({ id: role.id }).update(changes);
  return findById(role.id);
}

async function remove(id) {
  const role = await findById(id);
  if (role.is_system) throw ApiError.badRequest(`The "${role.name}" role is a system role and cannot be deleted`);

  const { count } = await db('users').where({ role_id: role.id }).count({ count: '*' }).first();
  if (Number(count) > 0) throw ApiError.badRequest('This role is assigned to users. Reassign them before deleting it.');

  await db('roles').where({ id: role.id }).del();
}

module.exports = { list, findById, findBySlug, create, update, remove, slugify, SYSTEM_ROLES };
