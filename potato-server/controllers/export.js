const Task = require('../models/Task');
const PomodoroRecord = require('../models/PomodoroRecord');

// @desc    导出当天的任务和番茄钟数据
// @route   GET /api/export/daily
// @access  私有
exports.exportDaily = async (req, res) => {
  try {
    // 获取日期参数，默认为今天
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    // 查询当天的任务
    const tasks = await Task.find({
      userId: req.user.id,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    // 查询当天的番茄钟记录
    const pomodoros = await PomodoroRecord.find({
      userId: req.user.id,
      startTime: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).populate('taskId', 'name');

    // 处理数据，为每个任务计算实际使用的番茄钟数
    const taskData = tasks.map(task => {
      const taskPomodoros = pomodoros.filter(
        p => p.taskId && p.taskId._id.toString() === task._id.toString() && p.type === 'work'
      );
      
      return {
        taskId: task._id,
        taskName: task.name,
        expectedPomodoros: task.expectedPomodoros,
        actualPomodoros: task.completed ? task.actualPomodoros : taskPomodoros.length,
        completed: task.completed,
        completedAt: task.completedAt,
        date: task.date
      };
    });

    res.status(200).json({
      success: true,
      data: {
        date: startOfDay,
        tasks: taskData,
        pomodoros: pomodoros.map(p => ({
          id: p._id,
          taskName: p.taskId ? p.taskId.name : '未关联任务',
          taskId: p.taskId ? p.taskId._id : null,
          startTime: p.startTime,
          endTime: p.endTime,
          duration: p.duration,
          type: p.type,
          completed: p.completed
        }))
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

// @desc    导出特定日期范围的数据
// @route   GET /api/export/range
// @access  私有
exports.exportRange = async (req, res) => {
  try {
    // 获取日期范围参数，默认为过去7天
    let { start, end } = req.query;
    
    if (!start) {
      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() - 7);
      start = defaultStart.toISOString().split('T')[0];
    }
    
    if (!end) {
      end = new Date().toISOString().split('T')[0];
    }
    
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    // 查询范围内的任务
    const tasks = await Task.find({
      userId: req.user.id,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });

    // 查询范围内的番茄钟记录
    const pomodoros = await PomodoroRecord.find({
      userId: req.user.id,
      startTime: {
        $gte: startDate,
        $lte: endDate
      }
    }).populate('taskId', 'name');

    // 按日期分组统计
    const dailyStats = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      // 查找当天的任务和番茄钟
      const dayTasks = tasks.filter(
        task => new Date(task.date) >= dayStart && new Date(task.date) <= dayEnd
      );
      
      const dayPomodoros = pomodoros.filter(
        p => new Date(p.startTime) >= dayStart && new Date(p.startTime) <= dayEnd
      );
      
      const workPomodoros = dayPomodoros.filter(p => p.type === 'work').length;
      const breakPomodoros = dayPomodoros.filter(p => p.type === 'break').length;
      
      // 计算总工作时间（分钟）
      const totalWorkMinutes = dayPomodoros
        .filter(p => p.type === 'work')
        .reduce((sum, p) => sum + p.duration, 0);
      
      dailyStats.push({
        date: new Date(currentDate).toISOString().split('T')[0],
        tasksCount: dayTasks.length,
        completedTasksCount: dayTasks.filter(t => t.completed).length,
        workPomodoros,
        breakPomodoros,
        totalWorkMinutes
      });
      
      // 前进到下一天
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.status(200).json({
      success: true,
      data: {
        startDate,
        endDate,
        dailyStats,
        tasks: tasks.map(task => ({
          id: task._id,
          name: task.name,
          expectedPomodoros: task.expectedPomodoros,
          actualPomodoros: task.actualPomodoros,
          completed: task.completed,
          date: task.date,
          completedAt: task.completedAt
        }))
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