/**
 * Loads environment variables once for the whole project.
 *  1. <project root>/.env          (main file)
 *  2. <project root>/backend/.env  (legacy location, still honoured)
 * Values already set in the shell win; the first file wins over the second.
 */
const path = require('path');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..', '..', '..');

dotenv.config({ path: path.join(ROOT, '.env'), quiet: true });
dotenv.config({ path: path.join(ROOT, 'backend', '.env'), quiet: true });

module.exports = { ROOT };
