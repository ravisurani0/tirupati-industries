const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config');
const ApiError = require('../utils/ApiError');

const IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
};

/**
 * Builds middleware that accepts one optional file in `field`, stored under
 * uploads/<dir>/. JSON requests pass straight through.
 */
function singleFileUpload({ field, dir, types, maxBytes, label, typesLabel }) {
  const destination = path.join(config.uploads.root, dir);
  fs.mkdirSync(destination, { recursive: true });

  const uploader = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, destination),
      filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${types[file.mimetype]}`),
    }),
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (types[file.mimetype]) return cb(null, true);
      return cb(ApiError.unprocessable('Validation failed', [{ field: file.fieldname, message: `Only ${typesLabel} files are allowed` }]));
    },
  });

  return function upload(req, res, next) {
    uploader.single(field)(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        const mb = Math.round(maxBytes / 1024 / 1024);
        const message = err.code === 'LIMIT_FILE_SIZE' ? `${label} must be ${mb} MB or smaller` : err.message;
        return next(ApiError.unprocessable('Validation failed', [{ field, message }]));
      }
      return next(err);
    });
  };
}

/** Optional profile image in `profile_logo` (users). */
const profileLogoUpload = singleFileUpload({
  field: 'profile_logo',
  dir: config.uploads.profileDir,
  types: IMAGE_TYPES,
  maxBytes: config.uploads.maxFileSize,
  label: 'Profile logo',
  typesLabel: 'JPG, PNG, WEBP, GIF or SVG',
});

/** Optional bill photo / scan in `bill_image` (expenses). PDF allowed for scanned bills. */
const billImageUpload = singleFileUpload({
  field: 'bill_image',
  dir: 'bills',
  types: { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' },
  maxBytes: 5 * 1024 * 1024,
  label: 'Bill image',
  typesLabel: 'JPG, PNG, WEBP or PDF',
});

module.exports = { singleFileUpload, profileLogoUpload, billImageUpload };
