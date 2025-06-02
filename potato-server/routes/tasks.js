const express = require('express');
const router = express.Router();
const { 
  getTasks, 
  getTask, 
  createTask, 
  updateTask, 
  deleteTask,
  completeTask
} = require('../controllers/tasks');
const { protect } = require('../middleware/auth');

// 任务路由
router.route('/')
  .get(protect, getTasks)
  .post(protect, createTask);

router.route('/:id')
  .get(protect, getTask)
  .put(protect, updateTask)
  .delete(protect, deleteTask);

router.route('/:id/complete')
  .put(protect, completeTask);

module.exports = router; 