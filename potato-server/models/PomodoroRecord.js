const mongoose = require('mongoose');

const PomodoroRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number,
    default: 25 // 默认25分钟
  },
  completed: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ['work', 'break'],
    default: 'work'
  }
});

module.exports = mongoose.model('PomodoroRecord', PomodoroRecordSchema); 