const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');
const { resolveTenantFromAuth } = require('../middleware/tenantResolver');
const { validate } = require('../middleware/validator');

const { isValidPhone } = require('../utils/phone');

// All staff management routes require authentication and tenant resolution
router.use(protect, resolveTenantFromAuth);

router.get('/', restrictTo('owner', 'manager'), listUsers);

router.post(
  '/',
  restrictTo('owner', 'manager'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body().custom((value, { req }) => {
      if (!req.body.phone && !req.body.email) {
        throw new Error('Phone number or email is required');
      }
      return true;
    }),
    body('phone').optional({ values: 'falsy' }).custom((val) => {
      if (val && !isValidPhone(val)) {
        throw new Error('Please enter a valid phone number (e.g. 0911223344)');
      }
      return true;
    }),
    body('email').optional({ values: 'falsy' }).isEmail().withMessage('Valid email is required'),
    body('role').isIn(['manager', 'kitchen', 'waiter']).withMessage('Invalid role'),
    validate,
  ],
  createUser
);

router.patch('/:id', restrictTo('owner', 'manager'), updateUser);
router.delete('/:id', restrictTo('owner', 'manager'), deleteUser);

module.exports = router;
