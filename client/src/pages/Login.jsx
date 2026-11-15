import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getError } from '../services/api.js';
import { ROLE_META, initials } from '../utils/format.js';

const DEMO = [
  { name: 'Aisha Khan', role: 'admin', email: 'admin@college.com', password: 'admin123' },
  { name: 'Sanjay Kulkarni', role: 'teacher', email: 'teacher@college.com', password: 'teacher123' },
  { name: 'Aarav Sharma', role: 'student', email: 'student@college.com', password: 'student123' },
];

export default function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) return setError('Enter your email and password.');
    setBusy(true);
    setError('');
    try {
      await login(form.email.trim(), form.password, remember);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      setError(getError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <span className="inline-grid place-items-center w-12 h-12 rounded-xl bg-brand text-white font-bold font-display">GC</span>
          <h1 className="text-xl font-bold text-slate-900 mt-3">Greenfield Polytechnic</h1>
          <p className="text-sm text-slate-500">College Management System</p>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-4" noValidate>
          <div>
            <h2 className="text-base font-bold text-slate-900">Welcome back</h2>
            <p className="text-xs text-slate-500">Log in to continue to your dashboard.</p>
          </div>
          {error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2" role="alert">{error}</p>}

          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" placeholder="you@college.com" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <div className="relative">
              <input id="password" type={show ? 'text' : 'password'} className="input pr-14" placeholder="Enter your password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-3 text-xs font-semibold text-slate-500 hover:text-slate-800">
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember me
            </label>
            {/* UI only, as specified */}
            <button type="button" className="text-xs font-semibold text-brand hover:underline" onClick={() => toast.info('Password reset isn’t available yet. Please contact your administrator.')}>
              Forgot password?
            </button>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        </form>

        <div className="card p-4 mt-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">Demo accounts</p>
          <ul className="divide-y divide-slate-100">
            {DEMO.map((d) => (
              <li key={d.role} className="flex items-center gap-3 py-2">
                <span className={`${ROLE_META[d.role].bg} w-8 h-8 rounded-full grid place-items-center text-[11px] font-bold text-white shrink-0`}>{initials(d.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{d.name} <span className="text-xs font-normal text-slate-400">· {ROLE_META[d.role].label}</span></p>
                  <p className="text-xs text-slate-500 truncate">{d.email} / {d.password}</p>
                </div>
                <button type="button" className="btn-secondary !py-1 !px-2.5 text-xs" onClick={() => { setForm({ email: d.email, password: d.password }); setError(''); }}>
                  Use →
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
