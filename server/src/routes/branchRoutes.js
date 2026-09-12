const express = require('express');
const router  = express.Router();
const { listBranches, createBranch, updateBranch, deleteBranch, updateBranchLocation } = require('../controllers/branchController');
const { protect, restrictTo }   = require('../middleware/auth');
const { resolveTenantFromAuth } = require('../middleware/tenantResolver');

router.use(protect, resolveTenantFromAuth);

router.get('/',      listBranches);
router.post('/',     restrictTo('owner', 'manager'), createBranch);
router.patch('/:id', restrictTo('owner', 'manager'), updateBranch);
router.patch('/:id/location', restrictTo('owner', 'manager'), updateBranchLocation);
router.delete('/:id', restrictTo('owner', 'manager'), deleteBranch);

module.exports = router;
