const ApiError = require('../utils/ApiError');
const { success } = require('../utils/response');
const { toStoredPath } = require('../utils/files');
const userService = require('../services/user.service');

/** GET /api/users?page=&per_page=&search=&role_id= */
async function index(req, res) {
  const { items, meta } = await userService.list({
    page: Number(req.query.page) || 1,
    perPage: Number(req.query.per_page) || 10,
    search: typeof req.query.search === 'string' ? req.query.search.trim() : '',
    roleId: Number(req.query.role_id) || undefined,
  });
  return success(res, { data: items, meta });
}

/** GET /api/users/stats */
async function stats(_req, res) {
  return success(res, { data: await userService.stats() });
}

/** GET /api/users/:id */
async function show(req, res) {
  return success(res, { data: await userService.findById(req.params.id) });
}

/** POST /api/users - admin creates a user with all details and a role */
async function store(req, res) {
  const user = await userService.create({ ...req.body, profile_logo: toStoredPath(req.file) });
  return success(res, { status: 201, message: 'User created successfully', data: user });
}

/** PUT /api/users/:id */
async function update(req, res) {
  const id = Number(req.params.id);
  const changes = { ...req.body };
  delete changes.profile_logo;
  delete changes.remove_profile_logo;
  delete changes.password_confirmation;

  if (id === req.user.id) {
    // Prevent an admin from locking themselves out
    if (changes.is_active === false) throw ApiError.badRequest('You cannot deactivate your own account');
    if (changes.role_id && changes.role_id !== req.user.role.id) throw ApiError.badRequest('You cannot change your own role');
  }

  if (req.file) changes.profile_logo = toStoredPath(req.file);
  else if (req.body.remove_profile_logo) changes.profile_logo = null;

  const user = await userService.update(id, changes);
  return success(res, { message: 'User updated successfully', data: user });
}

/** DELETE /api/users/:id */
async function destroy(req, res) {
  if (Number(req.params.id) === req.user.id) throw ApiError.badRequest('You cannot delete your own account');
  await userService.remove(req.params.id);
  return success(res, { message: 'User deleted successfully' });
}

module.exports = { index, stats, show, store, update, destroy };
