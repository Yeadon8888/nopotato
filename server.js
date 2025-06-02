/**
 * PomoPotato 服务器启动文件
 *
 * 此文件用于启动potato-server/index.js中的应用
 * 适用于宝塔面板等环境的部署
 */

// 引入必要的模块
const path = require('path');
const { spawn } = require('child_process');

// 定义服务器文件路径
const serverPath = path.join(__dirname, 'potato-server', 'index.js');

console.log('正在启动PomoPotato服务器...');
console.log('服务器文件路径:', serverPath);

// 启动服务器进程
// 设置环境变量确保使用5000端口
process.env.PORT = '5000';
const serverProcess = spawn('node', [serverPath], {
  stdio: 'inherit', // 将子进程的标准输入/输出/错误流传递给父进程
  cwd: __dirname, // 设置工作目录为当前目录
  env: { ...process.env, PORT: '5000' } // 确保子进程环境变量中PORT为5000
});

// 监听子进程事件
serverProcess.on('error', (err) => {
  console.error('启动服务器时出错:', err);
  process.exit(1);
});

serverProcess.on('exit', (code, signal) => {
  if (code !== 0) {
    console.error(`服务器进程退出，退出码: ${code}, 信号: ${signal}`);
    process.exit(1);
  }
  console.log('服务器进程已正常退出');
});

// 处理主进程的退出信号，确保子进程也能正确退出
process.on('SIGINT', () => {
  console.log('接收到SIGINT信号，正在关闭服务器...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('接收到SIGTERM信号，正在关闭服务器...');
  serverProcess.kill('SIGTERM');
});

console.log('服务器启动脚本运行中，监听端口: 5000');