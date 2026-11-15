require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const Course = require('./src/models/Course');
const Student = require('./src/models/Student');
const Teacher = require('./src/models/Teacher');
const Attendance = require('./src/models/Attendance');
const Result = require('./src/models/Result');
const ActivityLog = require('./src/models/ActivityLog');
const Permission = require('./src/models/Permission');
const { DEFAULT_PERMISSIONS } = require('./src/utils/permissions');

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const now = Date.now();
const OLD = now - 120 * DAY; // everything except the "new" items looks older than the current term

const COURSES = [
  ['Diploma in Computer Science', 'C101', 3, 'Active'],
  ['Diploma in Mechanical Engineering', 'M102', 3, 'Active'],
  ['Diploma in Electrical Engineering', 'E103', 3, 'Active'],
  ['Diploma in Civil Engineering', 'V104', 3, 'Active'],
  ['Diploma in Electronics & Comm.', 'X105', 3, 'Active'],
  ['BCA', 'B201', 3, 'Active'],
  ['BBA', 'B202', 3, 'Active'],
  ['Diploma in Chemical Engineering', 'H106', 2, 'Inactive'],
];

const STUDENT_NAMES = [
  'Aarav Sharma', 'Priya Patel', 'Rohan Mehta', 'Sneha Iyer', 'Karan Verma', 'Ananya Singh',
  'Vikram Rao', 'Ishita Gupta', 'Aditya Nair', 'Meera Joshi', 'Siddharth Kapoor', 'Riya Malhotra',
  'Arjun Desai', 'Kavya Reddy', 'Nikhil Bansal', 'Tanvi Chauhan', 'Devansh Trivedi', 'Pooja Menon',
];

// [name, department, courseCodes]
const TEACHERS = [
  ['Dr. Sanjay Kulkarni', 'Computer Science', ['C101', 'B201']],
  ['Prof. Meenal Deshpande', 'Mathematics', ['C101', 'X105']],
  ['Dr. Rajesh Pawar', 'Mechanical Engineering', ['M102']],
  ['Prof. Sunita Rao', 'Electrical Engineering', ['E103']],
  ['Dr. Amit Joshi', 'Civil Engineering', ['V104']],
  ['Prof. Neha Bhatt', 'Electronics & Communication', ['X105']],
  ['Dr. Farhan Siddiqui', 'Computer Applications', ['B201']],
  ['Prof. Lata Menon', 'Management Studies', ['B202']],
  ['Dr. Vivek Chitnis', 'Chemical Engineering', ['H106']],
  ['Prof. Pooja Naik', 'Communication Skills', ['B201', 'B202']],
  ['Dr. Harish Tandon', 'Applied Mathematics', ['M102', 'E103']],
  ['Prof. Deepak Saxena', 'Web Technologies', ['C101', 'B201']],
];

const SUBJECTS = [
  'Data Structures', 'Digital Electronics', 'Programming in C', 'Database Systems',
  'Computer Networks', 'Communication Skills', 'Applied Mathematics', 'Web Technologies',
];
const MARKS = [38, 51, 64, 77, 90, 43, 56, 69, 82, 95, 48, 61, 74, 87];
const ABSENT_IDX = [0, 4, 8, 12];

const slug = (n) => n.toLowerCase().replace(/^(dr|prof)\.\s*/, '').replace(/\s+/g, '.');

async function seedDatabase() {
  console.log('Clearing existing data...');
  await Promise.all([User, Course, Student, Teacher, Attendance, Result, ActivityLog, Permission].map((m) => m.deleteMany({})));
  await Promise.all([User, Course, Student, Teacher, Attendance, Result, ActivityLog, Permission].map((m) => m.syncIndexes()));

  // Permissions
  await Permission.insertMany(Object.entries(DEFAULT_PERMISSIONS).map(([role, matrix]) => ({ role, matrix })));

  // Courses (H106 is the "new course" for the dashboard card)
  const courses = {};
  for (const [i, [name, code, durationYears, status]] of COURSES.entries()) {
    const createdAt = code === 'H106' ? new Date(now - 2 * DAY) : new Date(OLD + i * HOUR);
    courses[code] = await Course.create({ name, code, durationYears, status, createdAt });
  }

  // Users + Teachers
  await User.create({ name: 'Aisha Khan', email: 'admin@college.com', password: 'admin123', role: 'admin' });
  for (const [i, [name, department, codes]] of TEACHERS.entries()) {
    const demo = i === 0;
    const email = `${slug(name)}@gpc.edu`;
    const user = await User.create({
      name: demo ? 'Sanjay Kulkarni' : name,
      email: demo ? 'teacher@college.com' : email,
      password: 'teacher123',
      role: 'teacher',
    });
    await Teacher.create({
      name, email, department, status: 'Active',
      courses: codes.map((c) => courses[c]._id),
      user: user._id,
      createdAt: new Date(OLD - i * HOUR),
    });
  }

  // Students (listing order == seed order: Aarav is the newest)
  const cycle = ['C101', 'M102', 'E103', 'V104', 'X105'];
  const students = [];
  for (const [i, name] of STUDENT_NAMES.entries()) {
    const demo = i === 0;
    const email = `${slug(name)}@student.gpc.edu`;
    const code = i < 16 ? cycle[i % 5] : i === 16 ? 'B201' : 'B202';
    const user = await User.create({
      name,
      email: demo ? 'student@college.com' : email,
      password: 'student123',
      role: 'student',
    });
    students.push(
      await Student.create({
        name, email,
        course: courses[code]._id,
        semester: (i % 5) + 1,
        status: demo ? 'Inactive' : 'Active',
        user: user._id,
        createdAt: demo ? new Date(now - 2 * HOUR) : new Date(OLD - i * HOUR),
      })
    );
  }

  // Attendance: 2026-08-01 .. 2026-08-14 (16 records, as in the prototype)
  const attendance = students.slice(0, 16).map((s, i) => ({
    student: s._id,
    course: s.course,
    date: `2026-08-${String((i % 14) + 1).padStart(2, '0')}`,
    status: ABSENT_IDX.includes(i) ? 'Absent' : 'Present',
  }));
  for (const a of attendance) await Attendance.create(a); // sequential => stable insertion order

  // Results (grade + result are calculated by the model)
  for (const [i, marks] of MARKS.entries()) {
    await Result.create({ student: students[i]._id, course: students[i].course, subject: SUBJECTS[i % SUBJECTS.length], marks });
  }

  // Recent activity (newest first on the dashboard)
  const log = (type, message, ago) => ActivityLog.create({ type, message, createdAt: new Date(now - ago) });
  await log('result', 'Result updated for Aarav Sharma', 27 * HOUR);
  await log('course', 'Course "Diploma in Computer Science" created', 26 * HOUR);
  await log('teacher', 'Teacher Dr. Sanjay Kulkarni profile updated', 5 * HOUR);
  await log('student', 'New student Aarav Sharma added', 2 * HOUR);

  console.log(`Seeded: 1 admin, ${TEACHERS.length} teachers, ${students.length} students, ${COURSES.length} courses, ${attendance.length} attendance records, ${MARKS.length} results.`);
  console.log('\nDemo logins');
  console.log('  Admin   admin@college.com    / admin123');
  console.log('  Teacher teacher@college.com  / teacher123');
  console.log('  Student student@college.com  / student123');
}

module.exports = { seedDatabase };

// `npm run seed` -> wipe + seed, then exit
if (require.main === module) {
  (async () => {
    await connectDB();
    await seedDatabase();
    await mongoose.disconnect();
  })().catch(async (err) => {
    console.error('Seed failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  });
}
