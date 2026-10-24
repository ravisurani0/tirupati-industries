const jwt = require('jsonwebtoken');
const config = require('../config');
const ApiError = require('../utils/ApiError');
const userService = require('../services/user.service');

function extractToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme && scheme.toLowerCase() === 'bearer' && token ? token : null;
}

async function resolveUser(token) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch (err) {
    throw ApiError.unauthorized(err.name === 'TokenExpiredError' ? 'Session expired, please sign in again' : 'Invalid token');
  }

  const user = await userService.findById(payload.sub).catch(() => null);
  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (!user.is_active) throw ApiError.forbidden('Your account is disabled');
  return user;
}

/** Requires a valid Bearer token. Sets req.user. */
async function authenticate(req, _res, next) {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Authentication token missing');
  req.user = await resolveUser(token);
  next();
}

/** Sets req.user when a valid token is sent, but never blocks the request. */
async function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (token) {
    req.user = await resolveUser(token).catch(() => undefined);
  }
  next();
}

/** Restricts a route to the given role slugs, e.g. authorize('admin'). Use after authenticate. */
function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) throw ApiError.unauthorized();
    if (roles.length && !roles.includes(req.user.role && req.user.role.slug)) throw ApiError.forbidden();
    next();
  };
}

function signToken(user, { remember = false } = {}) {
  return jwt.sign({ sub: user.id, role: user.role && user.role.slug }, config.jwt.secret, {
    expiresIn: remember ? config.jwt.rememberExpiresIn : config.jwt.expiresIn,
  });
}

module.exports = { authenticate, optionalAuth, authorize, signToken };
