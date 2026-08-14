const express = require('express');
const router = express.Router();
const OnlineController = require('../controllers/online.controller');
const auth = require('../middleware/auth.middleware');

router.use(auth);

router.get('/character', OnlineController.getCharacter);
router.post('/character', OnlineController.createCharacter);
router.post('/switch-class', OnlineController.switchClass);
router.get('/inventory', OnlineController.getInventory);
router.post('/equip', OnlineController.equip);
router.post('/unequip', OnlineController.unequip);
router.post('/upgrade-item', OnlineController.upgradeItem);
router.post('/sell-item', OnlineController.sellItem);
router.get('/leaderboard', OnlineController.getLeaderboard);

module.exports = router;
