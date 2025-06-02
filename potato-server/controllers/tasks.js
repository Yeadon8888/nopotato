const Task = require('../models/Task');

// @desc    获取用户所有任务
// @route   GET /api/tasks
// @access  私有
exports.getTasks = async (req, res) => {
  try {
    // 获取当前用户的任务
    const tasks = await Task.find({ userId: req.user.id });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
};

// @desc    获取单个任务
// @route   GET /api/tasks/:id
// @access  私有
exports.getTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '未找到任务'
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
};

// @desc    创建新任务
// @route   POST /api/tasks
// @access  私有
exports.createTask = async (req, res) => {
  try {
    // 添加用户ID到请求体
    req.body.userId = req.user.id;
    
    const task = await Task.create(req.body);

    res.status(201).json({
      success: true,
      data: task
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

// @desc    更新任务
// @route   PUT /api/tasks/:id
// @access  私有
exports.updateTask = async (req, res) => {
  try {
    let task = await Task.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '未找到任务'
      });
    }

    task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
};

// @desc    删除任务
// @route   DELETE /api/tasks/:id
// @access  私有
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '未找到任务'
      });
    }

    await task.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
};

// @desc    完成任务
// @route   PUT /api/tasks/:id/complete
// @access  私有
exports.completeTask = async (req, res) => {
  try {
    const { actualPomodoros } = req.body;

    let task = await Task.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '未找到任务'
      });
    }

    task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        completed: true,
        actualPomodoros,
        completedAt: Date.now()
      },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
}; 