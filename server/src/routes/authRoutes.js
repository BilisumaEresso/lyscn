const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { register, login, refresh, logout, me } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter, refreshLimiter } = require('../middleware/rateLimit');
const { validate } = require('../middleware/validator');
const { isValidPhone } = require('../utils/phone');

router.post(
  '/register',
  authLimiter,
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
  authLimiter,
  [
    body().custom((value, { req }) => {
      const id = req.body.identifier || req.body.email || req.body.phone;
      if (!id || !String(id).trim()) {
        throw new Error('Email or phone number is required');
      }
      const clean = String(id).trim();
      const isEmail = clean.includes('@') && /\S+@\S+\.\S+/.test(clean);
      const isPhone = isValidPhone(clean);
      if (!isEmail && !isPhone) {
        throw new Error('Please enter a valid email or phone number');
      }
      return true;
    }),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    validate,
  ],
  login
);

router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);
router.get('/me', protect, me);

module.exports = router;
