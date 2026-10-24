const { body, param, query } = require('express-validator');
const { isIsoDate } = require('../utils/dates');

const MAX_MONEY = 999999999999.99; // NUMERIC(14,2)
const MONEY_RE = /^\d+(\.\d{1,2})?$/;

const money = (field, label, { min = 0, positive = false } = {}) =>
  body(field)
    .exists({ values: 'null' })
    .withMessage(`${label} is required`)
    .bail()
    .custom((v) => String(v).trim() !== '')
    .withMessage(`${label} is required`)
    .bail()
    .custom((v) => MONEY_RE.test(String(v).trim()))
    .withMessage(`${label} must be a number with up to 2 decimals`)
    .bail()
    .custom((v) => Number(v) >= min && Number(v) <= MAX_MONEY && (!positive || Number(v) > 0))
    .withMessage(positive ? `${label} must be greater than 0` : `${label} must be 0 or more`)
    .customSanitizer((v) => Number(v));

const optionalText = (field, label, max) =>
  body(field).optional({ values: 'null' }).isString().trim().isLength({ max }).withMessage(`${label} must be at most ${max} characters`);

const bool = (field, label) =>
  body(field).optional().isBoolean({ loose: true }).withMessage(`${label} must be true or false`).toBoolean({ strict: false });

const uuidParam = (label) => param('id').isUUID().withMessage(`Invalid ${label} id`);

const listQuery = [
  query('page').optional().isInt({ min: 1 }),
  query('per_page').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isLength({ max: 100 }),
];

/* ---------------- accounts ---------------- */

const accountBody = [
  body('title').exists({ values: 'falsy' }).withMessage('Title is required').bail().isString().trim().notEmpty().withMessage('Title is required').bail().isLength({ max: 150 }).withMessage('Title must be at most 150 characters'),
  optionalText('description', 'Description', 2000),
  optionalText('account_number', 'Account number', 50),
  money('initial_amount', 'Initial amount'),
  bool('is_active', 'Active'),
  bool('is_default', 'Default'),
];

const accounts = {
  list: [...listQuery, query('status').optional({ values: 'falsy' }).isIn(['active', 'inactive']).withMessage('status must be active or inactive')],
  show: [uuidParam('account')],
  transactions: [uuidParam('account'), query('source').optional({ values: 'falsy' }).isIn(['expense', 'advance', 'loan']).withMessage('source must be expense, advance or loan'), query('page').optional().isInt({ min: 1 }), query('per_page').optional().isInt({ min: 1, max: 100 })],
  create: accountBody,
  update: [uuidParam('account'), ...accountBody],
  destroy: [uuidParam('account')],
};

/* ---------------- expenses ---------------- */

const expenseBody = [
  body('title').exists({ values: 'falsy' }).withMessage('Title is required').bail().isString().trim().notEmpty().withMessage('Title is required').bail().isLength({ max: 200 }).withMessage('Title must be at most 200 characters'),
  optionalText('description', 'Description', 2000),
  money('amount', 'Amount', { positive: true }),
  body('transaction_type').exists({ values: 'falsy' }).withMessage('Select credit or debit').bail().isIn(['debit', 'credit']).withMessage('Type must be credit or debit'),
  body('account_id').exists({ values: 'falsy' }).withMessage('Account is required').bail().isUUID().withMessage('Select a valid account'),
  body('expense_date')
    .exists({ values: 'falsy' })
    .withMessage('Date is required')
    .bail()
    .custom(isIsoDate)
    .withMessage('Date must be a valid date (YYYY-MM-DD)'),
  optionalText('bill_number', 'Bill number', 100),
  body('category_id').optional({ values: 'falsy' }).isUUID().withMessage('Select a valid category'),
];

const expenses = {
  list: [
    ...listQuery,
    query('from').optional({ values: 'falsy' }).custom(isIsoDate).withMessage('From must be a valid date'),
    query('to').optional({ values: 'falsy' }).custom(isIsoDate).withMessage('To must be a valid date'),
    query('account_id').optional({ values: 'falsy' }).isUUID().withMessage('Invalid account'),
    query('category_id')
      .optional({ values: 'falsy' })
      .custom((v) => v === 'none' || /^[0-9a-f-]{36}$/i.test(v))
      .withMessage('Invalid category'),
    query('type').optional({ values: 'falsy' }).isIn(['debit', 'credit']).withMessage('type must be credit or debit'),
  ],
  show: [uuidParam('expense')],
  create: expenseBody,
  update: [uuidParam('expense'), ...expenseBody, bool('remove_bill_image', 'remove_bill_image')],
  destroy: [uuidParam('expense')],
};

/* ---------------- expense categories ---------------- */

const categoryBody = [
  body('title').exists({ values: 'falsy' }).withMessage('Title is required').bail().isString().trim().notEmpty().withMessage('Title is required').bail().isLength({ max: 100 }).withMessage('Title must be at most 100 characters'),
  optionalText('description', 'Description', 1000),
  bool('is_active', 'Active'),
];

const categories = {
  list: [query('search').optional().isLength({ max: 100 }), query('status').optional({ values: 'falsy' }).isIn(['active', 'inactive']).withMessage('status must be active or inactive')],
  show: [uuidParam('category')],
  create: categoryBody,
  update: [uuidParam('category'), ...categoryBody],
  destroy: [uuidParam('category')],
};

module.exports = { accounts, expenses, categories };
