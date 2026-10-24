const { success } = require('../utils/response');
const accountService = require('../services/account.service');

/** GET /api/accounts?search=&status=active|inactive&page=&per_page= */
async function index(req, res) {
  const { items, meta } = await accountService.list({
    page: Number(req.query.page) || 1,
    perPage: Number(req.query.per_page) || 20,
    search: typeof req.query.search === 'string' ? req.query.search.trim() : '',
    status: req.query.status || undefined,
  });
  return success(res, { data: items, meta });
}

/** GET /api/accounts/:id  (includes current balance) */
async function show(req, res) {
  return success(res, { data: await accountService.findById(req.params.id) });
}

/** GET /api/accounts/:id/transactions?source=expense|advance|loan&page=&per_page= */
async function transactions(req, res) {
  const { items, meta } = await accountService.ledger(req.params.id, {
    source: req.query.source || undefined,
    page: Number(req.query.page) || 1,
    perPage: Number(req.query.per_page) || 20,
  });
  return success(res, { data: items, meta });
}

/** POST /api/accounts */
async function store(req, res) {
  const account = await accountService.create(req.body, req.user.id);
  return success(res, { status: 201, message: 'Account created successfully', data: account });
}

/** PUT /api/accounts/:id */
async function update(req, res) {
  const account = await accountService.update(req.params.id, req.body, req.user.id);
  return success(res, { message: 'Account updated successfully', data: account });
}

/** DELETE /api/accounts/:id  (only when it has no transactions) */
async function destroy(req, res) {
  await accountService.remove(req.params.id);
  return success(res, { message: 'Account deleted successfully' });
}

module.exports = { index, show, transactions, store, update, destroy };
