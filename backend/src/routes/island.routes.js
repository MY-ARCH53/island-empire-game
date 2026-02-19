const express = require('express');
const router = express.Router();
const IslandModel = require('../models/island.model');
const IslandController = require('../controllers/island.controller');

// Kullanıcının adalarını getir
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId gerekli'
      });
    }

    const islands = await IslandModel.findByUserId(userId);

    res.json({
      success: true,
      data: { islands }
    });
  } catch (error) {
    console.error('Islands error:', error);
    res.status(500).json({
      success: false,
      message: 'Adalar getirilemedi',
      error: error.message
    });
  }
});

// Keşfedilebilir adaları getir
router.get('/discoverable', IslandController.getDiscoverableIslands);

// Ada keşfet
router.post('/discover', IslandController.discoverIsland);

module.exports = router;