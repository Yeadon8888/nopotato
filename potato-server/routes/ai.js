const express = require('express');
const { analyzeUserData, chatWithAI, getUserLogs } = require('../controllers/ai');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要授权
router.use(protect);

// 获取用户日志数据
router.get('/user-logs', getUserLogs);

// AI分析和聊天路由
router.post('/analyze', analyzeUserData);
router.post('/chat', chatWithAI);

module.exports = router;