/**
 * 自定义错误响应类
 * 扩展Error类，添加状态码
 */
class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = ErrorResponse; 