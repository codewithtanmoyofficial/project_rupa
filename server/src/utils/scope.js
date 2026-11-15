const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

// Ids of the courses assigned to the logged-in teacher
exports.teacherCourseIds = async (user) => {
  const t = await Teacher.findOne({ user: user._id }).select('courses');
  return t ? t.courses : [];
};

exports.ownStudent = (user) => Student.findOne({ user: user._id });

exports.sameId = (a, b) => String(a?._id || a) === String(b?._id || b);
