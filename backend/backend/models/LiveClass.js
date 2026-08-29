const mongoose = require('mongoose');

const liveClassSchema = new mongoose.Schema({

  scheduledDate: String,
scheduledTime: String,
platform: { type: String, default: 'Jitsi Meet' },
className: String,
description: String,
roomName: String,
jitsiUrl: String,
manualLink: String,

  meetingId: {
    type: String,
    required: true,
    unique: true
  },
  subject: {
    type: String,
    required: true
  },
  teacher: {
    type: String,
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  class: {
    type: String,
    required: true
  },
  isLive: {
    type: Boolean,
    default: false
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
 participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'participants.userModel'
    },
    userModel: {
      type: String,
      required: false,
      enum: ['Student', 'Teacher']
    },
    name: String,
    joinTime: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('LiveClass', liveClassSchema);
