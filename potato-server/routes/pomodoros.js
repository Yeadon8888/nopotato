const express = require('express');
const router = express.Router();
const { 
  getPomodoros, 
  createPomodoro, 
  updatePomodoro,
  getPomodoroStats
} = require('../controllers/pomodoros');
const { protect } = require('../middleware/auth');

// 番茄钟记录路由
router.route('/')
  .get(protect, getPomodoros)
  .post(protect, createPomodoro);

router.route('/:id')
  .put(protect, updatePomodoro);

router.route('/stats')
  .get(protect, getPomodoroStats);

module.exports = router; 