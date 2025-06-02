// API连接模块，用于与后端API通信

// 动态获取API基础URL
const getApiUrl = () => {
  // 检测环境
  const isDevelopment = window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1' ||
                       window.location.port === '8080';

  if (isDevelopment) {
    return 'http://localhost:5000/api';
  } else {
    return '/api';  // 生产环境使用相对路径
  }
};

const API_URL = getApiUrl();

/**
 * 管理API请求的类
 */
class API {
  /**
   * 获取存储在localStorage中的token
   */
  static getToken() {
    return localStorage.getItem('pomo_token');
  }

  /**
   * 设置token到localStorage
   */
  static setToken(token) {
    localStorage.setItem('pomo_token', token);
  }

  /**
   * 清除token
   */
  static clearToken() {
    localStorage.removeItem('pomo_token');
  }

  /**
   * 设置请求头
   */
  static getHeaders() {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * 执行API请求
   */
  static async request(endpoint, method = 'GET', data = null) {
    const url = `${API_URL}${endpoint}`;
    const options = {
      method,
      headers: this.getHeaders()
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '请求失败');
      }

      return result;
    } catch (error) {
      console.error('API请求错误:', error);
      throw error;
    }
  }

  // 认证API
  static async register(userData) {
    const result = await this.request('/auth/register', 'POST', userData);
    if (result.token) {
      this.setToken(result.token);
    }
    return result;
  }

  static async login(credentials) {
    const result = await this.request('/auth/login', 'POST', credentials);
    if (result.token) {
      this.setToken(result.token);
    }
    return result;
  }

  static async getCurrentUser() {
    return await this.request('/auth/me');
  }

  static async logout() {
    const result = await this.request('/auth/logout', 'POST');
    this.clearToken();
    return result;
  }

  // 任务API
  static async getTasks() {
    return await this.request('/tasks');
  }

  static async getTask(id) {
    return await this.request(`/tasks/${id}`);
  }

  static async createTask(taskData) {
    return await this.request('/tasks', 'POST', taskData);
  }

  static async updateTask(id, taskData) {
    return await this.request(`/tasks/${id}`, 'PUT', taskData);
  }

  static async deleteTask(id) {
    return await this.request(`/tasks/${id}`, 'DELETE');
  }

  static async completeTask(id, data) {
    return await this.request(`/tasks/${id}/complete`, 'PUT', data);
  }

  // 番茄钟记录API
  static async getPomodoros(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return await this.request(`/pomodoros?${queryString}`);
  }

  static async createPomodoro(data) {
    return await this.request('/pomodoros', 'POST', data);
  }

  static async updatePomodoro(id, data) {
    return await this.request(`/pomodoros/${id}`, 'PUT', data);
  }

  static async getPomodoroStats(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return await this.request(`/pomodoros/stats?${queryString}`);
  }

  // 数据导出API
  static async exportDaily(date = null) {
    const params = date ? { date } : {};
    const queryString = new URLSearchParams(params).toString();
    return await this.request(`/export/daily?${queryString}`);
  }

  static async exportRange(start, end) {
    const params = { start, end };
    const queryString = new URLSearchParams(params).toString();
    return await this.request(`/export/range?${queryString}`);
  }

  // AI助手API
  static async getAIAnalysis() {
    return await this.request('/ai/analyze', 'POST');
  }

  static async getUserLogs() {
    return await this.request('/ai/user-logs', 'GET');
  }

  static async chatWithAI(message, userLogs = null, isFirstMessage = false) {
    const url = `${API_URL}/ai/chat`;
    const options = {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        message,
        userLogs,
        isFirstMessage
      })
    };

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '请求失败');
      }
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('AI聊天请求错误:', error);
      throw error;
    }
  }

  // 获取排行榜数据
  static async getRanking(period = 'week') {
    try {
      return await this.request(`/ranking?period=${period}`);
    } catch (error) {
      console.error('获取排行榜数据失败:', error);
      throw error;
    }
  }
}

// 导出API类
window.API = API;