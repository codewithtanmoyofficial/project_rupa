import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getError, rolesApi } from '../services/api.js';
import { ROLE_META } from '../utils/format.js';

export default function Roles() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    rolesApi.list().then(setRoles).catch((e) => setError(getError(e).message));
  }, []);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!roles) return <p className="text-sm text-slate-500">Loading roles…</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {roles.map((r) => (
        <div key={r.key} className="card p-4">
          <div className="flex items-center gap-2.5">
            <span className={`${ROLE_META[r.key].bg} w-8 h-8 rounded-lg grid place-items-center text-[11px] font-bold text-white`}>{ROLE_META[r.key].short}</span>
            <h2 className="text-sm font-bold text-slate-900">{r.name}</h2>
          </div>
          <p className="text-sm text-slate-500 mt-3">{r.description}</p>
          <p className="text-xs text-slate-400 mt-2">{r.users} {r.users === 1 ? 'user' : 'users'}</p>
          <button onClick={() => navigate(`/permissions?role=${r.key}`)} className="mt-3 w-full text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg py-2 hover:bg-slate-100">
            View Permissions
          </button>
        </div>
      ))}
    </div>
  );
}
