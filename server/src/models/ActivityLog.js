const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['student', 'teacher', 'course', 'result', 'attendance', 'role'], required: true },
    message: { type: String, required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
