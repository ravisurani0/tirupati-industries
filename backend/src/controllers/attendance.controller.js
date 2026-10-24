const { success } = require('../utils/response');
const attendanceService = require('../services/attendance.service');
const { today } = require('../utils/dates');

/** GET /api/attendance/daily?date=&status=&payroll_type=&search=&page=&per_page= */
async function daily(req, res) {
  const date = req.query.date || today();
  const { items, meta, summary } = await attendanceService.daily({
    date,
    page: Number(req.query.page) || 1,
    perPage: Number(req.query.per_page) || 50,
    search: typeof req.query.search === 'string' ? req.query.search.trim() : '',
    status: req.query.status || undefined,
    payrollType: req.query.payroll_type || undefined,
  });
  return success(res, { data: items, meta: { ...meta, date, today: today(), summary } });
}

/** GET /api/attendance/calendar?month=YYYY-MM&employee_id=&status=&payroll_type= */
async function calendar(req, res) {
  const t = today();
  const data = await attendanceService.calendar({
    month: req.query.month || t.slice(0, 7),
    employeeId: req.query.employee_id || undefined,
    payrollType: req.query.payroll_type || undefined,
    status: req.query.status || undefined,
  });
  return success(res, { data: { ...data, today: t } });
}

/** GET /api/attendance?from=&to=&employee_id=&status=&page=&per_page= */
async function index(req, res) {
  const { items, meta } = await attendanceService.list({
    page: Number(req.query.page) || 1,
    perPage: Number(req.query.per_page) || 20,
    from: req.query.from || undefined,
    to: req.query.to || undefined,
    employeeId: req.query.employee_id || undefined,
    status: req.query.status || undefined,
  });
  return success(res, { data: items, meta });
}

/** GET /api/attendance/:id */
async function show(req, res) {
  return success(res, { data: await attendanceService.findById(req.params.id) });
}

/** POST /api/attendance - manual entry (hourly employees, or absences) */
async function store(req, res) {
  const record = await attendanceService.create(req.body, req.user.id);
  return success(res, { status: 201, message: 'Attendance entry added', data: record });
}

/** PUT /api/attendance/:id - e.g. mark an auto-created "present" entry as absent */
async function update(req, res) {
  const record = await attendanceService.update(req.params.id, req.body, req.user.id);
  return success(res, { message: 'Attendance entry updated', data: record });
}

/** DELETE /api/attendance/:id */
async function destroy(req, res) {
  await attendanceService.remove(req.params.id);
  return success(res, { message: 'Attendance entry deleted' });
}

/** POST /api/attendance/generate { date? } - run the daily job now (admin) */
async function generate(req, res) {
  const result = await attendanceService.generateDaily({ date: req.body?.date || today(), userId: null });
  const message = result.weekly_off
    ? `${result.date} is a weekly off day - no entries created`
    : `Created ${result.created} present ${result.created === 1 ? 'entry' : 'entries'} for fixed-salary employees`;
  return success(res, { message, data: result });
}

module.exports = { calendar, daily, index, show, store, update, destroy, generate };
