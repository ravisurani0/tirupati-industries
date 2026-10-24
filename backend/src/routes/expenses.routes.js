const { Router } = require('express');
const controller = require('../controllers/expenses.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { billImageUpload } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { expenses: v } = require('../validators/finance.validators');

const router = Router();

router.use(authenticate, authorize('admin', 'manager'));

router.get('/', v.list, validate, controller.index);
router.get('/:id', v.show, validate, controller.show);
// multipart/form-data with an optional `bill_image` file (or plain JSON)
router.post('/', billImageUpload, v.create, validate, controller.store);
router.put('/:id', billImageUpload, v.update, validate, controller.update);
router.delete('/:id', v.destroy, validate, controller.destroy);

module.exports = router;
