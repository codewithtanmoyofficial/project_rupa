const Student = require('../models/Student');
const Course = require('../models/Course');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Result = require('../models/Result');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activity');
const { parsePage, paged, escapeRegex } = require('../utils/pagination');
const { isBlank, isEmail, hasErrors, fail, conflict } = require('../utils/validate');
const { teacherCourseIds, sameId } = require('../utils/scope');

const validate = (b, creating) => {
  const e = {};
  if (isBlank(b.name)) e.name = 'Name is required';
  if (isBlank(b.email)) e.email = 'Email is required';
  else if (!isEmail(b.email)) e.email = 'Enter a valid email address';
  if (!b.course) e.course = 'Course is required';
  const s = Number(b.semester);
  if (!Number.isInteger(s) || s < 1 || s > 8) e.semester = 'Semester must be between 1 and 8';
  if (b.status && !['Active', 'Inactive'].includes(b.status)) e.status = 'Invalid status';
  if (creating && b.password && String(b.password).length < 6) e.password = 'Password must be at least 6 characters';
  return e;
};

// A student may only touch their own record
const forbidden = (req, student) => req.user.role === 'student' && !sameId(student.user, req.user._id);

// GET /api/students?search=&course=&status=&assigned=true&page=&limit=
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query);
  const and = [];
  if (req.user.role === 'student') and.push({ user: req.user._id });
  if (req.user.role === 'teacher' && req.query.assigned === 'true') {
    and.push({ course: { $in: await teacherCourseIds(req.user) } });
  }
  if (req.query.course) and.push({ course: req.query.course });
  if (req.query.status) and.push({ status: req.query.status });
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search.trim()), 'i');
    and.push({ $or: [{ name: rx }, { email: rx }] });
  }
  const q = and.length ? { $and: and } : {};

  const [data, total] = await Promise.all([
    Student.find(q).populate('course', 'name code').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Student.countDocuments(q),
  ]);
  res.json(paged(data, total, page, limit));
});

// GET /api/students/:id
exports.getOne = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).populate('course', 'name code');
  if (!student) return res.status(404).json({ message: 'Student not found' });
  if (forbidden(req, student)) return res.status(403).json({ message: 'You can only view your own profile' });
  res.json(student);
});

// POST /api/students  (also creates the student's login account)
exports.create = asyncHandler(async (req, res) => {
  const b = req.body;
  const errors = validate(b, true);
  if (hasErrors(errors)) return fail(res, errors);

  const email = b.email.toLowerCase().trim();
  const course = await Course.findById(b.course);
  if (!course) return fail(res, { course: 'Selected course does not exist' });
  if ((await Student.exists({ email })) || (await User.exists({ email }))) {
    return conflict(res, 'email', 'This email is already registered');
  }

  const user = await User.create({
    name: b.name.trim(),
    email,
    password: b.password || process.env.DEFAULT_PASSWORD || 'ChangeMe@123',
    role: 'student',
  });
  let student;
  try {
    student = await Student.create({
      name: b.name.trim(),
      email,
      course: course._id,
      semester: Number(b.semester),
      status: b.status || 'Active',
      user: user._id,
    });
  } catch (err) {
    await User.deleteOne({ _id: user._id }); // roll back the login account
    throw err;
  }
  await logActivity('student', `New student ${student.name} added`, req.user);
  await student.populate('course', 'name code');
  res.status(201).json(student);
});

// PUT /api/students/:id
exports.update = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ message: 'Student not found' });
  if (forbidden(req, student)) return res.status(403).json({ message: 'You can only edit your own profile' });

  const b = req.body;
  const errors = validate(b, false);
  if (hasErrors(errors)) return fail(res, errors);

  const email = b.email.toLowerCase().trim();
  const emailChanged = email !== student.email;
  if (emailChanged) {
    const taken =
      (await Student.exists({ email, _id: { $ne: student._id } })) ||
      (await User.exists({ email, _id: { $ne: student.user } }));
    if (taken) return conflict(res, 'email', 'This email is already registered');
  }
  if (!(await Course.exists({ _id: b.course }))) return fail(res, { course: 'Selected course does not exist' });

  student.set({
    name: b.name.trim(),
    email,
    course: b.course,
    semester: Number(b.semester),
    status: b.status || student.status,
  });
  await student.save();
  if (student.user) {
    await User.updateOne({ _id: student.user }, { name: student.name, ...(emailChanged && { email }) });
  }
  await logActivity('student', `Student ${student.name} updated`, req.user);
  await student.populate('course', 'name code');
  res.json(student);
});

// DELETE /api/students/:id  (cascades attendance, results and login account)
exports.remove = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ message: 'Student not found' });
  if (forbidden(req, student)) return res.status(403).json({ message: 'Not allowed' });

  await Promise.all([
    Attendance.deleteMany({ student: student._id }),
    Result.deleteMany({ student: student._id }),
    student.user ? User.deleteOne({ _id: student.user }) : null,
  ]);
  await student.deleteOne();
  await logActivity('student', `Student ${student.name} removed`, req.user);
  res.json({ message: 'Student deleted' });
});
