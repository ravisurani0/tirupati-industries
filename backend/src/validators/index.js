const { body, param, query } = require('express-validator');

const PHONE_REGEX = /^\+?[0-9\s()-]{7,20}$/;

const name = (field, label, { optional = false } = {}) => {
  const chain = body(field);
  return (optional ? chain.optional() : chain)
    .trim()
    .notEmpty()
    .withMessage(`${label} is required`)
    .bail()
    .isLength({ max: 100 })
    .withMessage(`${label} must be at most 100 characters`);
};

const email = ({ optional = false } = {}) => {
  const chain = body('email');
  return (optional ? chain.optional() : chain)
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .bail()
    .isEmail()
    .withMessage('Enter a valid email address')
    .bail()
    .isLength({ max: 191 })
    .withMessage('Email is too long')
    .normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false });
};

const phone = () =>
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(PHONE_REGEX)
    .withMessage('Enter a valid phone number');

const address = () =>
  body('address').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }).withMessage('Address is too long');

const password = ({ optional = false } = {}) => {
  const chain = body('password');
  return (optional ? chain.optional({ values: 'falsy' }) : chain.notEmpty().withMessage('Password is required').bail())
    .isLength({ min: 8, max: 72 })
    .withMessage('Password must be between 8 and 72 characters');
};

const passwordConfirmation = () =>
  body('password_confirmation')
    .optional({ values: 'falsy' })
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match');

const roleId = () => body('role_id').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Select a valid role').toInt();

const isActive = () => body('is_active').optional().isBoolean({ loose: true }).withMessage('is_active must be true or false').toBoolean({ strict: false });

const idParam = () => param('id').isInt({ min: 1 }).withMessage('Invalid id').toInt();

/* ---------------- auth ---------------- */

const login = [
  email(),
  body('password').notEmpty().withMessage('Password is required'),
  body('remember').optional().isBoolean({ loose: true }).toBoolean({ strict: false }),
];

const register = [
  name('first_name', 'First name'),
  name('last_name', 'Last name'),
  email(),
  phone(),
  address(),
  password(),
  passwordConfirmation(),
  roleId(),
];

const updateProfile = [
  name('first_name', 'First name', { optional: true }),
  name('last_name', 'Last name', { optional: true }),
  email({ optional: true }),
  phone(),
  address(),
  body('remove_profile_logo').optional().isBoolean({ loose: true }).toBoolean({ strict: false }),
];

const changePassword = [
  body('current_password').notEmpty().withMessage('Current password is required'),
  password(),
  passwordConfirmation(),
];

/* ---------------- users ---------------- */

const createUser = [...register, isActive()];

const updateUser = [
  idParam(),
  name('first_name', 'First name', { optional: true }),
  name('last_name', 'Last name', { optional: true }),
  email({ optional: true }),
  phone(),
  address(),
  password({ optional: true }),
  passwordConfirmation(),
  roleId(),
  isActive(),
  body('remove_profile_logo').optional().isBoolean({ loose: true }).toBoolean({ strict: false }),
];

// No sanitizers on query params: req.query is read-only in Express 5, values are parsed in the controller
const listUsers = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive number'),
  query('per_page').optional().isInt({ min: 1, max: 100 }).withMessage('per_page must be between 1 and 100'),
  query('role_id').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Invalid role'),
  query('search').optional().isLength({ max: 100 }).withMessage('Search is too long'),
];

/* ---------------- roles ---------------- */

const createRole = [
  body('name').trim().notEmpty().withMessage('Role name is required').bail().isLength({ max: 50 }).withMessage('Role name must be at most 50 characters'),
  body('slug').optional({ values: 'falsy' }).trim().isLength({ max: 50 }).matches(/^[a-z0-9-]+$/i).withMessage('Slug may contain only letters, numbers and dashes'),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 255 }).withMessage('Description must be at most 255 characters'),
];

const updateRole = [
  idParam(),
  body('name').optional().trim().notEmpty().withMessage('Role name is required').bail().isLength({ max: 50 }),
  body('description').optional({ values: 'null' }).trim().isLength({ max: 255 }),
];

module.exports = {
  idParam,
  login,
  register,
  updateProfile,
  changePassword,
  createUser,
  updateUser,
  listUsers,
  createRole,
  updateRole,
};
