const { Router } = require('express');
const { param, query } = require('express-validator');
const controller = require('../controllers/payroll.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = Router();
const month = query('month').optional({ values: 'falsy' }).matches(/^\d{4}-(0[1-9]|1[0-2])$/).withMessage('Month must be in YYYY-MM format');

// Salary figures are admin only
router.use(authenticate, authorize('admin'));

router.get(
  '/',
  [month, query('payroll_type').optional({ values: 'falsy' }).isIn(['monthly_fixed', 'hourly']).withMessage('Invalid payroll type'), query('search').optional().isLength({ max: 100 })],
  validate,
  controller.index,
);
router.get('/:employeeId', [param('employeeId').isUUID().withMessage('Invalid employee id'), month], validate, controller.show);

module.exports = router;
