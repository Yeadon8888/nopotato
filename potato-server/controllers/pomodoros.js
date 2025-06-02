const PomodoroRecord = require('../models/PomodoroRecord');
const Task = require('../models/Task');

// @desc    获取用户的番茄钟记录
// @route   GET /api/pomodoros
// @access  私有
exports.getPomodoros = async (req, res) => {
  try {
    const { start, end, taskId, type } = req.query;
    const query = { userId: req.user.id };

    // 日期范围过滤
    if (start || end) {
      query.startTime = {};
      if (start) {
        query.startTime.$gte = new Date(start);
      }
      if (end) {
        query.startTime.$lte = new Date(end);
      }
    }

    // 任务过滤
    if (taskId) {
      query.taskId = taskId;
    }

    // 类型过滤（工作/休息）
    if (type) {
      query.type = type;
    }

    const pomodoros = await PomodoroRecord.find(query).populate('taskId', 'name');

    res.status(200).json({
      success: true,
      count: pomodoros.length,
      data: pomodoros
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
};

// @desc    创建新的番茄钟记录
// @route   POST /api/pomodoros
// @access  私有
exports.createPomodoro = async (req, res) => {
  try {
    // 验证任务是否存在且属于当前用户
    const task = await Task.findOne({
      _id: req.body.taskId,
      userId: req.user.id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '未找到任务或任务不属于当前用户'
      });
    }

    // 添加用户ID到请求体
    req.body.userId = req.user.id;
    
    const pomodoro = await PomodoroRecord.create(req.body);

    res.status(201).json({
      success: true,
      data: pomodoro
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    } else {
      res.status(500).json({
        success: false,
        message: '服务器错误',
        error: error.message
      });
    }
  }
};

// @desc    更新番茄钟记录（完成）
// @route   PUT /api/pomodoros/:id
// @access  私有
exports.updatePomodoro = async (req, res) => {
  try {
    let pomodoro = await PomodoroRecord.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!pomodoro) {
      return res.status(404).json({
        success: false,
        message: '未找到番茄钟记录'
      });
    }

    // 如果是完成操作，自动设置结束时间
    if (req.body.completed === true && !req.body.endTime) {
      req.body.endTime = new Date();
    }

    pomodoro = await PomodoroRecord.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: pomodoro
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
};

// @desc    获取用户的番茄钟统计数据
// @route   GET /api/pomodoros/stats
// @access  私有
exports.getPomodoroStats = async (req, res) => {
  try {
    const { start, end } = req.query;
    const query = { 
      userId: req.user.id,
      completed: true
    };

    // 日期范围过滤
    if (start || end) {
      query.startTime = {};
      if (start) {
        query.startTime.$gte = new Date(start);
      }
      if (end) {
        query.startTime.$lte = new Date(end);
      }
    } else {
      // 默认获取最近7天数据
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      query.startTime = { $gte: lastWeek };
    }

    // 工作时间统计
    const workPomodoros = await PomodoroRecord.find({
      ...query,
      type: 'work'
    }).countDocuments();

    // 休息时间统计
    const breakPomodoros = await PomodoroRecord.find({
      ...query,
      type: 'break'
    }).countDocuments();

    // 总工作时间（分钟）
    const totalWorkMinutes = await PomodoroRecord.aggregate([
      { $match: { ...query, type: 'work' } },
      { $group: { _id: null, total: { $sum: '$duration' } } }
    ]);

    // 按任务分组统计
    const taskStats = await PomodoroRecord.aggregate([
      { $match: { ...query, type: 'work' } },
      { $group: { 
          _id: '$taskId', 
          count: { $sum: 1 },
          totalMinutes: { $sum: '$duration' }
        }
      },
      { $lookup: {
          from: 'tasks',
          localField: '_id',
          foreignField: '_id',
          as: 'taskInfo'
        }
      },
      { $unwind: '$taskInfo' },
      { $project: {
          taskId: '$_id',
          taskName: '$taskInfo.name',
          count: 1,
          totalMinutes: 1,
          _id: 0
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        workPomodoros,
        breakPomodoros,
        totalWorkMinutes: totalWorkMinutes.length > 0 ? totalWorkMinutes[0].total : 0,
        taskStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
}; 