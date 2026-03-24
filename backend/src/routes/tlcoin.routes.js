const express = require('express');
const router = express.Router();
const TLCoinController = require('../controllers/tlcoin.controller');
const auth = require('../middleware/auth.middleware');

router.use(auth);

router.get('/balance',        TLCoinController.getBalance);
router.post('/convert',       TLCoinController.convertGold);
router.post('/request-prize', TLCoinController.requestPrize);
router.get('/my-requests',    TLCoinController.getMyRequests);

module.exports = router;
