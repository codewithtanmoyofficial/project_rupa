export const initials = (name = '') =>
  name.replace(/^(dr|prof)\.?\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export const ROLE_META = {
  admin: { label: 'Admin', short: 'AD', bg: 'bg-violet-600', dot: 'bg-violet-500' },
  teacher: { label: 'Teacher', short: 'TC', bg: 'bg-blue-600', dot: 'bg-blue-500' },
  student: { label: 'Student', short: 'ST', bg: 'bg-emerald-600', dot: 'bg-emerald-500' },
};

export const durationLabel = (y) => `${y} Year${y === 1 ? '' : 's'}`;

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const timeAgo = (iso) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  if (hrs < 48) return 'Yesterday';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const ACTIVITY_DOT = {
  student: 'bg-blue-500',
  teacher: 'bg-violet-500',
  course: 'bg-emerald-500',
  result: 'bg-orange-500',
  attendance: 'bg-sky-500',
  role: 'bg-pink-500',
};
