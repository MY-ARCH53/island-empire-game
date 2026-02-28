const express = require('express');
const router = express.Router();
const InstagramController = require('../controllers/instagram.controller');

router.post('/verify',       InstagramController.verifyFollow);
router.get('/status/:userId', InstagramController.getStatus);

module.exports = router;
