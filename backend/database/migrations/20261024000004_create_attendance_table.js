/**
 * Daily attendance: one row per employee per day.
 *
 * created_by / updated_by reference users.id (an integer). They are NULL when
 * the row was created by the automatic daily job.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = function up(knex) {
  return knex.schema.createTable('attendance', (table) => {
    table.uuid('id').primary();
    table.uuid('employee_id').notNullable().references('id').inTable('employees').onUpdate('CASCADE').onDelete('CASCADE');
    table.date('attendance_date').notNullable();
    table.decimal('standard_hours', 5, 2).notNullable().defaultTo(0);
    table.decimal('actual_hours', 5, 2).notNullable().defaultTo(0);
    table.string('attendance_status', 20).notNullable(); // present | absent | leave | holiday | off
    table.text('notes').nullable();
    table.integer('created_by').unsigned().nullable().references('id').inTable('users').onUpdate('CASCADE').onDelete('SET NULL');
    table.integer('updated_by').unsigned().nullable().references('id').inTable('users').onUpdate('CASCADE').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(['employee_id', 'attendance_date']); // one entry per employee per day
    table.index(['attendance_date']);
    table.index(['attendance_status']);
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists('attendance');
};
