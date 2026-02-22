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

module.exports = router;
