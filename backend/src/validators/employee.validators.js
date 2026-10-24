const { body, param, query } = require('express-validator');
const { PAYROLL_TYPES } = require('../services/employee.service');

const PHONE_REGEX = /^\+?[0-9\s()-]{7,20}$/;
const MAX_MONEY = 999999999999.99; // NUMERIC(14,2)

const requiredText = (field, label, max) =>
  body(field)
    .exists({ values: 'null' })
    .withMessage(`${label} is required`)
    .bail()
    .isString()
    .trim()
    .notEmpty()
    .withMessage(`${label} is required`)
    .bail()
    .isLength({ max })
    .withMessage(`${label} must be at most ${max} characters`);

const money = (field, label) =>
  body(field)
    .exists({ values: 'null' })
    .withMessage(`${label} is required`)
    .bail()
    .custom((v) => String(v).trim() !== '') // 0 is a valid amount, an empty string is not
    .withMessage(`${label} is required`)
    .bail()
    .isFloat({ min: 0, max: MAX_MONEY })
    .withMessage(`${label} must be a number between 0 and ${MAX_MONEY.toLocaleString('en-US')}`)
    .bail()
    .custom((v) => /^\d+(\.\d{1,2})?$/.test(String(v).trim()))
    .withMessage(`${label} can have at most 2 decimal places`)
    .toFloat();

const employeeBody = [
  requiredText('first_name', 'First name', 100),
  requiredText('last_name', 'Last name', 100),
  requiredText('mobile_number', 'Mobile number', 20).bail().matches(PHONE_REGEX).withMessage('Enter a valid mobile number'),
  body('address').optional({ values: 'null' }).isString().trim().isLength({ max: 2000 }).withMessage('Address is too long'),
  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail()
    .withMessage('Enter a valid email address')
    .bail()
    .isLength({ max: 255 })
    .withMessage('Email must be at most 255 characters'),
  body('joining_date')
    .optional({ values: 'falsy' })
    .isISO8601({ strict: true })
    .withMessage('Joining date must be a valid date (YYYY-MM-DD)')
    .bail()
    .custom((v) => /^\d{4}-\d{2}-\d{2}$/.test(v))
    .withMessage('Joining date must be in YYYY-MM-DD format'),
  body('payroll_type')
    .exists({ values: 'falsy' })
    .withMessage('Payroll type is required')
    .bail()
    .isIn(PAYROLL_TYPES)
    .withMessage(`Payroll type must be one of: ${PAYROLL_TYPES.join(', ')}`),
  money('monthly_salary', 'Monthly salary'),
  money('hourly_rate', 'Hourly rate'),
  body('fixed_working_hours')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0, max: 24 })
    .withMessage('Fixed working hours must be between 0 and 24')
    .bail()
    .custom((v) => /^\d+(\.\d{1,2})?$/.test(String(v).trim()))
    .withMessage('Fixed working hours can have at most 2 decimal places')
    .toFloat(),
  body('notes').optional({ values: 'null' }).isString().trim().isLength({ max: 5000 }).withMessage('Notes are too long'),
  body('is_active')
    .exists({ values: 'null' })
    .withMessage('Active status is required')
    .bail()
    .isBoolean({ loose: true })
    .withMessage('Active status must be true or false')
    .toBoolean({ strict: false }),
];

const idParam = () => param('id').isUUID().withMessage('Invalid employee id');

module.exports = {
  list: [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive number'),
    query('per_page').optional().isInt({ min: 1, max: 100 }).withMessage('per_page must be between 1 and 100'),
    query('status').optional({ values: 'falsy' }).isIn(['active', 'inactive']).withMessage('status must be active or inactive'),
    query('payroll_type').optional({ values: 'falsy' }).isIn(PAYROLL_TYPES).withMessage('Invalid payroll type'),
    query('search').optional().isLength({ max: 100 }).withMessage('Search is too long'),
  ],
  show: [idParam()],
  create: employeeBody,
  update: [idParam(), ...employeeBody],
  destroy: [idParam()],
};
