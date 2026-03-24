const express = require('express');
const router = express.Router();
const TradeController = require('../controllers/trade.controller');
const auth = require('../middleware/auth.middleware');

router.get('/rates', TradeController.getRates);
router.post('/convert', auth, TradeController.convert);

module.exports = router;
