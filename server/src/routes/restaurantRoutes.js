const express = require('express');
const router  = express.Router();
const { getMyRestaurant, updateMyRestaurant } = require('../controllers/restaurantController');
const { protect, restrictTo }    = require('../middleware/auth');
const { resolveTenantFromAuth }  = require('../middleware/tenantResolver');

// All restaurant routes are protected and scoped to the authenticated user's tenant
router.use(protect, resolveTenantFromAuth);

router.get('/me',   getMyRestaurant);
router.patch('/me', restrictTo('owner', 'manager'), updateMyRestaurant);

module.exports = router;
