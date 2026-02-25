const express = require('express');
const router = express.Router();
const { verifyToken } = require('../utils/jwt');
const TradeController = require('../controllers/trade.controller');

const authMiddleware = (req, res, next) => {
  const token = (req.headers.authorization || '').split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ success: false, message: 'Yetkisiz' });
  req.userId = decoded.userId;
  next();
};

router.get('/rates',   TradeController.getRates);
router.post('/convert', authMiddleware, TradeController.convert);

module.exports = router;
