const Course = require('../models/Course');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activity');
const { parsePage, paged, escapeRegex } = require('../utils/pagination');
const { isBlank, hasErrors, fail, conflict } = require('../utils/validate');
const { ownStudent } = require('../utils/scope');

const validate = (b) => {
  const e = {};
  if (isBlank(b.name)) e.name = 'Course name is required';
  if (isBlank(b.code)) e.code = 'Course code is required';
  else if (!/^[A-Za-z0-9-]{2,10}$/.test(String(b.code).trim())) e.code = 'Use 2–10 letters, numbers or hyphens';
  const d = Number(b.durationYears);
  if (!Number.isInteger(d) || d < 1 || d > 6) e.durationYears = 'Duration must be 1–6 years';
  if (b.status && !['Active', 'Inactive'].includes(b.status)) e.status = 'Invalid status';
  return e;
};

// GET /api/courses?search=&status=&page=&limit=
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query);
  const and = [];
  if (req.user.role === 'student') {
    const me = await ownStudent(req.user);
    and.push({ _id: me ? me.course : null }); // students only see their own course
  }
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search.trim()), 'i');
    and.push({ $or: [{ name: rx }, { code: rx }] });
  }
  if (req.query.status) and.push({ status: req.query.status });
  const q = and.length ? { $and: and } : {};

  const [data, total] = await Promise.all([
    Course.find(q).sort({ _id: 1 }).skip(skip).limit(limit),
    Course.countDocuments(q),
  ]);
  res.json(paged(data, total, page, limit));
});

// GET /api/courses/:id
exports.getOne = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ message: 'Course not found' });
  if (req.user.role === 'student') {
    const me = await ownStudent(req.user);
    if (!me || String(me.course) !== String(course._id)) {
      return res.status(403).json({ message: 'You can only view your own course' });
    }
  }
  res.json(course);
});

// POST /api/courses
exports.create = asyncHandler(async (req, res) => {
  const b = req.body;
  const errors = validate(b);
  if (hasErrors(errors)) return fail(res, errors);
  const code = b.code.trim().toUpperCase();
  if (await Course.exists({ code })) return conflict(res, 'code', 'A course with this code already exists');

  const course = await Course.create({
    name: b.name.trim(),
    code,
    durationYears: Number(b.durationYears),
    status: b.status || 'Active',
  });
  await logActivity('course', `Course "${course.name}" created`, req.user);
  res.status(201).json(course);
});

// PUT /api/courses/:id
exports.update = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ message: 'Course not found' });
  const b = req.body;
  const errors = validate(b);
  if (hasErrors(errors)) return fail(res, errors);
  const code = b.code.trim().toUpperCase();
  if (await Course.exists({ code, _id: { $ne: course._id } })) {
    return conflict(res, 'code', 'A course with this code already exists');
  }

  course.set({ name: b.name.trim(), code, durationYears: Number(b.durationYears), status: b.status || course.status });
  await course.save();
  await logActivity('course', `Course "${course.name}" updated`, req.user);
  res.json(course);
});

// DELETE /api/courses/:id
exports.remove = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ message: 'Course not found' });
  if (await Student.exists({ course: course._id })) {
    return res.status(409).json({ message: 'This course has enrolled students. Move or remove them before deleting it.' });
  }
  await Teacher.updateMany({ courses: course._id }, { $pull: { courses: course._id } });
  await course.deleteOne();
  await logActivity('course', `Course "${course.name}" deleted`, req.user);
  res.json({ message: 'Course deleted' });
});
