/**
 * Expense categories (Travel, Utilities, Office supplies, ...) managed from the
 * app, and the link from each expense to its category.
 *
 * expenses.category_id is nullable so expenses recorded before categories
 * existed stay valid ("Uncategorized"). A category that is in use cannot be
 * deleted (RESTRICT); deactivate it instead.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('expense_categories', (table) => {
    table.uuid('id').primary();
    table.string('title', 100).notNullable().unique();
    table.text('description').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.integer('created_by').unsigned().nullable().references('id').inTable('users').onUpdate('CASCADE').onDelete('SET NULL');
    table.integer('updated_by').unsigned().nullable().references('id').inTable('users').onUpdate('CASCADE').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable('expenses', (table) => {
    table.uuid('category_id').nullable().references('id').inTable('expense_categories').onUpdate('CASCADE').onDelete('RESTRICT');
    table.index(['category_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function down(knex) {
  await knex.schema.alterTable('expenses', (table) => {
    table.dropIndex(['category_id']);
    table.dropForeign(['category_id']);
    table.dropColumn('category_id');
  });
  await knex.schema.dropTableIfExists('expense_categories');
};
