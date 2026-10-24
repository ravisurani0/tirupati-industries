/**
 * Salary advances and employee loans, entered manually by an admin.
 *
 * - is_loan = false -> advance on salary: recovered from the salary of the
 *   transfer month (repayment_start_month = month of transfer_date).
 * - is_loan = true  -> loan with simple interest:
 *     interest_amount     = amount x interest_rate% x tenure_months / 12
 *     total_repayable     = amount + interest_amount
 *     monthly_installment = total_repayable / tenure_months
 *   repaid from the month after the transfer.
 *
 * The calculated figures are stored so the record never changes if the
 * formula is changed later. recovered_amount / status are updated by the salary
 * module when deductions are made.
 *
 * @param { import("knex").Knex } knex
 */
exports.up = function up(knex) {
  return knex.schema.createTable('salary_advances', (table) => {
    table.uuid('id').primary();
    table.uuid('employee_id').notNullable().references('id').inTable('employees').onUpdate('CASCADE').onDelete('RESTRICT');
    table.uuid('account_id').nullable().references('id').inTable('accounts').onUpdate('CASCADE').onDelete('RESTRICT');
    table.decimal('amount', 14, 2).notNullable(); // amount paid in advance / loan principal
    table.date('transfer_date').notNullable();
    table.text('description').nullable();
    table.boolean('recover_from_salary').notNullable().defaultTo(true);
    table.boolean('repay_from_salary').notNullable().defaultTo(true);

    table.boolean('is_loan').notNullable().defaultTo(false);
    table.decimal('interest_rate', 5, 2).nullable(); // % per year (loans only)
    table.integer('tenure_months').nullable(); // repayment period in months (loans only)
    table.decimal('interest_amount', 14, 2).notNullable().defaultTo(0);
    table.decimal('total_repayable', 14, 2).notNullable();
    table.decimal('monthly_installment', 14, 2).notNullable();
    table.string('repayment_start_month', 7).notNullable(); // YYYY-MM of the first salary deduction

    table.decimal('recovered_amount', 14, 2).notNullable().defaultTo(0);
    table.string('status', 20).notNullable().defaultTo('open'); // open | settled

    table.integer('created_by').unsigned().nullable().references('id').inTable('users').onUpdate('CASCADE').onDelete('SET NULL');
    table.integer('updated_by').unsigned().nullable().references('id').inTable('users').onUpdate('CASCADE').onDelete('SET NULL');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['employee_id']);
    table.index(['account_id']);
    table.index(['transfer_date']);
    table.index(['status']);
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = function down(knex) {
  return knex.schema.dropTableIfExists('salary_advances');
};
