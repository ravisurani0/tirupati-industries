const crypto = require('crypto');
const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const { toDateOnly } = require('../utils/dates');
const accountService = require('./account.service');

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

/** YYYY-MM shifted by n months. */
function addMonths(month, n) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Repayment figures.
 *  Advance: recovered in full from the salary of the transfer month.
 *  Loan:    simple interest at `rate`% PER YEAR for `months` months, repaid in
 *           equal monthly installments starting the month after the transfer.
 */
function calculate({ amount, transferDate, isLoan, rate, months }) {
  const transferMonth = transferDate.slice(0, 7);
  if (!isLoan) {
    return {
      interest_amount: 0,
      total_repayable: round2(amount),
      monthly_installment: round2(amount),
      repayment_start_month: transferMonth,
      installments: 1,
    };
  }
  const interest = round2((amount * rate * months) / 100 / 12);
  const total = round2(amount + interest);
  return {
    interest_amount: interest,
    total_repayable: total,
    monthly_installment: round2(total / months),
    repayment_start_month: addMonths(transferMonth, 1),
    installments: months,
  };
}

/** Month-by-month plan; the last installment absorbs rounding so the sum equals total_repayable. */
function schedule(rec) {
  const n = rec.is_loan ? rec.tenure_months : 1;
  const out = [];
  let remaining = rec.total_repayable;
  for (let i = 0; i < n; i += 1) {
    const due = i === n - 1 ? round2(remaining) : rec.monthly_installment;
    remaining = round2(remaining - due);
    out.push({ number: i + 1, month: addMonths(rec.repayment_start_month, i), amount: due, balance_after: remaining });
  }
  return out;
}

const COLUMNS = [
  's.*',
  'e.first_name as emp_first_name',
  'e.last_name as emp_last_name',
  'e.mobile_number as emp_mobile',
  'e.payroll_type as emp_payroll_type',
  'a.title as account_title',
  'a.account_number as account_number',
  'u.first_name as by_first_name',
  'u.last_name as by_last_name',
];

function baseQuery() {
  return db('salary_advances as s')
    .join('employees as e', 'e.id', 's.employee_id')
    .leftJoin('accounts as a', 'a.id', 's.account_id')
    .leftJoin('users as u', 'u.id', 's.created_by');
}

