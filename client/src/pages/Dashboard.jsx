import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { dashboardApi, getError } from '../services/api.js';
import DataTable from '../components/DataTable.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { ACTIVITY_DOT, timeAgo } from '../utils/format.js';

const ICON = {
  students: ['🎓', 'bg-blue-50'], teachers: ['👨‍🏫', 'bg-emerald-50'], courses: ['📚', 'bg-orange-50'],
  attendance: ['🗓️', 'bg-indigo-50'], results: ['📝', 'bg-orange-50'], semester: ['🗓️', 'bg-indigo-50'],
};
const TONE = { green: 'text-green-700', orange: 'text-orange-600', slate: 'text-slate-400' };

const QUICK = {
  admin: [
    { label: 'Add Student', icon: '+', to: '/students?add=1' },
    { label: 'Add Teacher', icon: '+', to: '/teachers?add=1' },
    { label: 'Add Course', icon: '+', to: '/courses?add=1' },
    { label: 'Manage Roles', icon: '🛡️', to: '/roles' },
  ],
  teacher: [
    { label: 'Mark Attendance', icon: '+', to: '/attendance?add=1' },
    { label: 'Add Result', icon: '+', to: '/results?add=1' },
    { label: 'View Students', icon: '🎓', to: '/students' },
    { label: 'View Courses', icon: '📚', to: '/courses' },
  ],
  student: [
    { label: 'My Attendance', icon: '🗓️', to: '/attendance' },
    { label: 'My Results', icon: '📝', to: '/results' },
    { label: 'My Profile', icon: '🎓', to: '/students' },
    { label: 'My Course', icon: '📚', to: '/courses' },
  ],
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  // fetched on every visit, so counts and activity are always current after any create/update/delete elsewhere
  useEffect(() => {
    dashboardApi.stats().then(setData).catch((e) => setError(getError(e).message));
  }, []);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading dashboard…</p>;

  const isStudent = user.role === 'student';
  const columns = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    { key: 'email', label: 'Email', cell: 'text-xs' },
    { key: 'course', label: 'Course', render: (r) => r.course?.name, cell: 'text-xs min-w-[8rem]' },
    { key: 'semester', label: 'Semester', cell: 'text-xs' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {data.stats.map((s) => {
          const [emoji, bg] = ICON[s.key] || ICON.students;
          return (
            <div key={s.key} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-slate-500">{s.label}</p>
                <span className={`${bg} w-8 h-8 rounded-lg grid place-items-center text-sm shrink-0`}>{emoji}</span>
              </div>
              <p className="font-display text-2xl font-extrabold text-slate-900 mt-1">{s.value}</p>
              <p className={`text-[11px] font-medium mt-0.5 ${TONE[s.tone]}`}>{s.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
        <div className="md:col-span-3">
          <DataTable
            title={isStudent ? 'My Profile' : 'Recent Students'}
            columns={columns}
            rows={data.recentStudents}
            empty="No students yet."
          />
        </div>

        <div className="md:col-span-2 space-y-4">
          {!isStudent && (
            <section className="card p-4">
              <h2 className="text-sm font-bold text-slate-900 mb-3">Recent Activity</h2>
              {data.activity.length === 0 && <p className="text-xs text-slate-400">No activity yet.</p>}
              <ul className="space-y-3">
                {data.activity.map((a) => (
                  <li key={a._id} className="flex gap-2.5">
                    <span className={`${ACTIVITY_DOT[a.type]} w-1.5 h-1.5 rounded-full mt-1.5 shrink-0`} />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{a.message}</p>
                      <p className="text-[11px] text-slate-400">{timeAgo(a.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card p-4">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {QUICK[user.role].map((q) => (
                <button key={q.label} onClick={() => navigate(q.to)} className="bg-slate-50 border border-slate-200 rounded-lg py-3 px-2 text-xs text-slate-700 hover:bg-slate-100 flex flex-col items-center gap-0.5">
                  <span className="text-base leading-none text-slate-500">{q.icon}</span>
                  {q.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
