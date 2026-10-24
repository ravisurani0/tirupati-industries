const { Router } = require('express');
const controller = require('../controllers/advances.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators/advance.validators');

const router = Router();

// Salary advances and loans are entered by admins only
router.use(authenticate, authorize('admin'));

router.get('/', v.list, validate, controller.index);
router.get('/:id', v.show, validate, controller.show);
router.post('/', v.create, validate, controller.store);
router.put('/:id', v.update, validate, controller.update);
router.delete('/:id', v.destroy, validate, controller.destroy);

module.exports = router;