function toPublic(r, { withSchedule = false } = {}) {
  const rec = {
    id: r.id,
    employee_id: r.employee_id,
    employee: { id: r.employee_id, full_name: `${r.emp_first_name} ${r.emp_last_name}`.trim(), first_name: r.emp_first_name, last_name: r.emp_last_name, mobile_number: r.emp_mobile, payroll_type: r.emp_payroll_type },
    account_id: r.account_id,
    account: r.account_id ? { id: r.account_id, title: r.account_title, account_number: r.account_number } : null,
    amount: num(r.amount),
    transfer_date: toDateOnly(r.transfer_date),
    description: r.description,
    recover_from_salary: Boolean(r.recover_from_salary),
    repay_from_salary: Boolean(r.repay_from_salary),
    is_loan: Boolean(r.is_loan),
    type: r.is_loan ? 'loan' : 'advance',
    interest_rate: num(r.interest_rate),
    tenure_months: r.tenure_months === null ? null : Number(r.tenure_months),
    interest_amount: num(r.interest_amount),
    total_repayable: num(r.total_repayable),
    monthly_installment: num(r.monthly_installment),
    repayment_start_month: r.repayment_start_month,
    recovered_amount: num(r.recovered_amount),
    outstanding: round2(num(r.total_repayable) - num(r.recovered_amount)),
    status: r.status,
    created_by: r.created_by ? { id: r.created_by, name: `${r.by_first_name || ''} ${r.by_last_name || ''}`.trim() } : null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
  if (withSchedule) rec.schedule = schedule(rec);
  return rec;
}

async function findById(id) {
  const row = await baseQuery().select(COLUMNS).where('s.id', id).first();
  if (!row) throw ApiError.notFound('Advance / loan not found');
  return toPublic(row, { withSchedule: true });
}

/** Normalises input and recalculates the repayment figures. */
async function build(data, current) {
  const merged = { ...current, ...data };
  const employee = await db('employees').where({ id: merged.employee_id }).first('id', 'is_active');
  if (!employee) throw ApiError.unprocessable('Validation failed', [{ field: 'employee_id', message: 'Employee not found' }]);
  if (!current && !employee.is_active) throw ApiError.unprocessable('Validation failed', [{ field: 'employee_id', message: 'This employee is inactive' }]);

  const accountId = merged.account_id || null;
  if (accountId && (!current || accountId !== current.account_id)) await accountService.assertUsable(accountId);

  const isLoan = Boolean(merged.is_loan);
  const amount = Number(merged.amount);
  const rate = isLoan ? Number(merged.interest_rate) : null;
  const months = isLoan ? Number(merged.tenure_months) : null;
  const transferDate = toDateOnly(merged.transfer_date);
  const calc = calculate({ amount, transferDate, isLoan, rate, months });

  const recovered = num(current?.recovered_amount) || 0;
  if (current && recovered > calc.total_repayable) {
    throw ApiError.unprocessable('Validation failed', [{ field: 'amount', message: `₹${recovered} has already been recovered; the total can't be less than that.` }]);
  }

  return {
    employee_id: merged.employee_id,
    account_id: accountId,
    amount,
    transfer_date: transferDate,
    description: merged.description ? String(merged.description).trim() : null,
    // One flag per type: advances are *recovered* from the transfer month's salary,
    // loans are *repaid* in installments from salary. The other flag is always false.
    recover_from_salary: !isLoan && Boolean(merged.recover_from_salary),
    repay_from_salary: isLoan && Boolean(merged.repay_from_salary),
    is_loan: isLoan,
    interest_rate: rate,
    tenure_months: months,
    interest_amount: calc.interest_amount,
    total_repayable: calc.total_repayable,
    monthly_installment: calc.monthly_installment,
    repayment_start_month: calc.repayment_start_month,
    status: recovered >= calc.total_repayable ? 'settled' : 'open',
  };
}

async function create(data, userId) {
  const record = await build(data);
  const id = crypto.randomUUID();
  await db('salary_advances').insert({ id, ...record, recovered_amount: 0, created_by: userId, updated_by: userId, created_at: db.fn.now(), updated_at: db.fn.now() });
  return findById(id);
}

async function update(id, data, userId) {
  const current = await db('salary_advances').where({ id }).first();
  if (!current) throw ApiError.notFound('Advance / loan not found');
  const record = await build(data, current);
  await db('salary_advances').where({ id }).update({ ...record, updated_by: userId, updated_at: db.fn.now() });
  return findById(id);
}

async function remove(id) {
  const current = await db('salary_advances').where({ id }).first();
  if (!current) throw ApiError.notFound('Advance / loan not found');
  if (Number(current.recovered_amount) > 0) {
    throw ApiError.conflict('Part of this has already been recovered from salary, so it cannot be deleted.');
  }
  await db('salary_advances').where({ id }).del();
}

/** Filters: employeeId, type (advance|loan), status (open|settled), from, to, search (employee name). */
async function list({ page = 1, perPage = 20, employeeId, type, status, from, to, search = '' } = {}) {
  const limit = Math.min(Math.max(Number(perPage) || 20, 1), 100);
  const current = Math.max(Number(page) || 1, 1);
  const nameSql = String(db.client.config.client).startsWith('mysql') ? "LOWER(CONCAT(e.first_name, ' ', e.last_name))" : "LOWER(e.first_name || ' ' || e.last_name)";

  const filtered = () => {
    const q = baseQuery();
    if (employeeId) q.where('s.employee_id', employeeId);
    if (type === 'loan') q.where('s.is_loan', true);
    if (type === 'advance') q.where('s.is_loan', false);
    if (status) q.where('s.status', status);
    if (from) q.where('s.transfer_date', '>=', from);
    if (to) q.where('s.transfer_date', '<=', to);
    if (search) q.whereRaw(`${nameSql} LIKE ?`, [`%${String(search).toLowerCase()}%`]);
    return q;
  };

  const [sums] = await filtered()
    .count({ total: 's.id' })
    .select(db.raw('COALESCE(SUM(s.amount), 0) as given'))
    .select(db.raw('COALESCE(SUM(s.interest_amount), 0) as interest'))
    .select(db.raw('COALESCE(SUM(s.total_repayable - s.recovered_amount), 0) as outstanding'));

  const rows = await filtered()
    .select(COLUMNS)
    .orderBy('s.transfer_date', 'desc')
    .orderBy('s.created_at', 'desc')
    .limit(limit)
    .offset((current - 1) * limit);

  const totalNum = Number(sums.total);
  return {
    items: rows.map((r) => toPublic(r)),
    meta: {
      page: current,
      per_page: limit,
      total: totalNum,
      last_page: Math.max(Math.ceil(totalNum / limit), 1),
      summary: { total_given: round2(sums.given), total_interest: round2(sums.interest), total_outstanding: round2(sums.outstanding) },
    },
  };
}

module.exports = { calculate, schedule, findById, create, update, remove, list };
