const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');

// 加载环境变量
dotenv.config();

// 连接数据库
connectDB();

// 路由文件
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const pomodoroRoutes = require('./routes/pomodoros');
const exportRoutes = require('./routes/export');
const aiRoutes = require('./routes/ai');

const app = express();

// Body parser - 增加限制以支持大的对话上下文
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 设置跨域 - 增强版本
app.use((req, res, next) => {
  // 获取允许的来源
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [
        'http://localhost:8080',
        'http://localhost:3000',
        'http://127.0.0.1:8080',
        'http://localhost:8081',
        'http://127.0.0.1:8081'
      ];

  const origin = req.headers.origin;

  console.log('🌐 CORS请求:', {
    method: req.method,
    origin: origin,
    url: req.url,
    headers: req.headers
  });

  // 检查来源是否被允许
  if (allowedOrigins.includes(origin) || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else {
    // 开发环境允许所有localhost来源
    if (origin && origin.includes('localhost')) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }
  }

  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');

  if (req.method === 'OPTIONS') {
    console.log('✅ 处理OPTIONS预检请求');
    return res.status(200).json({});
  }
  next();
});

// 挂载路由
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/pomodoros', pomodoroRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/ai', aiRoutes);

// 根路径响应
app.get('/', (req, res) => {
  res.send('欢迎来到 NoPotato 服务器! API 运行正常。');
});

// 错误处理中间件
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`服务器正在运行在 http://localhost:${PORT}`);
});

// 处理未处理的承诺拒绝
process.on('unhandledRejection', (err, promise) => {
  console.log(`错误: ${err.message}`);
  // 关闭服务器并退出进程
  server.close(() => process.exit(1));
});