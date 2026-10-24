const { success } = require('../utils/response');
const payrollService = require('../services/payroll.service');
const { today } = require('../utils/dates');

/** GET /api/payroll?month=YYYY-MM&payroll_type=&search=  (month defaults to the current month) */
async function index(req, res) {
  const { period, items, totals } = await payrollService.forMonth({
    month: req.query.month || today().slice(0, 7),
    payrollType: req.query.payroll_type || undefined,
    search: typeof req.query.search === 'string' ? req.query.search.trim() : '',
  });
  return success(res, { data: items, meta: { period, totals } });
}

/** GET /api/payroll/:employeeId?month=YYYY-MM  (breakdown + attendance + advances/loans) */
async function show(req, res) {
  const data = await payrollService.forEmployee(req.params.employeeId, req.query.month || today().slice(0, 7));
  return success(res, { data });
}

module.exports = { index, show };
