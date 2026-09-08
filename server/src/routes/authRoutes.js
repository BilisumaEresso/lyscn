const express = require('express');
const router  = express.Router();
const { register, login, refresh, me } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login',    login);
router.post('/refresh',  refresh);
router.get('/me',  protect, me);

module.exports = router;
