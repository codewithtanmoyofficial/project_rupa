// Single source of truth for sidebar items + page titles.
// `module` is the permission module whose "read" right makes the item visible.
export const NAV = [
  { to: '/dashboard', label: 'Dashboard', studentLabel: 'Dashboard' },
  { to: '/students', label: 'Students', studentLabel: 'My Profile', module: 'students' },
  { to: '/teachers', label: 'Teachers', module: 'teachers' },
  { to: '/courses', label: 'Courses', studentLabel: 'My Course', module: 'courses' },
  { to: '/attendance', label: 'Attendance', studentLabel: 'My Attendance', module: 'attendance' },
  { to: '/results', label: 'Results', studentLabel: 'My Results', module: 'results' },
];

export const ADMIN_NAV = [
  { to: '/roles', label: 'Roles' },
  { to: '/permissions', label: 'Permissions' },
];

export const labelFor = (item, role) => (role === 'student' && item.studentLabel ? item.studentLabel : item.label);

export const pageTitle = (pathname, role) => {
  const item = [...NAV, ...ADMIN_NAV].find((n) => pathname === n.to || pathname.startsWith(`${n.to}/`));
  return item ? labelFor(item, role) : 'Not found';
};
