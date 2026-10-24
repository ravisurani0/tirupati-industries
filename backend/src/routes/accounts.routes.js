const { Router } = require('express');
const controller = require('../controllers/accounts.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { accounts: v } = require('../validators/finance.validators');

const router = Router();

// Admins and managers can view accounts (needed to post expenses); only admins manage them
router.use(authenticate, authorize('admin', 'manager'));

router.get('/', v.list, validate, controller.index);
router.get('/:id', v.show, validate, controller.show);
router.get('/:id/transactions', v.transactions, validate, controller.transactions);
router.post('/', authorize('admin'), v.create, validate, controller.store);
router.put('/:id', authorize('admin'), v.update, validate, controller.update);
router.delete('/:id', authorize('admin'), v.destroy, validate, controller.destroy);

module.exports = router;
