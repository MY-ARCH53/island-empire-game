const express = require('express');
const router = express.Router();
const MinigameController = require('../controllers/minigame.controller');
const auth = require('../middleware/auth.middleware');

router.use(auth);

router.get('/status', MinigameController.getStatus);
router.post('/submit-run', MinigameController.submitRun);
router.get('/progress', MinigameController.getProgress);
router.post('/purchase-upgrade', MinigameController.purchaseUpgrade);

module.exports = router;
