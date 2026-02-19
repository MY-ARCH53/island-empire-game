const express = require('express');
const router = express.Router();
const FriendController = require('../controllers/friend.controller');

router.get('/search', FriendController.searchUsers);
router.post('/request', FriendController.sendFriendRequest);
router.get('/requests', FriendController.getPendingRequests);
router.post('/accept', FriendController.acceptFriendRequest);
router.post('/reject', FriendController.rejectFriendRequest);
router.get('/list', FriendController.getFriends);
router.post('/remove', FriendController.removeFriend);
router.post('/gift', FriendController.sendGift);

module.exports = router;