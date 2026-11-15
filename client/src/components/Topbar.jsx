import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { dashboardApi } from '../services/api.js';
import { ACTIVITY_DOT, ROLE_META, initials, timeAgo } from '../utils/format.js';
import { pageTitle } from '../utils/navigation.js';

function useOutsideClose(ref, onClose) {
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && onClose();
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, onClose]);
}

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const meta = ROLE_META[user.role];
  const title = pageTitle(pathname, user.role);

  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [items, setItems] = useState([]);
  const bellRef = useRef(null);
  const userRef = useRef(null);
  useOutsideClose(bellRef, () => setBellOpen(false));
  useOutsideClose(userRef, () => setUserOpen(false));

  const toggleBell = async () => {
    const next = !bellOpen;
    setBellOpen(next);
    setUserOpen(false);
    if (next) dashboardApi.activity(5).then(setItems).catch(() => setItems([]));
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onMenu} className="lg:hidden border border-slate-200 rounded-lg w-9 h-9 grid place-items-center text-slate-600 hover:bg-slate-50" aria-label="Open menu">☰</button>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-400 leading-none">{meta.label} · {title}</p>
          <h1 className="text-base font-bold text-slate-900 truncate mt-1">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Display only: the role comes from the logged-in account, it can't be switched */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
          <span className={`${meta.dot} w-1.5 h-1.5 rounded-full`} />
          <span className="text-slate-500">Viewing as</span>
          <span className="font-semibold text-slate-800">{meta.label}</span>
        </div>

        <div className="relative" ref={bellRef}>
          <button onClick={toggleBell} className="relative w-9 h-9 grid place-items-center rounded-lg bg-amber-50 border border-amber-100" aria-label="Notifications">
            <span className="text-base">🔔</span>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
          </button>
          {bellOpen && (
            <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] card shadow-lg p-3">
              <p className="text-xs font-semibold text-slate-900 mb-2">Notifications</p>
              {items.length === 0 && <p className="text-xs text-slate-400 py-2">Nothing new right now.</p>}
              <ul className="space-y-2.5">
                {items.map((a) => (
                  <li key={a._id} className="flex gap-2">
                    <span className={`${ACTIVITY_DOT[a.type]} w-1.5 h-1.5 rounded-full mt-1.5 shrink-0`} />
                    <div><p className="text-xs font-medium text-slate-800">{a.message}</p><p className="text-[11px] text-slate-400">{timeAgo(a.createdAt)}</p></div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="relative" ref={userRef}>
          <button onClick={() => { setUserOpen(!userOpen); setBellOpen(false); }} className={`${meta.bg} w-9 h-9 rounded-full text-white text-xs font-bold grid place-items-center`} aria-label="Account menu">
            {initials(user.name)}
          </button>
          {userOpen && (
            <div className="absolute right-0 mt-2 w-56 card shadow-lg p-3">
              <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
              <button onClick={logout} className="btn-secondary w-full mt-3 !py-1.5 text-xs">Log out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
