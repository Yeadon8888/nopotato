const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');
const Task = require('../models/Task');
const PomodoroRecord = require('../models/PomodoroRecord');

// DeepSeek AI 配置 - 写死的配置
const AI_CONFIG = {
  apiUrl: 'https://api.siliconflow.cn/v1/chat/completions',
  apiKey: 'sk-resfyqqexhfpqfpixcwombohwhuecuxkxkviytxoztukiwjd',
  model: 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B'
};

// @desc    获取用户数据日志用于AI分析
// @route   GET /api/ai/user-logs
// @access  Private
exports.getUserLogs = asyncHandler(async (req, res, next) => {
  try {
    console.log('🔍 getUserLogs 被调用，用户ID:', req.user.id);

    // 获取用户基本信息
    const user = await User.findById(req.user.id).select('-password');
    console.log('👤 用户信息:', user ? user.username : '未找到用户');
    console.log('🔍 当前用户ID:', req.user.id);

    // 获取用户所有任务
    console.log('🔍 查询任务，条件:', { userId: req.user.id });
    const tasks = await Task.find({ userId: req.user.id }).sort({ date: -1 });
    console.log('📋 任务数量:', tasks.length);
    if (tasks.length > 0) {
      console.log('📋 第一个任务示例:', {
        id: tasks[0]._id,
        name: tasks[0].name,
        userId: tasks[0].userId
      });
    }

    // 获取用户所有番茄钟记录
    console.log('🔍 查询番茄钟记录，条件:', { userId: req.user.id });
    const pomodoroRecords = await PomodoroRecord.find({ userId: req.user.id })
      .populate('taskId', 'name')
      .sort({ startTime: -1 });
    console.log('🍅 番茄钟记录数量:', pomodoroRecords.length);
    if (pomodoroRecords.length > 0) {
      console.log('🍅 第一个番茄钟示例:', {
        id: pomodoroRecords[0]._id,
        userId: pomodoroRecords[0].userId,
        taskId: pomodoroRecords[0].taskId,
        type: pomodoroRecords[0].type
      });
    }

    // 检查数据库中是否有任何数据
    const allTasks = await Task.find({}).limit(5);
    const allPomodoros = await PomodoroRecord.find({}).limit(5);
    console.log('🔍 数据库中总任务数:', await Task.countDocuments());
    console.log('🔍 数据库中总番茄钟数:', await PomodoroRecord.countDocuments());
    if (allTasks.length > 0) {
      console.log('🔍 数据库中任务示例:', allTasks[0]);
    }
    if (allPomodoros.length > 0) {
      console.log('🔍 数据库中番茄钟示例:', allPomodoros[0]);
    }

    // 为AI提取关键的番茄钟数据（去除敏感信息）
    const pomodoroDataForAI = pomodoroRecords.map(record => ({
      taskTitle: record.taskId ? record.taskId.name : '未知任务',
      startTime: record.startTime,
      endTime: record.endTime,
      duration: record.duration,
      type: record.type, // work/break
      completed: record.completed,
      date: record.startTime.toISOString().split('T')[0], // 只保留日期部分
      dayOfWeek: record.startTime.toLocaleDateString('zh-CN', { weekday: 'long' })
    }));
    console.log('🤖 为AI准备的番茄钟数据条数:', pomodoroDataForAI.length);

    // 为AI提取关键的任务数据（去除敏感信息）
    const tasksDataForAI = tasks.map(task => ({
      title: task.name,
      completed: task.completed,
      estimatedPomodoros: task.expectedPomodoros,
      actualPomodoros: task.actualPomodoros,
      createdDate: task.date.toISOString().split('T')[0],
      completedDate: task.completedAt ? task.completedAt.toISOString().split('T')[0] : null
    }));
    console.log('📋 为AI准备的任务数据条数:', tasksDataForAI.length);

    // 计算统计数据
    const totalPomodoros = pomodoroRecords.filter(record => record.type === 'work' && record.completed).length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0;

    // 计算每日效率
    const dailyStats = {};
    pomodoroRecords.forEach(record => {
      const date = record.startTime.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { completed: 0, total: 0 };
      }
      dailyStats[date].total++;
      if (record.completed) {
        dailyStats[date].completed++;
      }
    });

    // 生成用户数据摘要
    const userDataSummary = {
      userInfo: {
        username: user.username,
        joinDate: user.createdAt,
        totalDays: Math.ceil((new Date() - user.createdAt) / (1000 * 60 * 60 * 24))
      },
      statistics: {
        totalPomodoros,
        totalTasks,
        completedTasks,
        completionRate: `${completionRate}%`,
        averagePomodorosPerDay: totalPomodoros > 0 ? (totalPomodoros / Object.keys(dailyStats).length).toFixed(1) : 0
      },
      // 为AI准备的清洁数据（去除ID等敏感信息）
      aiData: {
        tasks: tasksDataForAI,
        pomodoroRecords: pomodoroDataForAI,
        summary: {
          totalWorkSessions: pomodoroDataForAI.filter(p => p.type === 'work').length,
          completedWorkSessions: pomodoroDataForAI.filter(p => p.type === 'work' && p.completed).length,
          totalBreakSessions: pomodoroDataForAI.filter(p => p.type === 'break').length,
          averageSessionDuration: pomodoroDataForAI.length > 0 ?
            (pomodoroDataForAI.reduce((sum, p) => sum + (p.duration || 0), 0) / pomodoroDataForAI.length).toFixed(1) : 0,
          mostProductiveDays: Object.entries(dailyStats)
            .sort(([,a], [,b]) => b.completed - a.completed)
            .slice(0, 5)
            .map(([date, stats]) => ({
              date,
              pomodoroCount: stats.completed,
              efficiency: stats.total > 0 ? (stats.completed / stats.total * 100).toFixed(1) : 0
            }))
        }
      },
      recentTasks: tasks.slice(0, 10).map(task => ({
        title: task.name,
        completed: task.completed,
        estimatedPomodoros: task.expectedPomodoros,
        actualPomodoros: task.actualPomodoros,
        createdAt: task.date
      })),
      recentPomodoros: pomodoroRecords.slice(0, 20).map(record => ({
        taskTitle: record.taskId ? record.taskId.name : '未知任务',
        type: record.type,
        duration: record.duration,
        completed: record.completed,
        startTime: record.startTime,
        endTime: record.endTime,
        createdAt: record.startTime
      })),
      dailyEfficiency: Object.entries(dailyStats).slice(-7).map(([date, stats]) => ({
        date,
        efficiency: stats.total > 0 ? (stats.completed / stats.total * 100).toFixed(1) : 0,
        completed: stats.completed,
        total: stats.total
      }))
    };

    console.log('📊 用户数据摘要生成完成:', {
      totalPomodoros,
      totalTasks,
      completedTasks,
      completionRate
    });

    res.status(200).json({
      success: true,
      data: userDataSummary
    });
  } catch (error) {
    console.error('❌ 获取用户日志失败:', error);
    return next(new ErrorResponse('获取用户数据失败', 500));
  }
});

