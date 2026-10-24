const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const { today, toDateOnly } = require('../utils/dates');

/*
 * PAYROLL (calculated live, nothing stored yet)
 *
 * Period: 1st of the month (or the joining date) up to today for the current
 * month, or the last day for a past month.
 *
 * Fixed salary (monthly_fixed)
 *   per_day      = monthly_salary / days_in_month
 *   unpaid_days  = attendance days marked "absent" or "leave"
 *   payable_days = days in period - unpaid_days   (present / holiday / off / not marked are paid)
 *   earned       = per_day x payable_days
 *
 * Hourly
 *   hours  = sum of actual_hours on attendance entries in the period
 *   earned = hours x hourly_rate
 *
 * Deductions
 *   advances: open salary advances with recover_from_salary, due this month or
 *             earlier -> whole outstanding amount
 *   loans:    open loans with repay_from_salary -> this month's installment
 *             (capped at what is still outstanding)
 *
 * net_payable = max(0, earned - deductions); any shortfall is carried forward.
 */

const UNPAID_STATUSES = ['absent', 'leave'];
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const num = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v));

function addMonths(month, n) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
const monthDiff = (from, to) => {
  const [y1, m1] = from.split('-').map(Number);
  const [y2, m2] = to.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
};
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000) + 1;

/** Period boundaries for a YYYY-MM month. */
function periodFor(month) {
  const t = today();
  const currentMonth = t.slice(0, 7);
  if (month > currentMonth) throw ApiError.badRequest('Payroll can only be calculated for the current or a past month');
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const start = `${month}-01`;
  const end = `${month}-${String(daysInMonth).padStart(2, '0')}`;
  const asOf = month === currentMonth ? t : end;
  return { month, start, end, asOf, daysInMonth, isCurrent: month === currentMonth, today: t };
}

/** This month's installment for a loan (last installment absorbs rounding). */
function loanInstallmentFor(loan, month) {
  const idx = monthDiff(loan.repayment_start_month, month);
  const n = Number(loan.tenure_months);
  if (idx < 0 || idx >= n) return { index: idx, due: 0 };
  const emi = num(loan.monthly_installment);
  const due = idx === n - 1 ? round2(num(loan.total_repayable) - emi * (n - 1)) : emi;
  return { index: idx, due };
}

/** Advances / loans that affect this month's salary. */
function deductionsFor(records, month) {
  const items = [];
  records.forEach((r) => {
    const outstanding = round2(num(r.total_repayable) - num(r.recovered_amount));
    if (r.status !== 'open' || outstanding <= 0) return;
    if (!r.is_loan) {
      if (r.recover_from_salary && r.repayment_start_month <= month) {
        items.push({ id: r.id, kind: 'advance', label: `Salary advance (${toDateOnly(r.transfer_date)})`, amount: outstanding, outstanding, carried_over: r.repayment_start_month < month });
      }
      return;
    }
    if (!r.repay_from_salary) return;
    const { index, due } = loanInstallmentFor(r, month);
    if (due > 0) {
      items.push({ id: r.id, kind: 'loan', label: `Loan installment ${index + 1} of ${r.tenure_months}`, amount: round2(Math.min(due, outstanding)), outstanding });
    }
  });
  return items;
}

function computeEmployee(e, period, att, advRecords) {
  const joined = e.joining_date ? toDateOnly(e.joining_date) : null;
  const from = joined && joined > period.start ? joined : period.start;
  const notJoinedYet = from > period.asOf;
  const counts = { present: 0, absent: 0, leave: 0, holiday: 0, off: 0 };
  let hours = 0;
  att.forEach((a) => {
    const d = toDateOnly(a.attendance_date);
    if (d < from || d > period.asOf) return;
    counts[a.attendance_status] = (counts[a.attendance_status] || 0) + 1;
    hours += num(a.actual_hours);
  });
  hours = round2(hours);

  let earned = 0;
  let basis;
  if (e.payroll_type === 'hourly') {
    const rate = num(e.hourly_rate);
    earned = round2(hours * rate);
    basis = { type: 'hourly', hours, hourly_rate: rate, days_worked: counts.present };
  } else {
    const salary = num(e.monthly_salary);
    const perDay = salary / period.daysInMonth;
    const periodDays = notJoinedYet ? 0 : daysBetween(from, period.asOf);
    const unpaidDays = UNPAID_STATUSES.reduce((s, k) => s + counts[k], 0);
    const payableDays = Math.max(0, periodDays - unpaidDays);
    earned = round2(perDay * payableDays);
    basis = {
      type: 'monthly_fixed',
      monthly_salary: salary,
      days_in_month: period.daysInMonth,
      per_day: round2(perDay),
      period_days: periodDays,
      unpaid_days: unpaidDays,
      payable_days: payableDays,
      leave_deduction: round2(perDay * unpaidDays),
    };
  }

  const deductions = deductionsFor(advRecords, period.month);
  const advanceTotal = round2(deductions.filter((d) => d.kind === 'advance').reduce((s, d) => s + d.amount, 0));
  const loanTotal = round2(deductions.filter((d) => d.kind === 'loan').reduce((s, d) => s + d.amount, 0));
  const totalDeductions = round2(advanceTotal + loanTotal);
  const net = round2(earned - totalDeductions);

  return {
    employee: {
      id: e.id,
      first_name: e.first_name,
      last_name: e.last_name,
      full_name: `${e.first_name} ${e.last_name}`.trim(),
      payroll_type: e.payroll_type,
      monthly_salary: num(e.monthly_salary),
      hourly_rate: num(e.hourly_rate),
      joining_date: joined,
      is_active: Boolean(e.is_active),
    },
    period_from: notJoinedYet ? null : from,
    attendance: { ...counts, hours, marked_days: Object.values(counts).reduce((s, n) => s + n, 0) },
    basis,
    gross_earned: earned,
    deductions,
    advance_deduction: advanceTotal,
    loan_deduction: loanTotal,
    total_deductions: totalDeductions,
    net_payable: Math.max(0, net),
    carry_forward: net < 0 ? round2(-net) : 0,
    open_advances_total: round2(advRecords.filter((r) => r.status === 'open').reduce((s, r) => s + num(r.total_repayable) - num(r.recovered_amount), 0)),
  };
}

