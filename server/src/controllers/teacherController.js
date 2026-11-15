const mongoose = require('mongoose');
const Teacher = require('../models/Teacher');
const Course = require('../models/Course');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activity');
const { parsePage, paged, escapeRegex } = require('../utils/pagination');
const { isBlank, isEmail, hasErrors, fail, conflict } = require('../utils/validate');

const validate = (b, creating) => {
  const e = {};
  if (isBlank(b.name)) e.name = 'Name is required';
  if (isBlank(b.email)) e.email = 'Email is required';
  else if (!isEmail(b.email)) e.email = 'Enter a valid email address';
  if (isBlank(b.department)) e.department = 'Department / subject is required';
  if (b.status && !['Active', 'Inactive'].includes(b.status)) e.status = 'Invalid status';
  if (b.courses && (!Array.isArray(b.courses) || !b.courses.every((id) => mongoose.isValidObjectId(id)))) {
    e.courses = 'Invalid course selection';
  }
  if (creating && b.password && String(b.password).length < 6) e.password = 'Password must be at least 6 characters';
  return e;
};

// GET /api/teachers?search=&status=&page=&limit=
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query);
  const and = [];
  if (req.query.status) and.push({ status: req.query.status });
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search.trim()), 'i');
    and.push({ $or: [{ name: rx }, { email: rx }, { department: rx }] });
  }
  const q = and.length ? { $and: and } : {};

  const [data, total] = await Promise.all([
    Teacher.find(q).populate('courses', 'name code').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Teacher.countDocuments(q),
  ]);
  res.json(paged(data, total, page, limit));
});

// GET /api/teachers/:id
exports.getOne = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id).populate('courses', 'name code');
  if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
  res.json(teacher);
});

// POST /api/teachers  (also creates the teacher's login account)
exports.create = asyncHandler(async (req, res) => {
  const b = req.body;
  const errors = validate(b, true);
  if (hasErrors(errors)) return fail(res, errors);

  const email = b.email.toLowerCase().trim();
  if ((await Teacher.exists({ email })) || (await User.exists({ email }))) {
    return conflict(res, 'email', 'This email is already registered');
  }
  const courses = await Course.find({ _id: { $in: b.courses || [] } }).select('_id');

  const user = await User.create({
    name: b.name.trim(),
    email,
    password: b.password || process.env.DEFAULT_PASSWORD || 'ChangeMe@123',
    role: 'teacher',
  });
  let teacher;
  try {
    teacher = await Teacher.create({
      name: b.name.trim(),
      email,
      department: b.department.trim(),
      status: b.status || 'Active',
      courses: courses.map((c) => c._id),
      user: user._id,
    });
  } catch (err) {
    await User.deleteOne({ _id: user._id });
    throw err;
  }
  await logActivity('teacher', `New teacher ${teacher.name} added`, req.user);
  await teacher.populate('courses', 'name code');
  res.status(201).json(teacher);
});

// PUT /api/teachers/:id
exports.update = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

  const b = req.body;
  const errors = validate(b, false);
  if (hasErrors(errors)) return fail(res, errors);

  const email = b.email.toLowerCase().trim();
  const emailChanged = email !== teacher.email;
  if (emailChanged) {
    const taken =
      (await Teacher.exists({ email, _id: { $ne: teacher._id } })) ||
      (await User.exists({ email, _id: { $ne: teacher.user } }));
    if (taken) return conflict(res, 'email', 'This email is already registered');
  }
  const courses = await Course.find({ _id: { $in: b.courses || [] } }).select('_id');

  teacher.set({
    name: b.name.trim(),
    email,
    department: b.department.trim(),
    status: b.status || teacher.status,
    courses: courses.map((c) => c._id),
  });
  await teacher.save();
  if (teacher.user) {
    await User.updateOne({ _id: teacher.user }, { name: teacher.name, ...(emailChanged && { email }) });
  }
  await logActivity('teacher', `Teacher ${teacher.name} profile updated`, req.user);
  await teacher.populate('courses', 'name code');
  res.json(teacher);
});

// DELETE /api/teachers/:id
exports.remove = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
  if (teacher.user) await User.deleteOne({ _id: teacher.user });
  await teacher.deleteOne();
  await logActivity('teacher', `Teacher ${teacher.name} removed`, req.user);
  res.json({ message: 'Teacher deleted' });
});
