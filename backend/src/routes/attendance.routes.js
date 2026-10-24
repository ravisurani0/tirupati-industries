const { Router } = require('express');
const controller = require('../controllers/attendance.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators/attendance.validators');

const router = Router();

router.use(authenticate, authorize('admin', 'manager'));

router.get('/daily', v.daily, validate, controller.daily);
router.get('/calendar', v.calendar, validate, controller.calendar);
router.post('/generate', authorize('admin'), v.generate, validate, controller.generate);
router.get('/', v.list, validate, controller.index);
router.get('/:id', v.show, validate, controller.show);
router.post('/', v.create, validate, controller.store);
router.put('/:id', v.update, validate, controller.update);
router.delete('/:id', v.destroy, validate, controller.destroy);

module.exports = router;