/** Payroll for every relevant employee in a month. Filters: payrollType, search, employeeId. */
async function forMonth({ month, payrollType, search = '', employeeId } = {}) {
  const period = periodFor(month);

  const eq = db('employees as e')
    .select('e.*')
    .where((w) =>
      w
        .where('e.is_active', true)
        .orWhereExists(db('attendance').select(db.raw('1')).whereRaw('attendance.employee_id = e.id').whereBetween('attendance_date', [period.start, period.asOf])),
    )
    .andWhere((w) => w.whereNull('e.joining_date').orWhere('e.joining_date', '<=', period.asOf));
  if (payrollType) eq.where('e.payroll_type', payrollType);
  if (employeeId) eq.where('e.id', employeeId);
  if (search) {
    const nameSql = String(db.client.config.client).startsWith('mysql') ? "LOWER(CONCAT(e.first_name, ' ', e.last_name))" : "LOWER(e.first_name || ' ' || e.last_name)";
    eq.whereRaw(`${nameSql} LIKE ?`, [`%${String(search).toLowerCase()}%`]);
  }
  const employees = await eq.orderBy('e.first_name').orderBy('e.last_name');
  const ids = employees.map((e) => e.id);
  if (!ids.length) return { period, items: [], totals: { employees: 0, gross_earned: 0, total_deductions: 0, net_payable: 0, carry_forward: 0 } };

  const attendance = await db('attendance')
    .select('employee_id', 'attendance_date', 'attendance_status', 'actual_hours')
    .whereIn('employee_id', ids)
    .whereBetween('attendance_date', [period.start, period.asOf]);
  const advances = await db('salary_advances').select('*').whereIn('employee_id', ids).where('transfer_date', '<=', period.asOf);

  const byEmp = (rows) => rows.reduce((acc, r) => ((acc[r.employee_id] ||= []).push(r), acc), {});
  const attBy = byEmp(attendance);
  const advBy = byEmp(advances);

  const items = employees.map((e) =>
    computeEmployee(
      e,
      period,
      attBy[e.id] || [],
      (advBy[e.id] || []).map((r) => ({ ...r, is_loan: Boolean(r.is_loan), recover_from_salary: Boolean(r.recover_from_salary), repay_from_salary: Boolean(r.repay_from_salary) })),
    ),
  );

  const sum = (k) => round2(items.reduce((s, i) => s + i[k], 0));
  return {
    period,
    items,
    totals: { employees: items.length, gross_earned: sum('gross_earned'), total_deductions: sum('total_deductions'), net_payable: sum('net_payable'), carry_forward: sum('carry_forward') },
  };
}

/** One employee's payroll with the underlying attendance and advance / loan records. */
async function forEmployee(employeeId, month) {
  const exists = await db('employees').where({ id: employeeId }).first('id');
  if (!exists) throw ApiError.notFound('Employee not found');
  const { period, items } = await forMonth({ month, employeeId });
  if (!items.length) throw ApiError.notFound('This employee has no payroll for the selected month (not joined yet or inactive)');

  const attendance = await db('attendance')
    .select('id', 'attendance_date', 'attendance_status', 'standard_hours', 'actual_hours', 'notes')
    .where({ employee_id: employeeId })
    .whereBetween('attendance_date', [period.start, period.asOf])
    .orderBy('attendance_date', 'asc');

  const advances = await db('salary_advances as s')
    .leftJoin('accounts as a', 'a.id', 's.account_id')
    .select('s.*', 'a.title as account_title')
    .where('s.employee_id', employeeId)
    .orderBy('s.transfer_date', 'desc');

  return {
    period,
    payroll: items[0],
    attendance: attendance.map((a) => ({ ...a, attendance_date: toDateOnly(a.attendance_date), standard_hours: num(a.standard_hours), actual_hours: num(a.actual_hours) })),
    advances: advances.map((r) => ({
      id: r.id,
      type: r.is_loan ? 'loan' : 'advance',
      amount: num(r.amount),
      transfer_date: toDateOnly(r.transfer_date),
      account: r.account_title,
      interest_rate: r.interest_rate === null ? null : num(r.interest_rate),
      tenure_months: r.tenure_months,
      monthly_installment: num(r.monthly_installment),
      total_repayable: num(r.total_repayable),
      recovered_amount: num(r.recovered_amount),
      outstanding: round2(num(r.total_repayable) - num(r.recovered_amount)),
      repayment_start_month: r.repayment_start_month,
      last_installment_month: r.is_loan ? addMonths(r.repayment_start_month, Number(r.tenure_months) - 1) : r.repayment_start_month,
      from_salary: Boolean(r.is_loan ? r.repay_from_salary : r.recover_from_salary),
      status: r.status,
    })),
  };
}

module.exports = { forMonth, forEmployee, periodFor, computeEmployee, deductionsFor };
