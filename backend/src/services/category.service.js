const crypto = require('crypto');
const db = require('../config/db');
const ApiError = require('../utils/ApiError');

const COLUMNS = ['id', 'title', 'description', 'is_active', 'created_at', 'updated_at'];

/** Number of expenses and debit total per category. */
async function usageFor(ids) {
  if (!ids.length) return {};
  const rows = await db('expenses')
    .select('category_id')
    .count({ expenses: '*' })
    .select(db.raw("COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) as debits"))
    .whereIn('category_id', ids)
    .groupBy('category_id');
  return Object.fromEntries(rows.map((r) => [r.category_id, { expenses: Number(r.expenses), debits: Number(r.debits) || 0 }]));
}

function toPublic(row, usage = {}) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    is_active: Boolean(row.is_active),
    expenses_count: usage.expenses || 0,
    total_debits: Math.round((usage.debits || 0) * 100) / 100,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function findRow(id) {
  const row = await db('expense_categories').select(COLUMNS).where({ id }).first();
  if (!row) throw ApiError.notFound('Category not found');
  return row;
}

async function findById(id) {
  const row = await findRow(id);
  return toPublic(row, (await usageFor([id]))[id]);
}

async function assertUniqueTitle(title, exceptId) {
  const q = db('expense_categories').whereRaw('LOWER(title) = ?', [title.toLowerCase()]);
  if (exceptId) q.whereNot('id', exceptId);
  if (await q.first('id')) throw ApiError.conflict('A category with this title already exists', [{ field: 'title', message: 'A category with this title already exists' }]);
}

function pick(data) {
  const out = {};
  if (data.title !== undefined) out.title = String(data.title).trim();
  if (data.description !== undefined) out.description = data.description ? String(data.description).trim() : null;
  if (data.is_active !== undefined) out.is_active = Boolean(data.is_active);
  return out;
}

async function create(data, userId) {
  const record = pick(data);
  await assertUniqueTitle(record.title);
  const id = crypto.randomUUID();
  await db('expense_categories').insert({ id, ...record, created_by: userId || null, updated_by: userId || null, created_at: db.fn.now(), updated_at: db.fn.now() });
  return findById(id);
}

async function update(id, data, userId) {
  await findRow(id);
  const changes = pick(data);
  if (changes.title) await assertUniqueTitle(changes.title, id);
  await db('expense_categories').where({ id }).update({ ...changes, updated_by: userId || null, updated_at: db.fn.now() });
  return findById(id);
}

async function remove(id) {
  await findRow(id);
  const { count } = await db('expenses').where({ category_id: id }).count({ count: '*' }).first();
  if (Number(count) > 0) {
    throw ApiError.conflict(`This category is used by ${count} expense${Number(count) === 1 ? '' : 's'} and cannot be deleted. Mark it inactive instead.`);
  }
  await db('expense_categories').where({ id }).del();
}

async function list({ search = '', status } = {}) {
  const q = db('expense_categories').select(COLUMNS);
  if (search) {
    const term = `%${String(search).toLowerCase()}%`;
    q.where((w) => w.whereRaw('LOWER(title) LIKE ?', [term]).orWhereRaw('LOWER(description) LIKE ?', [term]));
  }
  if (status === 'active') q.where('is_active', true);
  if (status === 'inactive') q.where('is_active', false);
  const rows = await q.orderBy('is_active', 'desc').orderBy('title', 'asc');
  const usage = await usageFor(rows.map((r) => r.id));
  return rows.map((r) => toPublic(r, usage[r.id]));
}

/** Throws a 422 unless the category exists (and is active, for new assignments). */
async function assertUsable(categoryId, { allowInactive = false } = {}) {
  const row = await db('expense_categories').where({ id: categoryId }).first('id', 'is_active', 'title');
  if (!row) throw ApiError.unprocessable('Validation failed', [{ field: 'category_id', message: 'Category not found' }]);
  if (!row.is_active && !allowInactive) {
    throw ApiError.unprocessable('Validation failed', [{ field: 'category_id', message: `"${row.title}" is inactive. Choose an active category.` }]);
  }
  return row;
}

module.exports = { findById, create, update, remove, list, assertUsable };
