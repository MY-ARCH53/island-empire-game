const express = require('express');
const router = express.Router();
const GuildController = require('../controllers/guild.controller');

router.post('/create', GuildController.createGuild);
router.get('/list', GuildController.listGuilds);
router.get('/details', GuildController.getGuildDetails);
router.get('/user-guild', GuildController.getUserGuild);
router.post('/apply', GuildController.applyToGuild);
router.get('/applications', GuildController.getApplications);
router.post('/accept', GuildController.acceptApplication);
router.post('/reject', GuildController.rejectApplication);
router.post('/leave', GuildController.leaveGuild);
router.post('/donate', GuildController.donate);
router.get('/chat', GuildController.getChatMessages);
router.post('/chat', GuildController.sendMessage);

module.exports = router;