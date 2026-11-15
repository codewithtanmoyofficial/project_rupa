const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const Result = require('../models/Result');
const ActivityLog = require('../models/ActivityLog');
const asyncHandler = require('../utils/asyncHandler');
const { teacherCourseIds } = require('../utils/scope');

const TERM_DAYS = 90;
const since = () => new Date(Date.now() - TERM_DAYS * 24 * 60 * 60 * 1000);

// Which activity a role may see: admin everything, teacher attendance/results, student nothing
const activityFor = async (role, limit = 4) => {
  if (role === 'student') return [];
  const q = role === 'teacher' ? { type: { $in: ['attendance', 'result'] } } : {};
  return ActivityLog.find(q).sort({ createdAt: -1 }).limit(limit).select('type message createdAt');
};

// GET /api/dashboard
exports.stats = asyncHandler(async (req, res) => {
  const { role } = req.user;

  if (role === 'admin') {
    const [students, teachers, courses, attendance, newStudents, newTeachers, newCourses, lastAtt, recentStudents, activity] =
      await Promise.all([
        Student.countDocuments(),
        Teacher.countDocuments(),
        Course.countDocuments(),
        Attendance.countDocuments(),
        Student.countDocuments({ createdAt: { $gte: since() } }),
        Teacher.countDocuments({ createdAt: { $gte: since() } }),
        Course.countDocuments({ createdAt: { $gte: since() } }),
        Attendance.findOne().sort({ updatedAt: -1 }).select('updatedAt'),
        Student.find().populate('course', 'name code').sort({ createdAt: -1 }).limit(5),
        activityFor(role),
      ]);

    const updatedToday = lastAtt && new Date(lastAtt.updatedAt).toDateString() === new Date().toDateString();
    return res.json({
      role,
      stats: [
        { key: 'students', label: 'Total Students', value: students, sub: newStudents ? `+${newStudents} this term` : 'No change', tone: newStudents ? 'green' : 'slate' },
        { key: 'teachers', label: 'Total Teachers', value: teachers, sub: newTeachers ? `+${newTeachers} this term` : 'Stable', tone: newTeachers ? 'green' : 'slate' },
        { key: 'courses', label: 'Total Courses', value: courses, sub: newCourses ? `${newCourses} new course${newCourses > 1 ? 's' : ''}` : 'No change', tone: newCourses ? 'orange' : 'slate' },
        { key: 'attendance', label: 'Attendance Records', value: attendance, sub: !lastAtt ? 'No records yet' : updatedToday ? 'Updated today' : `Updated ${lastAtt.updatedAt.toISOString().slice(0, 10)}`, tone: 'slate' },
      ],
      recentStudents,
      activity,
    });
  }

  if (role === 'teacher') {
    const courseIds = await teacherCourseIds(req.user);
    const [students, attendance, results, recentStudents, activity] = await Promise.all([
      Student.countDocuments({ course: { $in: courseIds } }),
      Attendance.countDocuments({ course: { $in: courseIds } }),
      Result.countDocuments({ course: { $in: courseIds } }),
      Student.find({ course: { $in: courseIds } }).populate('course', 'name code').sort({ createdAt: -1 }).limit(5),
      activityFor(role),
    ]);
    return res.json({
      role,
      stats: [
        { key: 'courses', label: 'Assigned Courses', value: courseIds.length, sub: 'Your courses', tone: 'slate' },
        { key: 'students', label: 'My Students', value: students, sub: 'In your courses', tone: 'green' },
        { key: 'attendance', label: 'Attendance Records', value: attendance, sub: 'Your courses', tone: 'slate' },
        { key: 'results', label: 'Results Entered', value: results, sub: 'Your courses', tone: 'orange' },
      ],
      recentStudents,
      activity,
    });
  }

  // student: everything is scoped to their own record
  const me = await Student.findOne({ user: req.user._id }).populate('course', 'name code');
  if (!me) return res.json({ role, stats: [], recentStudents: [], activity: [] });
  const [att, results] = await Promise.all([Attendance.find({ student: me._id }), Result.find({ student: me._id })]);
  const present = att.filter((a) => a.status === 'Present').length;
  const passed = results.filter((r) => r.result === 'Pass').length;
  res.json({
    role,
    stats: [
      { key: 'courses', label: 'My Course', value: me.course?.code || '-', sub: me.course?.name || '', tone: 'slate' },
      { key: 'semester', label: 'Semester', value: me.semester, sub: me.status, tone: me.status === 'Active' ? 'green' : 'slate' },
      { key: 'attendance', label: 'My Attendance', value: att.length ? `${Math.round((present / att.length) * 100)}%` : '-', sub: `${present} of ${att.length} days present`, tone: 'slate' },
      { key: 'results', label: 'My Results', value: `${passed}/${results.length}`, sub: 'Subjects passed', tone: 'orange' },
    ],
    recentStudents: [me],
    activity: [],
  });
});

// GET /api/dashboard/activity?limit=5  (used by the notification bell)
exports.activity = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);
  res.json(await activityFor(req.user.role, limit));
});
