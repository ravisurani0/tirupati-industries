const { body, param, query } = require('express-validator');
const { STATUSES } = require('../services/attendance.service');
const { isIsoDate } = require('../utils/dates');

const dateRule = (chain, label) => chain.custom(isIsoDate).withMessage(`${label} must be a valid date (YYYY-MM-DD)`);

const hours = (field, label) =>
  body(field)
    .optional({ values: 'null' })
    .custom((v) => String(v).trim() === '' || (/^\d+(\.\d{1,2})?$/.test(String(v).trim()) && Number(v) <= 24))
    .withMessage(`${label} must be between 0 and 24 (up to 2 decimals)`)
    .customSanitizer((v) => (String(v).trim() === '' ? null : Number(v)));

const status = (optional) => {
  const chain = body('attendance_status');
  return (optional ? chain.optional() : chain.exists({ values: 'falsy' }).withMessage('Attendance status is required').bail())
    .isIn(STATUSES)
    .withMessage(`Attendance status must be one of: ${STATUSES.join(', ')}`);
};

const notes = () => body('notes').optional({ values: 'null' }).isString().trim().isLength({ max: 2000 }).withMessage('Notes are too long');

const idParam = () => param('id').isUUID().withMessage('Invalid attendance id');

module.exports = {
  daily: [
    dateRule(query('date').optional({ values: 'falsy' }), 'Date'),
    query('status').optional({ values: 'falsy' }).isIn([...STATUSES, 'not_marked']).withMessage('Invalid status'),
    query('payroll_type').optional({ values: 'falsy' }).isIn(['monthly_fixed', 'hourly']).withMessage('Invalid payroll type'),
    query('page').optional().isInt({ min: 1 }),
    query('per_page').optional().isInt({ min: 1, max: 200 }),
    query('search').optional().isLength({ max: 100 }),
  ],
  calendar: [
    query('month')
      .optional({ values: 'falsy' })
      .matches(/^\d{4}-(0[1-9]|1[0-2])$/)
      .withMessage('Month must be in YYYY-MM format'),
    query('employee_id').optional({ values: 'falsy' }).isUUID().withMessage('Invalid employee id'),
    query('status').optional({ values: 'falsy' }).isIn(STATUSES).withMessage('Invalid status'),
    query('payroll_type').optional({ values: 'falsy' }).isIn(['monthly_fixed', 'hourly']).withMessage('Invalid payroll type'),
  ],
  list: [
    dateRule(query('from').optional({ values: 'falsy' }), 'From date'),
    dateRule(query('to').optional({ values: 'falsy' }), 'To date'),
    query('employee_id').optional({ values: 'falsy' }).isUUID().withMessage('Invalid employee id'),
    query('status').optional({ values: 'falsy' }).isIn(STATUSES).withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }),
    query('per_page').optional().isInt({ min: 1, max: 100 }),
  ],
  show: [idParam()],
  create: [
    body('employee_id').exists({ values: 'falsy' }).withMessage('Employee is required').bail().isUUID().withMessage('Invalid employee'),
    dateRule(body('attendance_date').exists({ values: 'falsy' }).withMessage('Attendance date is required').bail(), 'Attendance date'),
    status(false),
    hours('standard_hours', 'Standard hours'),
    hours('actual_hours', 'Actual hours'),
    notes(),
  ],
  update: [idParam(), status(true), hours('standard_hours', 'Standard hours'), hours('actual_hours', 'Actual hours'), notes()],
  destroy: [idParam()],
  generate: [dateRule(body('date').optional({ values: 'falsy' }), 'Date')],
};
