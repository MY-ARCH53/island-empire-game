const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/chat.controller');
const auth = require('../middleware/auth.middleware');

router.use(auth);

router.get('/global', ChatController.getGlobalMessages);
router.post('/global', ChatController.sendGlobalMessage);

router.post('/dm', ChatController.sendPrivateMessage);
router.get('/dm/:otherId', ChatController.getConversation);
router.get('/conversations', ChatController.getConversationList);
router.get('/unread', ChatController.getUnreadCount);
router.get('/search', ChatController.searchUsers);

module.exports = router;
