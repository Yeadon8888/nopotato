const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, '请提供任务名称'],
    trim: true,
    maxlength: [200, '任务名称不能超过200个字符']
  },
  expectedPomodoros: {
    type: Number,
    required: [true, '请提供预计番茄数'],
    min: [1, '预计番茄数至少为1']
  },
  actualPomodoros: {
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  date: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('Task', TaskSchema); 