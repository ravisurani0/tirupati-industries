/**
 * Payment accounts (cash box, bank account, ...). Daily expenses - and later
 * salary payments - are posted against an account.
 *
 * Current balance is not stored; it is calculated as
 *   initial_amount + credits - debits
 * from the transactions that reference the account.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = function up(knex) {
  return knex.schema.createTable('accounts', (table) => {
    table.uuid('id').primary();
    table.string('title', 150).notNullable();
    table.text('description').nullable();
    table.string('account_number', 50).nullable();
    table.decimal('initial_amount', 14, 2).notNullable().defaultTo(0);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.boolean('is_default').notNullable().defaultTo(false); // pre-selected for everyday entries
    table.integer('created_by').unsigned().nullable().references('id').inTable('users').onUpdate('CASCADE').onDelete('SET NULL');
    table.integer('updated_by').unsigned().nullable().references('id').inTable('users').onUpdate('CASCADE').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['is_active']);
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists('accounts');
};
