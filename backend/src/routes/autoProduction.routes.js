const express = require('express');
const router = express.Router();
const AutoProductionController = require('../controllers/autoProduction.controller');

router.post('/activate', AutoProductionController.activate);
router.get('/status', AutoProductionController.getStatus);
router.post('/tick', AutoProductionController.tick);

module.exports = router;
