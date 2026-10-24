const bcrypt = require('bcryptjs');
require('../../src/config/env');

/**
 * Seeds the default admin user (admin@mail.com / password) and assigns the
 * `admin` role. Safe to run multiple times - an existing admin is left untouched.
 *
 * @param { import("knex").Knex } knex
 */
exports.seed = async function seed(knex) {
  const adminRole = await knex('roles').where({ slug: 'admin' }).first();
  if (!adminRole) {
    throw new Error('Role "admin" not found. Run the roles seeder (01_roles.js) first.');
  }

  const email = (process.env.ADMIN_EMAIL || 'admin@mail.com').toLowerCase();
  const rounds = Number(process.env.BCRYPT_ROUNDS) || 10;
  const password = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'password', rounds);
  const now = knex.fn.now();

  await knex('users')
    .insert({
      first_name: process.env.ADMIN_FIRST_NAME || 'Super',
      last_name: process.env.ADMIN_LAST_NAME || 'Admin',
      email,
      phone: process.env.ADMIN_PHONE || null,
      address: process.env.ADMIN_ADDRESS || null,
      profile_logo: null,
      password,
      role_id: adminRole.id,
      is_active: true,
      created_at: now,
      updated_at: now,
    })
    .onConflict('email')
    .ignore();
};
