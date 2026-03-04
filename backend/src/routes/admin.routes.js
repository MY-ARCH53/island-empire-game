const express = require('express');
const router = express.Router();
const adminMiddleware = require('../middleware/admin.middleware');
const AdminController = require('../controllers/admin.controller');

router.use(adminMiddleware);

router.get('/users', AdminController.getUsers);
router.get('/stats', AdminController.getStats);
router.put('/users/:id', AdminController.updateUser);
router.put('/users/:id/resources', AdminController.updateResources);
router.delete('/users/:id', AdminController.deleteUser);

// Bot yönetimi
router.get('/bots', AdminController.getBots);
router.post('/bots/create', AdminController.createBots);
router.post('/bots/attack', AdminController.triggerBotAttack);
router.post('/bots/boost-armies', AdminController.boostBotArmies);
router.post('/bots/attack-user', AdminController.attackSpecificUser);

// Seed oyuncu orduları
router.post('/seeds/boost-armies', AdminController.boostSeedArmies);

// Ödül talepleri
router.get('/prize-requests',     AdminController.getPrizeRequests);
router.put('/prize-requests/:id', AdminController.updatePrizeRequest);

// Instagram Boost istekleri
router.get('/instagram-requests',               AdminController.getInstagramRequests);
router.put('/instagram-requests/:userId',       AdminController.reviewInstagramRequest);
router.put('/instagram-requests/:userId/revoke', AdminController.revokeInstagramBoost);

module.exports = router;
