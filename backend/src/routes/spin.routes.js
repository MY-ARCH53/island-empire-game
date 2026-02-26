const express = require('express');
const router = express.Router();
const SpinController = require('../controllers/spin.controller');

router.get('/status', SpinController.getStatus);
router.post('/daily', SpinController.spin);

module.exports = router;
