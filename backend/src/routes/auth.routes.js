const { Router } = require('express');
const controller = require('../controllers/auth.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { profileLogoUpload } = require('../middleware/upload');
const validate = require('../middleware/validate');
const v = require('../validators');

const router = Router();

router.post('/login', v.login, validate, controller.login);
// multipart/form-data (with optional `profile_logo` file) or JSON
router.post('/register', optionalAuth, profileLogoUpload, v.register, validate, controller.register);

router.get('/me', authenticate, controller.me);
router.put('/profile', authenticate, profileLogoUpload, v.updateProfile, validate, controller.updateProfile);
router.put('/change-password', authenticate, v.changePassword, validate, controller.changePassword);
router.post('/logout', authenticate, controller.logout);

module.exports = router;
