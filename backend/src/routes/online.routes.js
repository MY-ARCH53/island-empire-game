const express = require('express');
const router = express.Router();
const OnlineController = require('../controllers/online.controller');
const auth = require('../middleware/auth.middleware');

router.use(auth);

router.get('/character', OnlineController.getCharacter);
router.post('/character', OnlineController.createCharacter);
router.get('/inventory', OnlineController.getInventory);
router.post('/equip', OnlineController.equip);
router.post('/unequip', OnlineController.unequip);

module.exports = router;
