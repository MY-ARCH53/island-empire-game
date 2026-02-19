const express = require('express');
const router = express.Router();
const MarketplaceController = require('../controllers/marketplace.controller');

router.get('/prices', MarketplaceController.getPrices);
router.post('/buy', MarketplaceController.buyResource);
router.post('/sell', MarketplaceController.sellResource);
router.get('/transactions', MarketplaceController.getTransactions);

module.exports = router;