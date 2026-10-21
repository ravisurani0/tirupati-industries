const { pool } = require('../config/db');
const { seedData } = require('./seed');

async function cleanDatabase() {
  const client = await pool.connect();
  try {
    console.log('🧹 Cleaning all transactions, employees, advances, attendance and payroll data...');
    await client.query('BEGIN');

    // Truncate all data tables with CASCADE and restart identity counters
    await client.query(`
      TRUNCATE TABLE 
        advance_deductions_log,
        payroll_records,
        advances,
        attendance,
        employees
      RESTART IDENTITY CASCADE;
    `);

    await client.query('COMMIT');
    console.log('✅ All data tables cleaned successfully.');

    // Ensure admin user exists
    await seedData();
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to clean database:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  cleanDatabase()
    .then(() => {
      console.log('Database clean-up finished. Only admin login exists.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { cleanDatabase };
