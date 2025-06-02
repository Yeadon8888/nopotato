const express = require('express');
const router = express.Router();
const { exportDaily, exportRange } = require('../controllers/export');
const { protect } = require('../middleware/auth');

// 数据导出路由
router.get('/daily', protect, exportDaily);
router.get('/range', protect, exportRange);

module.exports = router; 