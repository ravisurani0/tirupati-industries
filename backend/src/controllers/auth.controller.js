const bcrypt = require('bcryptjs');
const config = require('../config');
const ApiError = require('../utils/ApiError');
const { success } = require('../utils/response');
const { toStoredPath } = require('../utils/files');
const { signToken } = require('../middleware/auth');
const userService = require('../services/user.service');
const db = require('../config/db');

const isAdmin = (user) => Boolean(user && user.role && user.role.slug === 'admin');

/** POST /api/auth/login */
async function login(req, res) {
  const { email, password, remember } = req.body;

  const row = await userService.findForAuth(email);
  // Same message for unknown email and wrong password - don't reveal which accounts exist
  if (!row || !(await bcrypt.compare(password, row.password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!row.is_active) throw ApiError.forbidden('Your account is disabled. Contact an administrator.');

  await userService.touchLastLogin(row.id);
  const user = await userService.findById(row.id);
  const token = signToken(user, { remember: Boolean(remember) });

  return success(res, {
    message: 'Signed in successfully',
    data: { token, token_type: 'Bearer', expires_in: remember ? config.jwt.rememberExpiresIn : config.jwt.expiresIn, user },
  });
}

/**
 * POST /api/auth/register
 * Public sign-up gets the default role (manager). An authenticated admin may
 * pass `role_id` to register a user with any role.
 */
async function register(req, res) {
  const actingAdmin = isAdmin(req.user);
  const payload = {
    ...req.body,
    profile_logo: toStoredPath(req.file),
    role_id: actingAdmin ? req.body.role_id : undefined,
  };

  const user = await userService.create(payload);

  // An admin creating someone else's account shouldn't receive that user's token
  if (actingAdmin) {
    return success(res, { status: 201, message: 'User registered successfully', data: { user } });
  }

  const token = signToken(user);
  return success(res, {
    status: 201,
    message: 'Account created successfully',
    data: { token, token_type: 'Bearer', expires_in: config.jwt.expiresIn, user },
  });
}

/** GET /api/auth/me */
async function me(req, res) {
  return success(res, { data: { user: req.user } });
}

/** PUT /api/auth/profile - update own details (role and status cannot be changed here) */
async function updateProfile(req, res) {
  const { first_name, last_name, email, phone, address, remove_profile_logo } = req.body;
  const changes = { first_name, last_name, email, phone, address };

  if (req.file) changes.profile_logo = toStoredPath(req.file);
  else if (remove_profile_logo) changes.profile_logo = null;

  const user = await userService.update(req.user.id, changes);
  return success(res, { message: 'Profile updated successfully', data: { user } });
}

/** PUT /api/auth/change-password */
async function changePassword(req, res) {
  const row = await db('users').where({ id: req.user.id }).first('password');
  if (!(await bcrypt.compare(req.body.current_password, row.password))) {
    throw ApiError.unprocessable('Validation failed', [{ field: 'current_password', message: 'Current password is incorrect' }]);
  }
  await userService.update(req.user.id, { password: req.body.password });
  return success(res, { message: 'Password changed successfully' });
}

/** POST /api/auth/logout - JWTs are stateless; the client discards the token. */
async function logout(_req, res) {
  return success(res, { message: 'Signed out successfully' });
}

module.exports = { login, register, me, updateProfile, changePassword, logout };
