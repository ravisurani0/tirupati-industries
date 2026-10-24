const { Router } = require('express');
const db = require('../config/db');

const router = Router();

router.get('/health', async (_req, res) => {
  let database = 'up';
  try {
    await db.raw('select 1');
  } catch {
    database = 'down';
  }
  res.json({ success: true, message: 'EMS API is running', data: { database, time: new Date().toISOString() } });
});

router.use('/auth', require('./auth.routes'));
router.use('/roles', require('./roles.routes'));
router.use('/users', require('./users.routes'));
router.use('/employees', require('./employees.routes'));
router.use('/attendance', require('./attendance.routes'));
router.use('/accounts', require('./accounts.routes'));
router.use('/expenses', require('./expenses.routes'));
router.use('/expense-categories', require('./categories.routes'));
router.use('/advances', require('./advances.routes'));
router.use('/payroll', require('./payroll.routes'));

module.exports = router;
