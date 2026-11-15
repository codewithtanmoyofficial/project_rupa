const router = require('express').Router();
const c = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', c.login);
router.post('/refresh', c.refresh);
router.post('/logout', c.logout);
router.get('/me', protect, c.me);

module.exports = router;
