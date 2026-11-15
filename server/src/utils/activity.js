const ActivityLog = require('../models/ActivityLog');

// Never let a logging failure break the main request
exports.logActivity = async (type, message, actor) => {
  try {
    await ActivityLog.create({ type, message, actor: actor?._id || actor });
  } catch (err) {
    console.error('Activity log failed:', err.message);
  }
};
