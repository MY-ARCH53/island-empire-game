const express = require('express');
const router = express.Router();
const InternalController = require('../controllers/internal.controller');
const internalAuth = require('../middleware/internal.middleware');

router.use(internalAuth);

router.post('/authenticate', InternalController.authenticate);
router.post('/reward-kill', InternalController.rewardKill);

module.exports = router;
