/**
 * Daily expenses (and other money in/out) posted against an account.
 * transaction_type: 'debit' = money out of the account, 'credit' = money in.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = function up(knex) {
  return knex.schema.createTable('expenses', (table) => {
    table.uuid('id').primary();
    table.uuid('account_id').notNullable().references('id').inTable('accounts').onUpdate('CASCADE').onDelete('RESTRICT');
    table.string('title', 200).notNullable();
    table.text('description').nullable();
    table.decimal('amount', 14, 2).notNullable();
    table.string('transaction_type', 10).notNullable().defaultTo('debit'); // debit | credit
    table.date('expense_date').notNullable();
    table.string('bill_number', 100).nullable();
    table.string('bill_image', 255).nullable(); // relative path, e.g. uploads/bills/abc.jpg
    table.integer('transaction_by').unsigned().nullable().references('id').inTable('users').onUpdate('CASCADE').onDelete('SET NULL');
    table.integer('updated_by').unsigned().nullable().references('id').inTable('users').onUpdate('CASCADE').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['expense_date']);
    table.index(['account_id']);
    table.index(['transaction_type']);
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists('expenses');
};
