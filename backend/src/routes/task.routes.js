const express = require('express');
const router = express.Router();
const TaskController = require('../controllers/task.controller');

router.get('/', TaskController.getUserTasks);
router.post('/progress', TaskController.updateTaskProgress);
router.post('/claim', TaskController.claimReward);

module.exports = router;