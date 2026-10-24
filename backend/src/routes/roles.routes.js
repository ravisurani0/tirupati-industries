const { Router } = require('express');
const controller = require('../controllers/roles.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators');

const router = Router();

router.use(authenticate);

// Any signed-in user can read roles (e.g. for dropdowns)
router.get('/', controller.index);
router.get('/:id', v.idParam(), validate, controller.show);

// Only admins can manage them
router.post('/', authorize('admin'), v.createRole, validate, controller.store);
router.put('/:id', authorize('admin'), v.updateRole, validate, controller.update);
router.delete('/:id', authorize('admin'), v.idParam(), validate, controller.destroy);

module.exports = router;
