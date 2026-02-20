const express = require('express');
const router = express.Router();
const BuildingModel = require('../models/building.model');
const BuildingController = require('../controllers/building.controller');

router.get('/:islandId', async (req, res) => {
  try {
    const islandId = req.params.islandId;
    const buildings = await BuildingModel.findByIslandId(islandId);
    res.json({ success: true, data: { buildings } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error' });
  }
});

router.post('/upgrade', BuildingController.upgradeBuilding);
router.post('/complete-upgrade/:buildingId', BuildingController.completeUpgrade);

module.exports = router;