const { Router } = require('express');
const controller = require('../controllers/categories.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { categories: v } = require('../validators/finance.validators');

const router = Router();

// Admins and managers maintain the category list used by daily expenses
router.use(authenticate, authorize('admin', 'manager'));

router.get('/', v.list, validate, controller.index);
router.get('/:id', v.show, validate, controller.show);
router.post('/', v.create, validate, controller.store);
router.put('/:id', v.update, validate, controller.update);
router.delete('/:id', v.destroy, validate, controller.destroy);

module.exports = router;
