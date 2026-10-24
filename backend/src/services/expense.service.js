const crypto = require('crypto');
const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const { toDateOnly } = require('../utils/dates');
const { toPublicUrl, removeStoredFile } = require('../utils/files');
const accountService = require('./account.service');
const categoryService = require('./category.service');

const TYPES = ['debit', 'credit'];
const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

const COLUMNS = [
  'x.id',
  'x.account_id',
  'x.category_id',
  'c.title as category_title',
  'x.title',
  'x.description',
  'x.amount',
  'x.transaction_type',
  'x.expense_date',
  'x.bill_number',
  'x.bill_image',
  'x.transaction_by',
  'x.updated_by',
  'x.created_at',
  'x.updated_at',
  'a.title as account_title',
  'a.account_number as account_number',
  'tu.first_name as by_first_name',
  'tu.last_name as by_last_name',
  'uu.first_name as upd_first_name',
  'uu.last_name as upd_last_name',
];

function baseQuery() {
  return db('expenses as x')
    .join('accounts as a', 'a.id', 'x.account_id')
    .leftJoin('expense_categories as c', 'c.id', 'x.category_id')
    .leftJoin('users as tu', 'tu.id', 'x.transaction_by')
    .leftJoin('users as uu', 'uu.id', 'x.updated_by');
}

const userRef = (id, first, last) => (id ? { id, name: `${first || ''} ${last || ''}`.trim() || `User #${id}` } : null);

function toPublic(r) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    amount: num(r.amount),
    transaction_type: r.transaction_type,
    expense_date: toDateOnly(r.expense_date),
    bill_number: r.bill_number,
    bill_image: r.bill_image,
    bill_image_url: toPublicUrl(r.bill_image),
    account: { id: r.account_id, title: r.account_title, account_number: r.account_number },
    account_id: r.account_id,
    category: r.category_id ? { id: r.category_id, title: r.category_title } : null,
    category_id: r.category_id,
    transaction_by: userRef(r.transaction_by, r.by_first_name, r.by_last_name),
    updated_by: userRef(r.updated_by, r.upd_first_name, r.upd_last_name),
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

async function findById(id) {
  const row = await baseQuery().select(COLUMNS).where('x.id', id).first();
  if (!row) throw ApiError.notFound('Expense not found');
  return toPublic(row);
}

function pick(data) {
  const out = {};
  if (data.title !== undefined) out.title = String(data.title).trim();
  if (data.description !== undefined) out.description = data.description ? String(data.description).trim() : null;
  if (data.amount !== undefined) out.amount = Number(data.amount);
  if (data.transaction_type !== undefined) out.transaction_type = data.transaction_type;
  if (data.expense_date !== undefined) out.expense_date = data.expense_date;
  if (data.bill_number !== undefined) out.bill_number = data.bill_number ? String(data.bill_number).trim() : null;
  if (data.account_id !== undefined) out.account_id = data.account_id;
  if (data.category_id !== undefined) out.category_id = data.category_id || null;
  return out;
}

/** "Transaction by" is always the signed-in user. */
async function create(data, userId) {
  await accountService.assertUsable(data.account_id);
  if (data.category_id) await categoryService.assertUsable(data.category_id);
  const id = crypto.randomUUID();
  await db('expenses').insert({
    id,
    ...pick(data),
    bill_image: data.bill_image || null,
    transaction_by: userId,
    updated_by: userId,
    created_at: db.fn.now(),
    updated_at: db.fn.now(),
  });
  return findById(id);
}

async function update(id, data, userId) {
  const current = await db('expenses').where({ id }).first();
  if (!current) throw ApiError.notFound('Expense not found');
  // Moving to another account requires that account to be active; keeping an inactive one is allowed
  if (data.account_id && data.account_id !== current.account_id) await accountService.assertUsable(data.account_id);
  if (data.category_id && data.category_id !== current.category_id) await categoryService.assertUsable(data.category_id);

  const changes = { ...pick(data), updated_by: userId, updated_at: db.fn.now() };
  if (data.bill_image !== undefined) {
    changes.bill_image = data.bill_image || null;
    if (current.bill_image && current.bill_image !== data.bill_image) removeStoredFile(current.bill_image);
  }
  await db('expenses').where({ id }).update(changes);
  return findById(id);
}

async function remove(id) {
  const current = await db('expenses').where({ id }).first();
  if (!current) throw ApiError.notFound('Expense not found');
  await db('expenses').where({ id }).del();
  removeStoredFile(current.bill_image);
}

/** Paginated list + totals for the same filters. Filters: from, to, accountId, categoryId ('none' = uncategorized), type, search. */
async function list({ page = 1, perPage = 20, from, to, accountId, categoryId, type, search = '' } = {}) {
  const limit = Math.min(Math.max(Number(perPage) || 20, 1), 100);
  const current = Math.max(Number(page) || 1, 1);

  const filtered = () => {
    const q = baseQuery();
    if (from) q.where('x.expense_date', '>=', from);
    if (to) q.where('x.expense_date', '<=', to);
    if (accountId) q.where('x.account_id', accountId);
    if (categoryId === 'none') q.whereNull('x.category_id');
    else if (categoryId) q.where('x.category_id', categoryId);
    if (type) q.where('x.transaction_type', type);
    if (search) {
      const term = `%${String(search).toLowerCase()}%`;
      q.where((w) => w.whereRaw('LOWER(x.title) LIKE ?', [term]).orWhereRaw('LOWER(x.bill_number) LIKE ?', [term]).orWhereRaw('LOWER(x.description) LIKE ?', [term]));
    }
    return q;
  };

  const [sums] = await filtered()
    .count({ total: 'x.id' })
    .select(db.raw("COALESCE(SUM(CASE WHEN x.transaction_type = 'credit' THEN x.amount ELSE 0 END), 0) as credits"))
    .select(db.raw("COALESCE(SUM(CASE WHEN x.transaction_type = 'debit' THEN x.amount ELSE 0 END), 0) as debits"));

  const rows = await filtered()
    .select(COLUMNS)
    .orderBy('x.expense_date', 'desc')
    .orderBy('x.created_at', 'desc')
    .limit(limit)
    .offset((current - 1) * limit);

  const totalNum = Number(sums.total);
  const credits = Number(sums.credits) || 0;
  const debits = Number(sums.debits) || 0;
  return {
    items: rows.map(toPublic),
    meta: {
      page: current,
      per_page: limit,
      total: totalNum,
      last_page: Math.max(Math.ceil(totalNum / limit), 1),
      summary: { total_credits: Math.round(credits * 100) / 100, total_debits: Math.round(debits * 100) / 100, net: Math.round((credits - debits) * 100) / 100 },
    },
  };
}

module.exports = { TYPES, findById, create, update, remove, list };
