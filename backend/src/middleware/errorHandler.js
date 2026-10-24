const config = require('../config');
const ApiError = require('../utils/ApiError');
const { removeUploadedFile } = require('../utils/files');

function notFound(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  removeUploadedFile(req.file);

  let status = err.statusCode || err.status || 500;
  let message = err.message || 'Something went wrong';
  let { errors } = err;

  // Malformed JSON body
  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON body';
  }

  // Unique constraint raced past the service-level check
  if (/UNIQUE constraint failed|ER_DUP_ENTRY|duplicate key/i.test(err.message || '')) {
    status = 409;
    message = 'Resource already exists';
  }

  if (status >= 500) {
    console.error(err);
    if (config.env === 'production') message = 'Internal server error';
  }

  const body = { success: false, message };
  if (errors) body.errors = errors;
  if (config.env === 'development' && status >= 500) body.stack = err.stack;
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
