const crypto = require('crypto');
const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const { toDateOnly, weekdayOf } = require('../utils/dates');

const STATUSES = ['present', 'absent', 'leave', 'holiday', 'off'];
const DEFAULT_STANDARD_HOURS = Number(process.env.ATTENDANCE_DEFAULT_HOURS) || 8;

/** Weekdays (0 = Sunday) on which the daily job creates nothing, e.g. "0" or "0,6". Empty = every day. */
const WEEKLY_OFF_DAYS = (process.env.ATTENDANCE_WEEKLY_OFF || '')
  .split(',')
  .map((d) => d.trim())
  .filter((d) => d !== '')
  .map(Number)
  .filter((d) => d >= 0 && d <= 6);

const FULL_NAME_SQL = String(db.client.config.client).startsWith('mysql')
  ? "LOWER(CONCAT(e.first_name, ' ', e.last_name))"
  : "LOWER(e.first_name || ' ' || e.last_name)";

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

const RECORD_COLUMNS = [
  'a.id',
  'a.employee_id',
  'a.attendance_date',
  'a.standard_hours',
  'a.actual_hours',
  'a.attendance_status',
  'a.notes',
  'a.created_by',
  'a.updated_by',
  'a.created_at',
  'a.updated_at',
  'e.first_name',
  'e.last_name',
  'e.payroll_type',
  'e.mobile_number',
  'cu.first_name as created_by_first_name',
  'cu.last_name as created_by_last_name',
  'uu.first_name as updated_by_first_name',
  'uu.last_name as updated_by_last_name',
];

function recordQuery() {
  return db('attendance as a')
    .join('employees as e', 'e.id', 'a.employee_id')
    .leftJoin('users as cu', 'cu.id', 'a.created_by')
    .leftJoin('users as uu', 'uu.id', 'a.updated_by');
}

const userRef = (id, first, last) => (id ? { id, name: `${first || ''} ${last || ''}`.trim() || `User #${id}` } : null);

