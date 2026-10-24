const crypto = require('crypto');
const db = require('../config/db');
const ApiError = require('../utils/ApiError');

const num = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v));
const round2 = (n) => Math.round(n * 100) / 100;

const COLUMNS = ['id', 'title', 'description', 'account_number', 'initial_amount', 'is_active', 'is_default', 'created_by', 'updated_by', 'created_at', 'updated_at'];

/**
 * Credit / debit totals per account.
 *
 * LEDGER SOURCES: everything that moves money in or out of an account is summed
 * here, so every balance stays correct:
 *  - expenses          (credit or debit)
 *  - salary_advances   (debit: advance / loan paid to an employee)
 * When the salary module is added, its payments are added here as another debit source.
 */
async function totalsFor(accountIds) {
  if (!accountIds.length) return {};
  const totals = Object.fromEntries(accountIds.map((id) => [id, { credits: 0, debits: 0, transactions: 0, advances: 0, advance_amount: 0 }]));

  const expenseRows = await db('expenses')
    .select('account_id')
    .select(db.raw("COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) as credits"))
    .select(db.raw("COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) as debits"))
    .count({ transactions: '*' })
    .whereIn('account_id', accountIds)
    .groupBy('account_id');
  expenseRows.forEach((r) => {
    const t = totals[r.account_id];
    t.credits += num(r.credits);
    t.debits += num(r.debits);
    t.transactions += Number(r.transactions);
  });

  const advanceRows = await db('salary_advances')
    .select('account_id')
    .select(db.raw('COALESCE(SUM(amount), 0) as paid'))
    .count({ advances: '*' })
    .whereIn('account_id', accountIds)
    .groupBy('account_id');
  advanceRows.forEach((r) => {
    const t = totals[r.account_id];
    t.debits += num(r.paid);
    t.advances += Number(r.advances);
    t.advance_amount += num(r.paid);
  });

  return totals;
}

