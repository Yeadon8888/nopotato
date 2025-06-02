const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 保护路由中间件
exports.protect = async (req, res, next) => {
  let token;

  // 获取请求头中的token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    // 从Bearer token中提取token
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    // 或从cookie中获取token
    token = req.cookies.token;
  }

  // 检查token是否存在
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '未授权，无法访问此路由'
    });
  }

  try {
    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pomopotato_secret');

    // 查找对应用户
    req.user = await User.findById(decoded.id);

    // 如果用户不存在
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在，无法授权'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token无效，无法访问此路由'
    });
  }
}; 