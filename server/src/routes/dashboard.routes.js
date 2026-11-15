const router = require('express').Router();
const c = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.use(protect); // any logged-in role; the controller scopes the data per role
router.get('/', c.stats);
router.get('/activity', c.activity);

module.exports = router;
