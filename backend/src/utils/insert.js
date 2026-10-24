const db = require('../config/db');

/**
 * Inserts a row and returns its new id on every supported client.
 * (Postgres needs RETURNING; MySQL and SQLite return the id directly and
 * MySQL warns if .returning() is used.)
 */
async function insertAndGetId(table, record) {
  const client = String(db.client.config.client);
  if (client === 'pg' || client === 'postgres' || client === 'postgresql') {
    const [row] = await db(table).insert(record).returning('id');
    return typeof row === 'object' ? row.id : row;
  }
  const [id] = await db(table).insert(record);
  return id;
}

module.exports = { insertAndGetId };
