const fs = require('fs');
const path = require('path');
const config = require('../config');

/** Turns an absolute upload path into the relative path stored in the DB. */
function toStoredPath(file) {
  if (!file) return null;
  return path.relative(path.join(config.uploads.root, '..'), file.path).split(path.sep).join('/');
}

/**
 * Public URL for a stored relative path (or null).
 * Root-relative by default because the app and API share one origin; set
 * ASSET_BASE_URL to return absolute URLs (e.g. behind a CDN).
 */
function toPublicUrl(storedPath) {
  if (!storedPath) return null;
  if (/^https?:\/\//i.test(storedPath)) return storedPath;
  const base = (process.env.ASSET_BASE_URL || '').replace(/\/$/, '');
  return `${base}/${storedPath.replace(/^\/+/, '')}`;
}

/** Deletes a stored upload, ignoring errors (file already gone, etc.). */
function removeStoredFile(storedPath) {
  if (!storedPath || /^https?:\/\//i.test(storedPath)) return;
  const absolute = path.resolve(config.uploads.root, '..', storedPath);
  // Never delete anything outside the uploads folder
  if (!absolute.startsWith(config.uploads.root)) return;
  fs.promises.unlink(absolute).catch(() => {});
}

/** Deletes the file multer just wrote (used when a request fails after upload). */
function removeUploadedFile(file) {
  if (file && file.path) fs.promises.unlink(file.path).catch(() => {});
}

module.exports = { toStoredPath, toPublicUrl, removeStoredFile, removeUploadedFile };
