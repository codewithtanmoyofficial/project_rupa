const Permission = require('../models/Permission');
const asyncHandler = require('../utils/asyncHandler');
const { DEFAULT_PERMISSIONS } = require('../utils/permissions');

const deny = (res) => res.status(403).json({ message: 'You do not have permission to perform this action' });

// Hard role gate, e.g. authorize('admin')
exports.authorize =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user.role) ? next() : deny(res);

// Matrix for a role. Admin is always full-access and cannot be locked out.
const loadMatrix = async (role) => {
  if (role === 'admin') return DEFAULT_PERMISSIONS.admin;
  const doc = await Permission.findOne({ role }).lean();
  return doc ? doc.matrix : DEFAULT_PERMISSIONS[role];
};
exports.loadMatrix = loadMatrix;

// Permission gate driven by the editable matrix, e.g. permit('students', 'create')
exports.permit = (module, action) =>
  asyncHandler(async (req, res, next) => {
    const matrix = await loadMatrix(req.user.role);
    if (!matrix?.[module]?.[action]) return deny(res);
    req.permissions = matrix;
    next();
  });
