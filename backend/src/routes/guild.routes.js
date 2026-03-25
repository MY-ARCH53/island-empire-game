const express = require('express');
const router = express.Router();
const GuildController = require('../controllers/guild.controller');
const auth = require('../middleware/auth.middleware');

router.use(auth);

// Temel
router.post('/create', GuildController.createGuild);
router.get('/list', GuildController.listGuilds);
router.get('/details', GuildController.getGuildDetails);
router.get('/user-guild', GuildController.getUserGuild);

// Lider yetkileri
router.post('/rename', GuildController.renameGuild);
router.post('/disband', GuildController.disbandGuild);
router.post('/bulletin', GuildController.updateBulletin);
router.post('/change-role', GuildController.changeMemberRole);
router.post('/kick', GuildController.kickMember);

// Başvuru
router.post('/apply', GuildController.applyToGuild);
router.get('/applications', GuildController.getApplications);
router.post('/accept', GuildController.acceptApplication);
router.post('/reject', GuildController.rejectApplication);
router.post('/leave', GuildController.leaveGuild);

// Bağış & Kale
router.post('/donate', GuildController.donate);
router.get('/castle', GuildController.getCastleInfo);

// Asker
router.post('/recruit', GuildController.recruitTroops);
router.get('/troops', GuildController.getTroops);

// Savaş
router.post('/war/start', GuildController.startWar);
router.get('/war/active', GuildController.getActiveWar);
router.get('/war/history', GuildController.getWarHistory);
router.post('/war/attack', GuildController.recordWarAttack);

// Sohbet
router.get('/chat', GuildController.getChatMessages);
router.post('/chat', GuildController.sendMessage);

module.exports = router;
