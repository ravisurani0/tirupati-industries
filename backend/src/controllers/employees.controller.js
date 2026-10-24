const { success } = require('../utils/response');
const employeeService = require('../services/employee.service');

/** GET /api/employees?page=&per_page=&search=&status=&payroll_type= */
async function index(req, res) {
  const { items, meta } = await employeeService.list({
    page: Number(req.query.page) || 1,
    perPage: Number(req.query.per_page) || 10,
    search: typeof req.query.search === 'string' ? req.query.search.trim() : '',
    status: req.query.status || undefined,
    payrollType: req.query.payroll_type || undefined,
  });
  return success(res, { data: items, meta });
}

/** GET /api/employees/stats */
async function stats(_req, res) {
  return success(res, { data: await employeeService.stats() });
}

/** GET /api/employees/:id */
async function show(req, res) {
  return success(res, { data: await employeeService.findById(req.params.id) });
}

/** POST /api/employees */
async function store(req, res) {
  const employee = await employeeService.create(req.body);
  return success(res, { status: 201, message: 'Employee created successfully', data: employee });
}

/** PUT /api/employees/:id */
async function update(req, res) {
  const employee = await employeeService.update(req.params.id, req.body);
  return success(res, { message: 'Employee updated successfully', data: employee });
}

/** DELETE /api/employees/:id */
async function destroy(req, res) {
  await employeeService.remove(req.params.id);
  return success(res, { message: 'Employee deleted successfully' });
}

module.exports = { index, stats, show, store, update, destroy };
