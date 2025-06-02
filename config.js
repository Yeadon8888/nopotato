// 前端配置文件
const CONFIG = {
  // 开发环境配置
  development: {
    API_BASE_URL: 'http://localhost:5000/api',
    FRONTEND_URL: 'http://localhost:8080'
  },
  
  // 生产环境配置
  production: {
    API_BASE_URL: '/api',  // 生产环境使用相对路径（需要反向代理）
    FRONTEND_URL: window.location.origin
  },
  
  // 获取当前环境配置
  getCurrentConfig() {
    // 检测环境：如果是localhost且端口不是80/443，则为开发环境
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.port === '8080';
    
    return isDevelopment ? this.development : this.production;
  }
};

// 导出配置
window.CONFIG = CONFIG;
