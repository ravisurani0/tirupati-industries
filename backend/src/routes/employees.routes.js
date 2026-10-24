const { Router } = require('express');
const controller = require('../controllers/employees.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators/employee.validators');

const router = Router();

// Admins and managers manage employees
router.use(authenticate, authorize('admin', 'manager'));

router.get('/', v.list, validate, controller.index);
router.get('/stats', controller.stats);
router.get('/:id', v.show, validate, controller.show);
router.post('/', v.create, validate, controller.store);
router.put('/:id', v.update, validate, controller.update);
router.delete('/:id', v.destroy, validate, controller.destroy);

module.exports = router;
