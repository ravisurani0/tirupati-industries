/**
 * Seeds the base roles. Safe to run multiple times (upserts on `slug`).
 *
 * @param { import("knex").Knex } knex
 */
exports.seed = async function seed(knex) {
  const now = knex.fn.now();

  await knex('roles')
    .insert([
      { name: 'Admin', slug: 'admin', description: 'Full access to the system', created_at: now, updated_at: now },
      { name: 'Manager', slug: 'manager', description: 'Manages day-to-day operations', created_at: now, updated_at: now },
    ])
    .onConflict('slug')
    .merge(['name', 'description', 'updated_at']);
};
