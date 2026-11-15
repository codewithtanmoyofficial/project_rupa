// Default RBAC matrix. Stored in MongoDB (Permission collection) and editable by the admin.
const MODULES = ['students', 'teachers', 'courses', 'attendance', 'results', 'roles'];
const ACTIONS = ['create', 'read', 'update', 'delete'];

// spec: { module: 'cru' } -> letters of allowed actions (c, r, u, d)
const make = (spec) =>
  Object.fromEntries(
    MODULES.map((m) => [m, Object.fromEntries(ACTIONS.map((a) => [a, (spec[m] || '').includes(a[0])]))])
  );

const DEFAULT_PERMISSIONS = {
  admin: make(Object.fromEntries(MODULES.map((m) => [m, 'crud']))),
  teacher: make({ students: 'r', courses: 'r', attendance: 'cru', results: 'cru' }),
  student: make({ students: 'r', courses: 'r', attendance: 'r', results: 'r' }),
};

// Cells the admin can NOT change (enforced on the server and shown disabled in the UI)
const isLocked = (role, module, action) =>
  role === 'admin' || module === 'roles' || (role === 'student' && action !== 'read');

module.exports = { MODULES, ACTIONS, DEFAULT_PERMISSIONS, isLocked };
