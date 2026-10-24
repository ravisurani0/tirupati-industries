const { body, param, query } = require('express-validator');
const { isIsoDate } = require('../utils/dates');

const MONEY_RE = /^\d+(\.\d{1,2})?$/;
const isLoan = (req) => [true, 'true', 1, '1'].includes(req.body.is_loan);

const bool = (field, label) =>
  body(field).optional().isBoolean({ loose: true }).withMessage(`${label} must be true or false`).toBoolean({ strict: false });

const body_ = [
  body('employee_id').exists({ values: 'falsy' }).withMessage('Employee is required').bail().isUUID().withMessage('Select a valid employee'),
  body('account_id').optional({ values: 'falsy' }).isUUID().withMessage('Select a valid account'),
  body('amount')
    .exists({ values: 'falsy' })
    .withMessage('Amount is required')
    .bail()
    .custom((v) => MONEY_RE.test(String(v).trim()) && Number(v) > 0 && Number(v) <= 999999999999.99)
    .withMessage('Amount must be greater than 0 with up to 2 decimals')
    .customSanitizer(Number),
  body('transfer_date').exists({ values: 'falsy' }).withMessage('Transfer date is required').bail().custom(isIsoDate).withMessage('Transfer date must be a valid date (YYYY-MM-DD)'),
  body('description').optional({ values: 'null' }).isString().trim().isLength({ max: 2000 }).withMessage('Description is too long'),
  bool('recover_from_salary', 'Recover from salary'),
  bool('repay_from_salary', 'Repay from salary'),
  bool('is_loan', 'Loan'),
  // Loan-only fields: required when is_loan is true
  body('interest_rate')
    .if((v, { req }) => isLoan(req))
    .exists({ values: 'null' })
    .withMessage('Interest % is required for a loan')
    .bail()
    .custom((v) => String(v).trim() !== '' && MONEY_RE.test(String(v).trim()) && Number(v) <= 100)
    .withMessage('Interest % must be between 0 and 100 (up to 2 decimals)')
    .customSanitizer(Number),
  body('tenure_months')
    .if((v, { req }) => isLoan(req))
    .exists({ values: 'falsy' })
    .withMessage('Time period (months) is required for a loan')
    .bail()
    .isInt({ min: 1, max: 360 })
    .withMessage('Time period must be between 1 and 360 months')
    .toInt(),
];

const idParam = () => param('id').isUUID().withMessage('Invalid id');

module.exports = {
  list: [
    query('page').optional().isInt({ min: 1 }),
    query('per_page').optional().isInt({ min: 1, max: 100 }),
    query('employee_id').optional({ values: 'falsy' }).isUUID().withMessage('Invalid employee'),
    query('type').optional({ values: 'falsy' }).isIn(['advance', 'loan']).withMessage('type must be advance or loan'),
    query('status').optional({ values: 'falsy' }).isIn(['open', 'settled']).withMessage('status must be open or settled'),
    query('from').optional({ values: 'falsy' }).custom(isIsoDate).withMessage('Invalid from date'),
    query('to').optional({ values: 'falsy' }).custom(isIsoDate).withMessage('Invalid to date'),
    query('search').optional().isLength({ max: 100 }),
  ],
  show: [idParam()],
  create: body_,
  update: [idParam(), ...body_],
  destroy: [idParam()],
};