function toPublic(row, totals = {}) {
  const credits = totals.credits || 0;
  const debits = totals.debits || 0;
  const initial = num(row.initial_amount);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    account_number: row.account_number,
    initial_amount: initial,
    is_active: Boolean(row.is_active),
    is_default: Boolean(row.is_default),
    total_credits: round2(credits),
    total_debits: round2(debits),
    current_balance: round2(initial + credits - debits),
    transactions_count: (totals.transactions || 0) + (totals.advances || 0), // expenses + advances/loans
    advances_count: totals.advances || 0,
    total_advances: round2(totals.advance_amount || 0), // advances + loans paid out (included in total_debits)
    expenses_count: totals.transactions || 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function findRow(id) {
  const row = await db('accounts').select(COLUMNS).where({ id }).first();
  if (!row) throw ApiError.notFound('Account not found');
  return row;
}

async function findById(id) {
  const row = await findRow(id);
  const totals = await totalsFor([row.id]);
  return toPublic(row, totals[row.id]);
}

function pick(data) {
  const out = {};
  if (data.title !== undefined) out.title = String(data.title).trim();
  if (data.description !== undefined) out.description = data.description ? String(data.description).trim() : null;
  if (data.account_number !== undefined) out.account_number = data.account_number ? String(data.account_number).trim() : null;
  if (data.initial_amount !== undefined) out.initial_amount = Number(data.initial_amount);
  if (data.is_active !== undefined) out.is_active = Boolean(data.is_active);
  if (data.is_default !== undefined) out.is_default = Boolean(data.is_default);
  // An inactive account can't be the default
  if (out.is_active === false) out.is_default = false;
  return out;
}

async function create(data, userId) {
  const id = crypto.randomUUID();
  const record = pick(data);
  await db.transaction(async (trx) => {
    if (record.is_default) await trx('accounts').update({ is_default: false });
    await trx('accounts').insert({ id, ...record, created_by: userId || null, updated_by: userId || null, created_at: db.fn.now(), updated_at: db.fn.now() });
  });
  return findById(id);
}

async function update(id, data, userId) {
  await findRow(id);
  const changes = pick(data);
  await db.transaction(async (trx) => {
    if (changes.is_default) await trx('accounts').whereNot({ id }).update({ is_default: false });
    await trx('accounts').where({ id }).update({ ...changes, updated_by: userId || null, updated_at: db.fn.now() });
  });
  return findById(id);
}

async function remove(id) {
  await findRow(id);
  const { count } = await db('expenses').where({ account_id: id }).count({ count: '*' }).first();
  const { adv } = await db('salary_advances').where({ account_id: id }).count({ adv: '*' }).first();
  const used = Number(count) + Number(adv);
  if (used > 0) {
    throw ApiError.conflict(`This account has ${used} transaction${used === 1 ? '' : 's'} (expenses or advances) and cannot be deleted. Mark it inactive instead.`);
  }
  await db('accounts').where({ id }).del();
}

async function list({ page = 1, perPage = 20, search = '', status } = {}) {
  const limit = Math.min(Math.max(Number(perPage) || 20, 1), 100);
  const current = Math.max(Number(page) || 1, 1);
  const filtered = () => {
    const q = db('accounts');
    if (search) {
      const term = `%${String(search).toLowerCase()}%`;
      q.where((w) => w.whereRaw('LOWER(title) LIKE ?', [term]).orWhereRaw('LOWER(account_number) LIKE ?', [term]));
    }
    if (status === 'active') q.where('is_active', true);
    if (status === 'inactive') q.where('is_active', false);
    return q;
  };
  const [{ total }] = await filtered().count({ total: '*' });
  const rows = await filtered()
    .select(COLUMNS)
    .orderBy('is_default', 'desc')
    .orderBy('is_active', 'desc')
    .orderBy('title', 'asc')
    .limit(limit)
    .offset((current - 1) * limit);
  const totals = await totalsFor(rows.map((r) => r.id));
  const totalNum = Number(total);
  return {
    items: rows.map((r) => toPublic(r, totals[r.id])),
    meta: { page: current, per_page: limit, total: totalNum, last_page: Math.max(Math.ceil(totalNum / limit), 1) },
  };
}

/** Throws a 422 unless the account exists and is active (used before posting a transaction). */
async function assertUsable(accountId, { allowInactive = false } = {}) {
  const row = await db('accounts').where({ id: accountId }).first('id', 'is_active', 'title');
  if (!row) throw ApiError.unprocessable('Validation failed', [{ field: 'account_id', message: 'Account not found' }]);
  if (!row.is_active && !allowInactive) {
    throw ApiError.unprocessable('Validation failed', [{ field: 'account_id', message: `"${row.title}" is inactive. Choose an active account.` }]);
  }
  return row;
}

/**
 * Full ledger for one account: expenses (credit/debit) and salary advances /
 * loans paid from it, newest first, each with the running balance after it.
 * source: 'expense' | 'advance' | 'loan' (optional filter; the running balance
 * is always computed over every transaction so it matches the account balance).
 */
async function ledger(id, { source, page = 1, perPage = 20 } = {}) {
  const account = await findRow(id);
  const limit = Math.min(Math.max(Number(perPage) || 20, 1), 100);
  const current = Math.max(Number(page) || 1, 1);

  const expenseRows = await db('expenses as x')
    .leftJoin('expense_categories as c', 'c.id', 'x.category_id')
    .leftJoin('users as u', 'u.id', 'x.transaction_by')
    .where('x.account_id', id)
    .select('x.id', 'x.title', 'x.description', 'x.amount', 'x.transaction_type', 'x.expense_date as date', 'x.bill_number', 'x.bill_image', 'x.created_at', 'c.title as category_title', 'u.first_name as by_first', 'u.last_name as by_last');

  const advanceRows = await db('salary_advances as s')
    .join('employees as e', 'e.id', 's.employee_id')
    .leftJoin('users as u', 'u.id', 's.created_by')
    .where('s.account_id', id)
    .select('s.id', 's.amount', 's.is_loan', 's.transfer_date as date', 's.description', 's.interest_rate', 's.tenure_months', 's.status', 's.created_at', 'e.id as employee_id', 'e.first_name as emp_first', 'e.last_name as emp_last', 'u.first_name as by_first', 'u.last_name as by_last');

  const { toDateOnly } = require('../utils/dates'); // eslint-disable-line global-require
  const { toPublicUrl } = require('../utils/files'); // eslint-disable-line global-require
  const name = (f, l) => `${f || ''} ${l || ''}`.trim() || null;

  const all = [
    ...expenseRows.map((r) => ({
      id: r.id,
      source: 'expense',
      date: toDateOnly(r.date),
      created_at: r.created_at,
      title: r.title,
      description: r.description,
      direction: r.transaction_type, // credit | debit
      amount: num(r.amount),
      category: r.category_title || null,
      employee: null,
      bill_number: r.bill_number,
      bill_image_url: toPublicUrl(r.bill_image),
      by: name(r.by_first, r.by_last),
    })),
    ...advanceRows.map((r) => ({
      id: r.id,
      source: r.is_loan ? 'loan' : 'advance',
      date: toDateOnly(r.date),
      created_at: r.created_at,
      title: `${r.is_loan ? 'Loan' : 'Salary advance'} to ${name(r.emp_first, r.emp_last)}`,
      description: r.is_loan ? `${num(r.interest_rate)}% / year · ${r.tenure_months} months${r.description ? ` · ${r.description}` : ''}` : r.description,
      direction: 'debit',
      amount: num(r.amount),
      category: null,
      employee: { id: r.employee_id, name: name(r.emp_first, r.emp_last) },
      status: r.status,
      by: name(r.by_first, r.by_last),
    })),
  ];

  // Oldest first to build the running balance, then newest first for display
  const ts = (v) => new Date(v || 0).getTime();
  all.sort((a, b) => (a.date === b.date ? ts(a.created_at) - ts(b.created_at) : a.date < b.date ? -1 : 1));
  let balance = num(account.initial_amount);
  all.forEach((t) => {
    balance = round2(balance + (t.direction === 'credit' ? t.amount : -t.amount));
    t.balance_after = balance;
  });
  all.reverse();

  const filtered = source ? all.filter((t) => t.source === source) : all;
  const counts = all.reduce((acc, t) => ({ ...acc, [t.source]: (acc[t.source] || 0) + 1 }), { expense: 0, advance: 0, loan: 0 });
  const total = filtered.length;
  return {
    items: filtered.slice((current - 1) * limit, current * limit),
    meta: { page: current, per_page: limit, total, last_page: Math.max(Math.ceil(total / limit), 1), counts: { all: all.length, ...counts } },
  };
}

module.exports = { ledger, findById, create, update, remove, list, assertUsable, totalsFor };
