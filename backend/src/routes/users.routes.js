const { Router } = require('express');
const controller = require('../controllers/users.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { profileLogoUpload } = require('../middleware/upload');
const validate = require('../middleware/validate');
const v = require('../validators');

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/', v.listUsers, validate, controller.index);
router.get('/stats', controller.stats);
router.get('/:id', v.idParam(), validate, controller.show);
router.post('/', profileLogoUpload, v.createUser, validate, controller.store);
router.put('/:id', profileLogoUpload, v.updateUser, validate, controller.update);
router.delete('/:id', v.idParam(), validate, controller.destroy);

module.exports = router;
