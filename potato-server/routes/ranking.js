const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// 导入模型
const User = require('../models/User');
const PomodoroRecord = require('../models/PomodoroRecord');

// 排行榜API
router.get('/', protect, async (req, res) => {
    try {
        const { period = 'week' } = req.query;
        
        // 确定查询时间范围
        const now = new Date();
        let startDate = new Date();
        
        switch (period) {
            case 'week':
                // 本周开始日期
                startDate.setDate(now.getDate() - now.getDay());
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'month':
                // 本月开始日期
                startDate.setDate(1);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'all':
                // 不限时间
                startDate = new Date(0);
                break;
            default:
                return res.status(400).json({ success: false, message: '无效的时间范围' });
        }
        
        // 聚合查询，统计每个用户的番茄钟数量
        const pomodoroStats = await PomodoroRecord.aggregate([
            {
                $match: {
                    type: 'work', // 只统计工作番茄钟
                    startTime: { $gte: startDate, $lte: now },
                    endTime: { $ne: null } // 只统计已完成的番茄钟
                }
            },
            {
                $group: {
                    _id: '$userId',
                    pomodoroCount: { $sum: 1 } // 计算番茄钟数量
                }
            },
            { $sort: { pomodoroCount: -1 } }, // 按番茄钟数量降序排序
            { $limit: 20 } // 只获取前20名
        ]);
        
        // 如果没有数据，返回空数组
        if (pomodoroStats.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }
        
        // 获取用户信息
        const userIds = pomodoroStats.map(stat => stat._id);
        const users = await User.find({ _id: { $in: userIds } }).select('username');
        
        // 构建用户ID到用户名的映射
        const userMap = {};
        users.forEach(user => {
            userMap[user._id] = user.username;
        });
        
        // 整合结果
        const rankingList = pomodoroStats.map(stat => ({
            userId: stat._id,
            username: userMap[stat._id] || '未知用户',
            pomodoroCount: stat.pomodoroCount
        }));
        
        res.json({
            success: true,
            data: rankingList
        });
    } catch (error) {
        console.error('获取排行榜错误:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

module.exports = router; 