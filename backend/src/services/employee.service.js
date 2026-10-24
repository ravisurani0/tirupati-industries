const crypto = require('crypto');
const db = require('../config/db');
const ApiError = require('../utils/ApiError');

const PAYROLL_TYPES = ['monthly_fixed', 'hourly'];

const COLUMNS = [
  'id',
  'first_name',
  'last_name',
  'mobile_number',
  'address',
  'email',
  'joining_date',
  'payroll_type',
  'monthly_salary',
  'hourly_rate',
  'fixed_working_hours',
  'notes',
  'is_active',
  'created_at',
  'updated_at',
];

const EDITABLE = COLUMNS.filter((c) => !['id', 'created_at', 'updated_at'].includes(c));

// MySQL treats || as OR, so build the full-name expression per client
const FULL_NAME_SQL = String(db.client.config.client).startsWith('mysql')
  ? "LOWER(CONCAT(first_name, ' ', last_name))"
  : "LOWER(first_name || ' ' || last_name)";

const toNumber = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

/** DATE columns come back as JS Dates (pg/mysql, local midnight) or strings (sqlite). Normalise to YYYY-MM-DD. */
function toDateOnly(v) {
  if (!v) return null;
  if (v instanceof Date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }
  return String(v).slice(0, 10);
}

function toPublic(row) {
  if (!row) return null;
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    full_name: `${row.first_name} ${row.last_name}`.trim(),
    mobile_number: row.mobile_number,
    address: row.address,
    email: row.email,
    joining_date: toDateOnly(row.joining_date),
    payroll_type: row.payroll_type,
    monthly_salary: toNumber(row.monthly_salary),
    hourly_rate: toNumber(row.hourly_rate),
    fixed_working_hours: toNumber(row.fixed_working_hours),
    notes: row.notes,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Keeps only editable columns and turns empty optional values into NULL. */
function pick(data) {
  const out = {};
  EDITABLE.forEach((k) => {
    if (data[k] === undefined) return;
    let v = data[k];
    if (typeof v === 'string') v = v.trim();
    if (v === '' && !['first_name', 'last_name', 'mobile_number'].includes(k)) v = null;
    if (k === 'email' && v) v = v.toLowerCase();
    if (k === 'is_active') v = Boolean(v);
    out[k] = v;
  });
  return out;
}

async function findById(id) {
  const row = await db('employees').select(COLUMNS).where({ id }).first();
  if (!row) throw ApiError.notFound('Employee not found');
  return toPublic(row);
}

async function create(data) {
  const id = crypto.randomUUID();
  await db('employees').insert({ id, ...pick(data), created_at: db.fn.now(), updated_at: db.fn.now() });
  return findById(id);
}

async function update(id, data) {
  await findById(id); // 404 if missing
  await db('employees').where({ id }).update({ ...pick(data), updated_at: db.fn.now() });
  return findById(id);
}

async function remove(id) {
  await findById(id);
  const { count } = await db('salary_advances').where({ employee_id: id }).count({ count: '*' }).first();
  if (Number(count) > 0) {
    throw ApiError.conflict(`This employee has ${count} salary advance${Number(count) === 1 ? '' : 's'} / loan${Number(count) === 1 ? '' : 's'} on record and cannot be deleted. Mark them inactive instead.`);
  }
  await db('employees').where({ id }).del();
}

async function list({ page = 1, perPage = 10, search = '', status, payrollType } = {}) {
  const limit = Math.min(Math.max(Number(perPage) || 10, 1), 100);
  const current = Math.max(Number(page) || 1, 1);

  const filtered = () => {
    const q = db('employees');
    if (search) {
      const term = `%${String(search).toLowerCase()}%`;
      q.where((w) =>
        w
          .whereRaw('LOWER(first_name) LIKE ?', [term])
          .orWhereRaw('LOWER(last_name) LIKE ?', [term])
          .orWhereRaw(`${FULL_NAME_SQL} LIKE ?`, [term])
          .orWhereRaw('LOWER(email) LIKE ?', [term])
          .orWhere('mobile_number', 'like', `%${search}%`),
      );
    }
    if (status === 'active') q.where('is_active', true);
    if (status === 'inactive') q.where('is_active', false);
    if (payrollType) q.where('payroll_type', payrollType);
    return q;
  };

  const [{ total }] = await filtered().count({ total: '*' });
  const rows = await filtered()
    .select(COLUMNS)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'asc')
    .limit(limit)
    .offset((current - 1) * limit);

  const totalNum = Number(total);
  return {
    items: rows.map(toPublic),
    meta: { page: current, per_page: limit, total: totalNum, last_page: Math.max(Math.ceil(totalNum / limit), 1) },
  };
}

async function stats() {
  const [{ total }] = await db('employees').count({ total: '*' });
  const [{ active }] = await db('employees').where('is_active', true).count({ active: '*' });
  return { total_employees: Number(total), active_employees: Number(active) };
}

module.exports = { PAYROLL_TYPES, findById, create, update, remove, list, stats };
