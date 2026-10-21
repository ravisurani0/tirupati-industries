const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function seedData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Seed ONLY Admin User for login
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    const userRes = await client.query('SELECT id FROM users WHERE username = $1', [adminUser]);

    if (userRes.rows.length === 0) {
      const hashed = await bcrypt.hash(adminPass, 10);
      await client.query(
        `INSERT INTO users (username, password_hash, full_name, role) 
         VALUES ($1, $2, $3, $4)`,
        [adminUser, hashed, 'Workshop Admin', 'admin']
      );
      console.log(`✅ Default admin account created: ${adminUser} / ${adminPass}`);
    } else {
      console.log(`ℹ️ Admin user '${adminUser}' already exists.`);
    }

    // Keep all other tables completely clean (no dummy employees, attendance, advances or payroll)
    await client.query('COMMIT');
    console.log('✅ Clean database ready (only admin user active).');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedData()
    .then(() => {
      console.log('Seed completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seedData };
