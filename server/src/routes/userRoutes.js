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

// All staff management routes require authentication and tenant resolution
router.use(protect, resolveTenantFromAuth);

router.get('/', restrictTo('owner', 'manager'), listUsers);

router.post(
  '/',
  restrictTo('owner', 'manager'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('role').isIn(['manager', 'kitchen', 'waiter']).withMessage('Invalid role'),
    validate,
  ],
  createUser
);

router.patch('/:id', restrictTo('owner'), updateUser);
router.delete('/:id', restrictTo('owner'), deleteUser);

module.exports = router;
