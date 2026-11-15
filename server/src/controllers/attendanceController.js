const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activity');
const { parsePage, paged } = require('../utils/pagination');
const { hasErrors, fail, conflict } = require('../utils/validate');
const { teacherCourseIds, ownStudent, sameId } = require('../utils/scope');

const isRealDate = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

// Row-level scope: students see only their own rows, teachers only their assigned courses
const scopeFilter = async (req) => {
  if (req.user.role === 'student') {
    const me = await ownStudent(req.user);
    return { student: me ? me._id : null };
  }
  if (req.user.role === 'teacher') return { course: { $in: await teacherCourseIds(req.user) } };
  return {};
};

const teacherCanTouch = async (req, courseId) =>
  req.user.role !== 'teacher' || (await teacherCourseIds(req.user)).some((c) => sameId(c, courseId));

const OUT_OF_SCOPE = { message: 'You can only manage attendance for your assigned courses' };

// GET /api/attendance?student=&course=&date=&status=&page=&limit=
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query, 20);
  const and = [await scopeFilter(req)];
  if (req.query.student && req.user.role !== 'student') and.push({ student: req.query.student });
  if (req.query.course) and.push({ course: req.query.course });
  if (req.query.date) and.push({ date: req.query.date });
  if (req.query.status) and.push({ status: req.query.status });
  const q = { $and: and };

  const [data, total] = await Promise.all([
    Attendance.find(q)
      .populate('student', 'name')
      .populate('course', 'name code')
      .sort({ _id: 1 })
      .skip(skip)
      .limit(limit),
    Attendance.countDocuments(q),
  ]);
  res.json(paged(data, total, page, limit));
});

// GET /api/attendance/:id
exports.getOne = asyncHandler(async (req, res) => {
  const rec = await Attendance.findOne({ $and: [{ _id: req.params.id }, await scopeFilter(req)] })
    .populate('student', 'name')
    .populate('course', 'name code');
  if (!rec) return res.status(404).json({ message: 'Attendance record not found' });
  res.json(rec);
});

// POST /api/attendance  { student, date, status }
exports.create = asyncHandler(async (req, res) => {
  const { student: studentId, date, status } = req.body;
  const errors = {};
  if (!studentId) errors.student = 'Student is required';
  if (!isRealDate(date)) errors.date = 'Enter a valid date';
  if (!['Present', 'Absent'].includes(status)) errors.status = 'Status must be Present or Absent';
  if (hasErrors(errors)) return fail(res, errors);

  const student = await Student.findById(studentId);
  if (!student) return fail(res, { student: 'Student not found' });
  if (!(await teacherCanTouch(req, student.course))) return res.status(403).json(OUT_OF_SCOPE);
  if (await Attendance.exists({ student: student._id, date })) {
    return conflict(res, 'date', 'Attendance is already recorded for this student on this date');
  }

  const rec = await Attendance.create({
    student: student._id,
    course: student.course,
    date,
    status,
    markedBy: req.user._id,
  });
  await logActivity('attendance', `Attendance marked for ${student.name} (${date})`, req.user);
  await rec.populate([{ path: 'student', select: 'name' }, { path: 'course', select: 'name code' }]);
  res.status(201).json(rec);
});

// PUT /api/attendance/:id  { date, status }
exports.update = asyncHandler(async (req, res) => {
  const rec = await Attendance.findById(req.params.id);
  if (!rec) return res.status(404).json({ message: 'Attendance record not found' });
  if (!(await teacherCanTouch(req, rec.course))) return res.status(403).json(OUT_OF_SCOPE);

  const { date = rec.date, status = rec.status } = req.body;
  const errors = {};
  if (!isRealDate(date)) errors.date = 'Enter a valid date';
  if (!['Present', 'Absent'].includes(status)) errors.status = 'Status must be Present or Absent';
  if (hasErrors(errors)) return fail(res, errors);
  if (date !== rec.date && (await Attendance.exists({ student: rec.student, date }))) {
    return conflict(res, 'date', 'Attendance is already recorded for this student on this date');
  }

  rec.set({ date, status, markedBy: req.user._id });
  await rec.save();
  const student = await Student.findById(rec.student).select('name');
  await logActivity('attendance', `Attendance updated for ${student?.name} (${date})`, req.user);
  await rec.populate([{ path: 'student', select: 'name' }, { path: 'course', select: 'name code' }]);
  res.json(rec);
});

// DELETE /api/attendance/:id
exports.remove = asyncHandler(async (req, res) => {
  const rec = await Attendance.findById(req.params.id);
  if (!rec) return res.status(404).json({ message: 'Attendance record not found' });
  if (!(await teacherCanTouch(req, rec.course))) return res.status(403).json(OUT_OF_SCOPE);
  const student = await Student.findById(rec.student).select('name');
  await rec.deleteOne();
  await logActivity('attendance', `Attendance record removed for ${student?.name} (${rec.date})`, req.user);
  res.json({ message: 'Attendance record deleted' });
});
