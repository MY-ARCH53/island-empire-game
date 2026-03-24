const express = require('express');
const router = express.Router();
const DailyRewardController = require('../controllers/dailyReward.controller');
const auth = require('../middleware/auth.middleware');

router.use(auth);

router.get('/check', DailyRewardController.checkDailyReward);
router.post('/claim', DailyRewardController.claimDailyReward);

module.exports = router;