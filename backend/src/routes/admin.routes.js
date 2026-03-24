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

// Seed oyuncu orduları ve kaynakları
router.post('/seeds/boost-armies',    AdminController.boostSeedArmies);
router.post('/seeds/boost-resources', AdminController.boostSeedResources);
router.post('/seeds/set-resources',   AdminController.setSeedResources);

// Zorla savaş
router.post('/force-battle', AdminController.forceBattle);

// Otomatik saldırı kuralları
router.get('/auto-attack-rules',          AdminController.getAutoAttackRules);
router.post('/auto-attack-rules/toggle',  AdminController.toggleAutoAttackRule);
router.post('/auto-attack-rules/custom',  AdminController.setCustomThreshold);

// Ödül talepleri
router.get('/prize-requests',     AdminController.getPrizeRequests);
router.put('/prize-requests/:id', AdminController.updatePrizeRequest);

// Instagram Boost istekleri
router.get('/instagram-requests',               AdminController.getInstagramRequests);
router.put('/instagram-requests/:userId',       AdminController.reviewInstagramRequest);
router.put('/instagram-requests/:userId/revoke', AdminController.revokeInstagramBoost);

// Ban yönetimi
router.get('/banned',          AdminController.getBannedUsers);
router.post('/users/:id/ban',  AdminController.banUser);
router.post('/users/:id/unban', AdminController.unbanUser);

// Guild sohbet takibi
router.get('/guild-chats', AdminController.getGuildChats);
router.delete('/guild-chats/:id', AdminController.deleteGuildMessage);

// Admin2 - Detaylı raporlar
router.get('/admin2/players',         AdminController.getDetailedPlayers);
router.get('/admin2/players/:id',     AdminController.getPlayerDetail);
router.get('/admin2/battles',         AdminController.getAllBattles);
router.get('/admin2/activity',        AdminController.getActivityMetrics);

module.exports = router;
