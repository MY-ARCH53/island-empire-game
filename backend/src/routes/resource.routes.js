const express = require('express');
const router = express.Router();
const ResourceModel = require('../models/resource.model');

// Kullanıcının kaynaklarını getir
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId gerekli'
      });
    }

    const resources = await ResourceModel.findByUserId(userId);

    res.json({
      success: true,
      data: { resources }
    });
  } catch (error) {
    console.error('Resources error:', error);
    res.status(500).json({
      success: false,
      message: 'Kaynaklar getirilemedi',
      error: error.message
    });
  }
});

module.exports = router;