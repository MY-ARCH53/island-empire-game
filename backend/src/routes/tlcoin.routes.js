const express = require('express');
const router = express.Router();
const { verifyToken } = require('../utils/jwt');
const TLCoinController = require('../controllers/tlcoin.controller');

// Oyuncu kimlik doğrulama
const authMiddleware = (req, res, next) => {
  const token = (req.headers.authorization || '').split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ success: false, message: 'Yetkisiz' });
  req.userId = decoded.userId;
  next();
};

router.get('/balance',        authMiddleware, TLCoinController.getBalance);
router.post('/convert',       authMiddleware, TLCoinController.convertGold);
router.post('/request-prize', authMiddleware, TLCoinController.requestPrize);
router.get('/my-requests',    authMiddleware, TLCoinController.getMyRequests);

module.exports = router;
