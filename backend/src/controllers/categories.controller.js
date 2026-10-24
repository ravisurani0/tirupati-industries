const { success } = require('../utils/response');
const categoryService = require('../services/category.service');

/** GET /api/expense-categories?search=&status=active|inactive */
async function index(req, res) {
  const items = await categoryService.list({
    search: typeof req.query.search === 'string' ? req.query.search.trim() : '',
    status: req.query.status || undefined,
  });
  return success(res, { data: items });
}

/** GET /api/expense-categories/:id */
async function show(req, res) {
  return success(res, { data: await categoryService.findById(req.params.id) });
}

/** POST /api/expense-categories */
async function store(req, res) {
  const category = await categoryService.create(req.body, req.user.id);
  return success(res, { status: 201, message: 'Category created successfully', data: category });
}

/** PUT /api/expense-categories/:id */
async function update(req, res) {
  const category = await categoryService.update(req.params.id, req.body, req.user.id);
  return success(res, { message: 'Category updated successfully', data: category });
}

/** DELETE /api/expense-categories/:id  (only when no expense uses it) */
async function destroy(req, res) {
  await categoryService.remove(req.params.id);
  return success(res, { message: 'Category deleted successfully' });
}

module.exports = { index, show, store, update, destroy };
