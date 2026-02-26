const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/start-game', AuthController.startGame);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.get('/profile', AuthController.getProfile);

module.exports = router;