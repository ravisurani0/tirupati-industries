/**
 * Creates the `users` table with a foreign key to `roles`.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = function up(knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('email', 191).notNullable().unique();
    table.string('phone', 20).nullable();
    table.text('address').nullable();
    table.string('profile_logo', 255).nullable(); // relative path, e.g. uploads/profile/abc.png
    table.string('password', 255).notNullable(); // bcrypt hash
    table
      .integer('role_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('roles')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('last_login_at').nullable();
    table.timestamps(true, true);

    table.index(['role_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists('users');
};
