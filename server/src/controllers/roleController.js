const User = require('../models/User');
const Permission = require('../models/Permission');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activity');
const { MODULES, ACTIONS, DEFAULT_PERMISSIONS, isLocked } = require('../utils/permissions');

const ROLES = [
  { key: 'admin', name: 'Admin', description: 'Full control over students, teachers, courses, roles and permissions.' },
  { key: 'teacher', name: 'Teacher', description: 'Manages attendance and results for assigned courses; views students.' },
  { key: 'student', name: 'Student', description: 'Views own profile, courses, attendance and results only.' },
];

// GET /api/roles
exports.listRoles = asyncHandler(async (req, res) => {
  const counts = await User.aggregate([{ $group: { _id: '$role', users: { $sum: 1 } } }]);
  const byRole = Object.fromEntries(counts.map((c) => [c._id, c.users]));
  res.json(ROLES.map((r) => ({ ...r, users: byRole[r.key] || 0 })));
});

// GET /api/permissions
exports.getPermissions = asyncHandler(async (req, res) => {
  const docs = await Permission.find().lean();
  const permissions = {};
  for (const r of ROLES) {
    permissions[r.key] = r.key === 'admin' ? DEFAULT_PERMISSIONS.admin : docs.find((d) => d.role === r.key)?.matrix || DEFAULT_PERMISSIONS[r.key];
  }
  res.json({ modules: MODULES, actions: ACTIONS, permissions });
});

// PUT /api/permissions/:role   { matrix: { students: { create, read, update, delete }, ... } }
exports.updatePermissions = asyncHandler(async (req, res) => {
  const { role } = req.params;
  if (!['teacher', 'student'].includes(role)) {
    return res.status(400).json({ message: 'Admin permissions are fixed and cannot be changed' });
  }
  const incoming = req.body.matrix || {};
  const current = (await Permission.findOne({ role }))?.matrix || DEFAULT_PERMISSIONS[role];

  // Only whitelisted modules/actions are accepted; locked cells keep their current value
  const matrix = {};
  for (const m of MODULES) {
    matrix[m] = {};
    for (const a of ACTIONS) {
      matrix[m][a] = isLocked(role, m, a) ? Boolean(current?.[m]?.[a]) : Boolean(incoming?.[m]?.[a]);
    }
    // keep the matrix coherent: any write/delete right requires read
    if (!matrix[m].read) ACTIONS.forEach((a) => (matrix[m][a] = isLocked(role, m, a) ? matrix[m][a] : false));
  }

  await Permission.findOneAndUpdate({ role }, { role, matrix }, { upsert: true, new: true });
  await logActivity('role', `Permissions updated for ${role}`, req.user);
  res.json({ role, matrix });
});
