const express = require('express');
const router = express.Router();
const InternalController = require('../controllers/internal.controller');
const internalAuth = require('../middleware/internal.middleware');

router.use(internalAuth);

router.post('/authenticate', InternalController.authenticate);
router.post('/reward-kill', InternalController.rewardKill);
router.post('/pvp-kill', InternalController.pvpKill);
router.post('/use-potion', InternalController.usePotion);

module.exports = router;
