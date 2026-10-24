const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
const { removeUploadedFile } = require('../utils/files');

/** Runs after express-validator chains; responds 422 with field errors. */
function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  removeUploadedFile(req.file); // don't keep an orphan upload when the request is rejected
  const seen = new Set();
  const errors = result
    .array()
    .filter((e) => {
      if (seen.has(e.path)) return false;
      seen.add(e.path);
      return true;
    })
    .map((e) => ({ field: e.path, message: e.msg }));
  throw ApiError.unprocessable('Validation failed', errors);
}

module.exports = validate;