// @desc    分析用户的任务数据并提供建议（保持向后兼容）
// @route   POST /api/ai/analyze
// @access  私有
exports.analyzeUserData = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  // 获取用户的所有任务数据
  const tasks = await Task.find({ userId }).sort({ date: -1 });

  // 获取用户的所有番茄钟记录
  const pomodoros = await PomodoroRecord.find({ userId })
    .populate('taskId', 'name')
    .sort({ startTime: -1 });

  // 准备数据分析
  const userData = {
    tasks: tasks.map(task => ({
      id: task._id,
      name: task.name,
      expectedPomodoros: task.expectedPomodoros,
      actualPomodoros: task.actualPomodoros,
      completed: task.completed,
      date: task.date,
      completedAt: task.completedAt
    })),
    pomodoros: pomodoros.map(pomodoro => ({
      id: pomodoro._id,
      taskName: pomodoro.taskId?.name || '未知任务',
      taskId: pomodoro.taskId?._id,
      startTime: pomodoro.startTime,
      endTime: pomodoro.endTime,
      duration: pomodoro.duration,
      completed: pomodoro.completed,
      type: pomodoro.type
    }))
  };

  // 生成统计数据
  const stats = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.completed).length,
    totalPomodoros: pomodoros.filter(p => p.type === 'work').length,
    completedPomodoros: pomodoros.filter(p => p.type === 'work' && p.completed).length,
    totalWorkMinutes: pomodoros
      .filter(p => p.type === 'work' && p.completed)
      .reduce((total, p) => total + p.duration, 0),
    mostFrequentTasks: getMostFrequentTasks(pomodoros),
    productiveHours: getProductiveHours(pomodoros),
    completionRate: tasks.length > 0 ? (tasks.filter(t => t.completed).length / tasks.length) * 100 : 0
  };

  // 创建给AI的提示内容
  const userPrompt = `看看下面的数据 给出10字以内的建议:

    完成${stats.completedTasks}/${stats.totalTasks}个任务
    番茄钟${stats.completedPomodoros}/${stats.totalPomodoros}个
    专注${stats.totalWorkMinutes}分钟
    爱做${stats.mostFrequentTasks[0] || '暂无'}
    黄金时段${stats.productiveHours[0] || '暂无'}`;

  try {
    // 调用外部AI API
    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AI_API_KEY || req.body.apiKey || 'sk-resfyqqexhfpqfpixcwombohwhuecuxkxkviytxoztukiwjd'}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-V3",
        messages: [
          {
            role: "system",
            content: "你是一个简短的时间管理助手小no 回复限制10字以内 不要用标点符号"
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        stream: true,
        max_tokens: 20,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.5
      })
    });

    // 处理流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let aiAnalysis = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.choices[0].delta.content) {
                aiAnalysis += parsed.choices[0].delta.content;
              }
            } catch (e) {
              console.error('解析流式数据失败:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('读取流式响应失败:', error);
      throw error;
    } finally {
      reader.releaseLock();
    }

    // 返回分析结果
    res.status(200).json({
      success: true,
      data: {
        stats,
        analysis: aiAnalysis
      }
    });
  } catch (error) {
    console.error('AI分析请求失败:', error);
    return next(new ErrorResponse('AI分析请求失败，请稍后再试', 500));
  }
});

