const express = require('express');
const router = express.Router();
const BattleController = require('../controllers/battle.controller');

router.get('/army', BattleController.getArmy);
router.post('/recruit', BattleController.recruitSoldiers);
router.get('/pirates', BattleController.listPirates);
router.post('/attack-pirate', BattleController.attackPirate);
router.post('/watch-ad-reward', BattleController.watchAdReward);
router.get('/history', BattleController.getBattleHistory);
router.get('/pvp-targets', BattleController.listPvpTargets);
router.post('/attack-player', BattleController.attackPlayer);
router.post('/buy-shield', BattleController.buyShield);
router.get('/reports', BattleController.getAllBattleReports);
router.get('/unread-attacks', BattleController.getUnreadAttacks);
router.post('/mark-seen', BattleController.markAttacksSeen);

module.exports = router;