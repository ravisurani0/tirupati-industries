const { success } = require('../utils/response');
const roleService = require('../services/role.service');

/** GET /api/roles */
async function index(_req, res) {
  return success(res, { data: await roleService.list() });
}

/** GET /api/roles/:id */
async function show(req, res) {
  return success(res, { data: await roleService.findById(req.params.id) });
}

/** POST /api/roles */
async function store(req, res) {
  const role = await roleService.create(req.body);
  return success(res, { status: 201, message: 'Role created successfully', data: role });
}

/** PUT /api/roles/:id */
async function update(req, res) {
  const role = await roleService.update(req.params.id, req.body);
  return success(res, { message: 'Role updated successfully', data: role });
}

/** DELETE /api/roles/:id */
async function destroy(req, res) {
  await roleService.remove(req.params.id);
  return success(res, { message: 'Role deleted successfully' });
}

module.exports = { index, show, store, update, destroy };
