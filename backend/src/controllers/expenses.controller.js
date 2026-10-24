const { success } = require('../utils/response');
const { toStoredPath } = require('../utils/files');
const expenseService = require('../services/expense.service');

/** GET /api/expenses?from=&to=&account_id=&category_id=(uuid|none)&type=&search=&page=&per_page= */
async function index(req, res) {
  const { items, meta } = await expenseService.list({
    page: Number(req.query.page) || 1,
    perPage: Number(req.query.per_page) || 20,
    from: req.query.from || undefined,
    to: req.query.to || undefined,
    accountId: req.query.account_id || undefined,
    categoryId: req.query.category_id || undefined,
    type: req.query.type || undefined,
    search: typeof req.query.search === 'string' ? req.query.search.trim() : '',
  });
  return success(res, { data: items, meta });
}

/** GET /api/expenses/:id */
async function show(req, res) {
  return success(res, { data: await expenseService.findById(req.params.id) });
}

/** POST /api/expenses  (multipart; optional `bill_image` file). transaction_by = current user */
async function store(req, res) {
  const expense = await expenseService.create({ ...req.body, bill_image: toStoredPath(req.file) }, req.user.id);
  return success(res, { status: 201, message: 'Expense added successfully', data: expense });
}

/** PUT /api/expenses/:id  (multipart; new `bill_image` replaces the old one, `remove_bill_image=true` clears it) */
async function update(req, res) {
  const changes = { ...req.body };
  delete changes.remove_bill_image;
  delete changes.bill_image;
  if (req.file) changes.bill_image = toStoredPath(req.file);
  else if (req.body.remove_bill_image) changes.bill_image = null;
  const expense = await expenseService.update(req.params.id, changes, req.user.id);
  return success(res, { message: 'Expense updated successfully', data: expense });
}

/** DELETE /api/expenses/:id  (also deletes the bill file) */
async function destroy(req, res) {
  await expenseService.remove(req.params.id);
  return success(res, { message: 'Expense deleted successfully' });
}

module.exports = { index, show, store, update, destroy };