// @desc    AI聊天 - 基于用户数据
// @route   POST /api/ai/chat
// @access  Private
exports.chatWithAI = asyncHandler(async (req, res, next) => {
  const { message, conversationMessages } = req.body;

  if (!message) {
    return next(new ErrorResponse('请提供聊天消息', 400));
  }

  if (!conversationMessages || !Array.isArray(conversationMessages)) {
    return next(new ErrorResponse('请提供对话上下文', 400));
  }

  try {
    console.log('🤖 AI聊天请求:', {
      message: message.substring(0, 50) + '...',
      conversationLength: conversationMessages.length,
      requestBodySize: JSON.stringify(req.body).length
    });

    // 使用前端传递的完整对话上下文
    let messages = [...conversationMessages];

    // 确保最后一条消息是用户的当前消息
    if (messages[messages.length - 1]?.content !== message) {
      messages.push({
        role: "user",
        content: message
      });
    }

    console.log('🤖 发送给AI的消息数量:', messages.length);
    console.log('🤖 最后一条消息:', messages[messages.length - 1]);

    // 调用DeepSeek API
    const response = await fetch(AI_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: messages,
        stream: false,
        max_tokens: 512,
        temperature: 0.7,
        top_p: 0.7,
        top_k: 50,
        frequency_penalty: 0.5
      })
    });

    if (!response.ok) {
      throw new Error(`AI API请求失败: ${response.status}`);
    }

    const aiResponse = await response.json();

    if (!aiResponse.choices || !aiResponse.choices[0]) {
      throw new Error('AI响应格式错误');
    }

    const aiMessage = aiResponse.choices[0].message.content;

    console.log('🤖 AI回复:', aiMessage.substring(0, 100) + '...');

    res.status(200).json({
      success: true,
      data: {
        message: aiMessage,
        timestamp: new Date(),
        usage: aiResponse.usage,
        conversationLength: messages.length
      }
    });

  } catch (error) {
    console.error('AI聊天失败:', error);

    // 如果AI服务失败，返回备用响应
    const fallbackResponses = [
      "抱歉，AI服务暂时不可用。根据番茄工作法的原理，建议您保持25分钟的专注时间，5分钟的休息时间。",
      "AI服务连接中断，但我建议您继续保持规律的工作节奏，这对提高效率很重要。",
      "暂时无法连接AI服务。建议您在番茄钟休息时间进行轻度活动，如伸展或深呼吸。"
    ];

    const fallbackMessage = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

    res.status(200).json({
      success: true,
      data: {
        message: fallbackMessage,
        timestamp: new Date(),
        fallback: true
      }
    });
  }
});

// 辅助函数：获取最常执行的任务
function getMostFrequentTasks(pomodoros) {
  if (!pomodoros || pomodoros.length === 0) return ['暂无数据'];

  const taskCounts = {};
  pomodoros.forEach(p => {
    if (p.taskName) {
      taskCounts[p.taskName] = (taskCounts[p.taskName] || 0) + 1;
    }
  });

  return Object.entries(taskCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);
}

// 辅助函数：获取用户最高效的工作时段
function getProductiveHours(pomodoros) {
  if (!pomodoros || pomodoros.length === 0) return ['暂无数据'];

  const hourCounts = {};
  pomodoros
    .filter(p => p.type === 'work' && p.completed)
    .forEach(p => {
      const hour = new Date(p.startTime).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

  const sortedHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => `${hour}:00-${Number(hour)+1}:00`);

  return sortedHours.length ? sortedHours : ['暂无数据'];
}