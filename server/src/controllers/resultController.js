const Result = require('../models/Result');
const Student = require('../models/Student');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activity');
const { parsePage, paged, escapeRegex } = require('../utils/pagination');
const { isBlank, hasErrors, fail, conflict } = require('../utils/validate');
const { teacherCourseIds, ownStudent, sameId } = require('../utils/scope');

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

const OUT_OF_SCOPE = { message: 'You can only manage results for your assigned courses' };

const validateMarks = (e, marks) => {
  const m = Number(marks);
  if (marks === '' || marks === null || marks === undefined) e.marks = 'Marks are required';
  else if (!Number.isInteger(m) || m < 0 || m > 100) e.marks = 'Marks must be a whole number from 0 to 100';
};

// GET /api/results?student=&subject=&result=&page=&limit=
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query, 20);
  const and = [await scopeFilter(req)];
  if (req.query.student && req.user.role !== 'student') and.push({ student: req.query.student });
  if (req.query.subject) and.push({ subject: new RegExp(escapeRegex(req.query.subject.trim()), 'i') });
  if (req.query.result) and.push({ result: req.query.result });
  const q = { $and: and };

  const [data, total] = await Promise.all([
    Result.find(q).populate('student', 'name').populate('course', 'name code').sort({ _id: 1 }).skip(skip).limit(limit),
    Result.countDocuments(q),
  ]);
  res.json(paged(data, total, page, limit));
});

// GET /api/results/:id
exports.getOne = asyncHandler(async (req, res) => {
  const rec = await Result.findOne({ $and: [{ _id: req.params.id }, await scopeFilter(req)] })
    .populate('student', 'name')
    .populate('course', 'name code');
  if (!rec) return res.status(404).json({ message: 'Result not found' });
  res.json(rec);
});

// POST /api/results  { student, subject, marks }  -> grade + result are calculated here
exports.create = asyncHandler(async (req, res) => {
  const { student: studentId, subject, marks } = req.body;
  const errors = {};
  if (!studentId) errors.student = 'Student is required';
  if (isBlank(subject)) errors.subject = 'Subject is required';
  validateMarks(errors, marks);
  if (hasErrors(errors)) return fail(res, errors);

  const student = await Student.findById(studentId);
  if (!student) return fail(res, { student: 'Student not found' });
  if (!(await teacherCanTouch(req, student.course))) return res.status(403).json(OUT_OF_SCOPE);
  if (await Result.exists({ student: student._id, subject: subject.trim() })) {
    return conflict(res, 'subject', 'A result for this subject already exists for this student');
  }

  const rec = await Result.create({
    student: student._id,
    course: student.course,
    subject: subject.trim(),
    marks: Number(marks),
    updatedBy: req.user._id,
  });
  await logActivity('result', `Result added for ${student.name} (${rec.subject})`, req.user);
  await rec.populate([{ path: 'student', select: 'name' }, { path: 'course', select: 'name code' }]);
  res.status(201).json(rec);
});

// PUT /api/results/:id  { subject, marks }
exports.update = asyncHandler(async (req, res) => {
  const rec = await Result.findById(req.params.id);
  if (!rec) return res.status(404).json({ message: 'Result not found' });
  if (!(await teacherCanTouch(req, rec.course))) return res.status(403).json(OUT_OF_SCOPE);

  const { subject = rec.subject, marks } = req.body;
  const errors = {};
  if (isBlank(subject)) errors.subject = 'Subject is required';
  validateMarks(errors, marks);
  if (hasErrors(errors)) return fail(res, errors);
  if (subject.trim() !== rec.subject && (await Result.exists({ student: rec.student, subject: subject.trim() }))) {
    return conflict(res, 'subject', 'A result for this subject already exists for this student');
  }

  rec.set({ subject: subject.trim(), marks: Number(marks), updatedBy: req.user._id });
  await rec.save(); // pre-validate hook recalculates grade + result
  const student = await Student.findById(rec.student).select('name');
  await logActivity('result', `Result updated for ${student?.name}`, req.user);
  await rec.populate([{ path: 'student', select: 'name' }, { path: 'course', select: 'name code' }]);
  res.json(rec);
});

// DELETE /api/results/:id
exports.remove = asyncHandler(async (req, res) => {
  const rec = await Result.findById(req.params.id);
  if (!rec) return res.status(404).json({ message: 'Result not found' });
  if (!(await teacherCanTouch(req, rec.course))) return res.status(403).json(OUT_OF_SCOPE);
  const student = await Student.findById(rec.student).select('name');
  await rec.deleteOne();
  await logActivity('result', `Result removed for ${student?.name} (${rec.subject})`, req.user);
  res.json({ message: 'Result deleted' });
});
