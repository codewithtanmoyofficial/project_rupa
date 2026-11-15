const router = require('express').Router();
const c = require('../controllers/roleController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

// Roles & Permissions are Admin-only, hard-coded (not editable through the matrix)
router.use(['/roles', '/permissions'], protect, authorize('admin')); // only these paths, so unknown /api/* URLs still return 404
router.get('/roles', c.listRoles);
router.get('/permissions', c.getPermissions);
router.put('/permissions/:role', c.updatePermissions);

module.exports = router;
