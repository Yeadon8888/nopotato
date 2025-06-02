/**
 * 异步处理中间件
 * 用于处理异步函数的错误，避免在每个控制器中使用try-catch
 * @param {Function} fn 异步控制器函数
 * @returns {Function} 中间件函数
 */
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler; 