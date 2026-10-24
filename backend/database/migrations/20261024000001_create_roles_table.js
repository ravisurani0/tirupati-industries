/**
 * Creates the `roles` table.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = function up(knex) {
  return knex.schema.createTable('roles', (table) => {
    table.increments('id').primary();
    table.string('name', 50).notNullable();
    table.string('slug', 50).notNullable().unique();
    table.string('description', 255).nullable();
    table.timestamps(true, true); // created_at, updated_at (default now)
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists('roles');
};
