const express = require('express');
const router = express.Router();
const ProductionController = require('../controllers/production.controller');

// Üretim başlat
router.post('/start', ProductionController.startProduction);

// Üretim topla
router.post('/collect/:productionId', ProductionController.collectProduction);

// Bina üretimlerini getir
router.get('/building/:buildingId', ProductionController.getBuildingProductions);

module.exports = router;