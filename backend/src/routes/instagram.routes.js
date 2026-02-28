const express = require('express');
const router = express.Router();
const InstagramController = require('../controllers/instagram.controller');

router.post('/request',      InstagramController.requestBoost);
router.get('/status/:userId', InstagramController.getStatus);

module.exports = router;
