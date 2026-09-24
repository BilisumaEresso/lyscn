const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { register, login, refresh, logout, me } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { validate } = require('../middleware/validator');

router.use(authLimiter);

router.post(
  '/register',
  [
    body('restaurantName')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Restaurant name must be at least 2 characters'),
    body('ownerName')
      .trim()
      .notEmpty()
      .withMessage('Owner name is required'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    validate,
  ],
  register
);

router.post(
  '/login',
  [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Valid email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    validate,
  ],
  login
);

router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', protect, me);

module.exports = router;