function toPublic(row) {
  if (!row) return null;
  return {
    id: row.id,
    employee_id: row.employee_id,
    employee: {
      id: row.employee_id,
      first_name: row.first_name,
      last_name: row.last_name,
      full_name: `${row.first_name} ${row.last_name}`.trim(),
      payroll_type: row.payroll_type,
      mobile_number: row.mobile_number,
    },
    attendance_date: toDateOnly(row.attendance_date),
    standard_hours: num(row.standard_hours),
    actual_hours: num(row.actual_hours),
    attendance_status: row.attendance_status,
    notes: row.notes,
    created_by: userRef(row.created_by, row.created_by_first_name, row.created_by_last_name), // null = daily job
    updated_by: userRef(row.updated_by, row.updated_by_first_name, row.updated_by_last_name),
    auto_generated: !row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function findById(id) {
  const row = await recordQuery().select(RECORD_COLUMNS).where('a.id', id).first();
  if (!row) throw ApiError.notFound('Attendance record not found');
  return toPublic(row);
}

async function getEmployee(employeeId) {
  const employee = await db('employees').where({ id: employeeId }).first();
  if (!employee) throw ApiError.unprocessable('Validation failed', [{ field: 'employee_id', message: 'Employee not found' }]);
  return employee;
}

/** Hours worked default: the standard hours when present, otherwise 0. */
const defaultActual = (status, standard) => (status === 'present' ? standard : 0);

async function create(data, userId) {
  const employee = await getEmployee(data.employee_id);
  const date = data.attendance_date;

  const existing = await db('attendance').where({ employee_id: employee.id, attendance_date: date }).first('id');
  if (existing) {
    throw ApiError.conflict('This employee already has an attendance entry for that date', [
      { field: 'attendance_date', message: 'An entry already exists for this date', existing_id: existing.id },
    ]);
  }

  const standard = num(data.standard_hours) ?? num(employee.fixed_working_hours) ?? DEFAULT_STANDARD_HOURS;
  const actual = num(data.actual_hours) ?? defaultActual(data.attendance_status, standard);
  const id = crypto.randomUUID();

  await db('attendance').insert({
    id,
    employee_id: employee.id,
    attendance_date: date,
    standard_hours: standard,
    actual_hours: actual,
    attendance_status: data.attendance_status,
    notes: data.notes || null,
    created_by: userId || null,
    updated_by: userId || null,
    created_at: db.fn.now(),
    updated_at: db.fn.now(),
  });
  return findById(id);
}

async function update(id, data, userId) {
  const current = await db('attendance').where({ id }).first();
  if (!current) throw ApiError.notFound('Attendance record not found');

  const status = data.attendance_status ?? current.attendance_status;
  const standard = num(data.standard_hours) ?? num(current.standard_hours);
  let actual = num(data.actual_hours);
  if (actual === null) {
    // Status changed without explicit hours: keep hours consistent with the new status
    actual = status !== current.attendance_status ? defaultActual(status, standard) : num(current.actual_hours);
  }

  const changes = {
    attendance_status: status,
    standard_hours: standard,
    actual_hours: actual,
    updated_by: userId || null,
    updated_at: db.fn.now(),
  };
  if (data.notes !== undefined) changes.notes = data.notes || null;

  await db('attendance').where({ id }).update(changes);
  return findById(id);
}

async function remove(id) {
  const deleted = await db('attendance').where({ id }).del();
  if (!deleted) throw ApiError.notFound('Attendance record not found');
}

/** Attendance records, newest first. Filters: from, to, employee_id, status. */
async function list({ page = 1, perPage = 20, from, to, employeeId, status } = {}) {
  const limit = Math.min(Math.max(Number(perPage) || 20, 1), 100);
  const current = Math.max(Number(page) || 1, 1);
  const filtered = () => {
    const q = recordQuery();
    if (from) q.where('a.attendance_date', '>=', from);
    if (to) q.where('a.attendance_date', '<=', to);
    if (employeeId) q.where('a.employee_id', employeeId);
    if (status) q.where('a.attendance_status', status);
    return q;
  };
  const [{ total }] = await filtered().count({ total: 'a.id' });
  const rows = await filtered()
    .select(RECORD_COLUMNS)
    .orderBy('a.attendance_date', 'desc')
    .orderBy('e.first_name', 'asc')
    .limit(limit)
    .offset((current - 1) * limit);
  const totalNum = Number(total);
  return { items: rows.map(toPublic), meta: { page: current, per_page: limit, total: totalNum, last_page: Math.max(Math.ceil(totalNum / limit), 1) } };
}

/**
 * The attendance sheet for one day: every employee who should appear that day
 * (active and already joined, or anyone who already has an entry) with their
 * entry or null. Hourly employees without an entry show as "not marked".
 */
async function daily({ date, page = 1, perPage = 50, search = '', status, payrollType } = {}) {
  const limit = Math.min(Math.max(Number(perPage) || 50, 1), 200);
  const current = Math.max(Number(page) || 1, 1);

  const base = () => {
    const q = db('employees as e').leftJoin('attendance as a', function joinDay() {
      this.on('a.employee_id', '=', 'e.id').andOn('a.attendance_date', '=', db.raw('?', [date]));
    });
    q.where((w) =>
      w
        .where((act) => act.where('e.is_active', true).andWhere((j) => j.whereNull('e.joining_date').orWhere('e.joining_date', '<=', date)))
        .orWhereNotNull('a.id'),
    );
    if (payrollType) q.where('e.payroll_type', payrollType);
    if (search) {
      const term = `%${String(search).toLowerCase()}%`;
      q.where((w) => w.whereRaw(`${FULL_NAME_SQL} LIKE ?`, [term]).orWhere('e.mobile_number', 'like', `%${search}%`));
    }
    return q;
  };

  const withStatus = (q) => {
    if (status === 'not_marked') q.whereNull('a.id');
    else if (status) q.where('a.attendance_status', status);
    return q;
  };

  // Summary counts ignore the status filter so the chips always show the whole day
  const summaryRows = await base()
    .select(db.raw("COALESCE(a.attendance_status, 'not_marked') as status"))
    .count({ count: 'e.id' })
    .groupBy(db.raw("COALESCE(a.attendance_status, 'not_marked')"));
  const summary = { present: 0, absent: 0, leave: 0, holiday: 0, off: 0, not_marked: 0, total: 0 };
  summaryRows.forEach((r) => {
    summary[r.status] = Number(r.count);
    summary.total += Number(r.count);
  });

  const [{ total }] = await withStatus(base()).count({ total: 'e.id' });
  const rows = await withStatus(base())
    .select(
      'e.id as e_id',
      'e.first_name',
      'e.last_name',
      'e.mobile_number',
      'e.payroll_type',
      'e.fixed_working_hours',
      'e.is_active',
      'a.id',
      'a.standard_hours',
      'a.actual_hours',
      'a.attendance_status',
      'a.notes',
      'a.created_by',
      'a.updated_at',
    )
    .orderBy('e.first_name', 'asc')
    .orderBy('e.last_name', 'asc')
    .limit(limit)
    .offset((current - 1) * limit);

  const totalNum = Number(total);
  return {
    date,
    summary,
    items: rows.map((r) => ({
      employee: {
        id: r.e_id,
        first_name: r.first_name,
        last_name: r.last_name,
        full_name: `${r.first_name} ${r.last_name}`.trim(),
        mobile_number: r.mobile_number,
        payroll_type: r.payroll_type,
        fixed_working_hours: num(r.fixed_working_hours),
        is_active: Boolean(r.is_active),
      },
      attendance: r.id
        ? {
            id: r.id,
            attendance_status: r.attendance_status,
            standard_hours: num(r.standard_hours),
            actual_hours: num(r.actual_hours),
            notes: r.notes,
            auto_generated: !r.created_by,
            updated_at: r.updated_at,
          }
        : null,
    })),
    meta: { page: current, per_page: limit, total: totalNum, last_page: Math.max(Math.ceil(totalNum / limit), 1) },
  };
}

/**
 * DAILY JOB: creates a "present" entry for every active monthly-fixed employee
 * who has joined by `date` and has no entry yet. Hourly employees are skipped
 * (an admin enters them manually). Safe to run any number of times.
 *
 * @returns {{ date, created, skipped_existing, eligible, weekly_off }}
 */
async function generateDaily({ date, userId = null } = {}) {
  if (WEEKLY_OFF_DAYS.includes(weekdayOf(date))) {
    return { date, created: 0, skipped_existing: 0, eligible: 0, weekly_off: true };
  }

  const employees = await db('employees')
    .select('id', 'fixed_working_hours')
    .where({ is_active: true, payroll_type: 'monthly_fixed' })
    .andWhere((q) => q.whereNull('joining_date').orWhere('joining_date', '<=', date));

  if (!employees.length) return { date, created: 0, skipped_existing: 0, eligible: 0, weekly_off: false };

  const existing = new Set(
    (await db('attendance').where({ attendance_date: date }).whereIn('employee_id', employees.map((e) => e.id)).select('employee_id')).map((r) => r.employee_id),
  );

  const rows = employees
    .filter((e) => !existing.has(e.id))
    .map((e) => {
      const hours = num(e.fixed_working_hours) ?? DEFAULT_STANDARD_HOURS;
      return {
        id: crypto.randomUUID(),
        employee_id: e.id,
        attendance_date: date,
        standard_hours: hours,
        actual_hours: hours,
        attendance_status: 'present',
        notes: null,
        created_by: userId,
        updated_by: userId,
      };
    });

  // Insert in chunks; the unique (employee_id, attendance_date) key makes concurrent runs harmless
  for (let i = 0; i < rows.length; i += 200) {
    await db('attendance').insert(rows.slice(i, i + 200)).onConflict(['employee_id', 'attendance_date']).ignore();
  }

  return { date, created: rows.length, skipped_existing: existing.size, eligible: employees.length, weekly_off: false };
}

/**
 * Month calendar: every entry between the first and last day of `month` (YYYY-MM),
 * grouped by date, plus per-status totals. Filters: employeeId, payrollType, status.
 */
async function calendar({ month, employeeId, payrollType, status } = {}) {
  const [y, m] = month.split('-').map(Number);
  const from = `${month}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${month}-${String(lastDay).padStart(2, '0')}`;

  const q = db('attendance as a')
    .join('employees as e', 'e.id', 'a.employee_id')
    .select('a.id', 'a.employee_id', 'a.attendance_date', 'a.attendance_status', 'a.actual_hours', 'a.standard_hours', 'e.first_name', 'e.last_name', 'e.payroll_type')
    .whereBetween('a.attendance_date', [from, to]);
  if (employeeId) q.where('a.employee_id', employeeId);
  if (payrollType) q.where('e.payroll_type', payrollType);
  if (status) q.where('a.attendance_status', status);
  const rows = await q.orderBy('a.attendance_date', 'asc').orderBy('e.first_name', 'asc').orderBy('e.last_name', 'asc');

  const days = {};
  const totals = { present: 0, absent: 0, leave: 0, holiday: 0, off: 0, total: 0 };
  rows.forEach((r) => {
    const date = toDateOnly(r.attendance_date);
    (days[date] ||= []).push({
      id: r.id,
      employee_id: r.employee_id,
      name: `${r.first_name} ${r.last_name}`.trim(),
      payroll_type: r.payroll_type,
      attendance_status: r.attendance_status,
      actual_hours: num(r.actual_hours),
      standard_hours: num(r.standard_hours),
    });
    totals[r.attendance_status] = (totals[r.attendance_status] || 0) + 1;
    totals.total += 1;
  });

  return { month, from, to, days, totals };
}

module.exports = { STATUSES, calendar, DEFAULT_STANDARD_HOURS, findById, create, update, remove, list, daily, generateDaily };
