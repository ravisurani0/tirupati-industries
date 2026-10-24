const { success } = require('../utils/response');
const advanceService = require('../services/advance.service');

/** GET /api/advances?employee_id=&type=advance|loan&status=open|settled&from=&to=&search= */
async function index(req, res) {
  const { items, meta } = await advanceService.list({
    page: Number(req.query.page) || 1,
    perPage: Number(req.query.per_page) || 20,
    employeeId: req.query.employee_id || undefined,
    type: req.query.type || undefined,
    status: req.query.status || undefined,
    from: req.query.from || undefined,
    to: req.query.to || undefined,
    search: typeof req.query.search === 'string' ? req.query.search.trim() : '',
  });
  return success(res, { data: items, meta });
}

/** GET /api/advances/:id  (includes the repayment schedule) */
async function show(req, res) {
  return success(res, { data: await advanceService.findById(req.params.id) });
}

/** POST /api/advances  (created_by = current user) */
async function store(req, res) {
  const rec = await advanceService.create(req.body, req.user.id);
  return success(res, { status: 201, message: rec.is_loan ? 'Loan recorded successfully' : 'Advance recorded successfully', data: rec });
}

/** PUT /api/advances/:id */
async function update(req, res) {
  const rec = await advanceService.update(req.params.id, req.body, req.user.id);
  return success(res, { message: rec.is_loan ? 'Loan updated successfully' : 'Advance updated successfully', data: rec });
}

/** DELETE /api/advances/:id  (only while nothing has been recovered) */
async function destroy(req, res) {
  await advanceService.remove(req.params.id);
  return success(res, { message: 'Deleted successfully' });
}

module.exports = { index, show, store, update, destroy };
