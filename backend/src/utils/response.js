/**
 * Consistent JSON envelope for every successful response:
 * { success: true, message, data, meta? }
 */
function success(res, { data = null, message = 'OK', status = 200, meta } = {}) {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

module.exports = { success };
