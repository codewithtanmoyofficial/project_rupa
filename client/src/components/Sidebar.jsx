import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ADMIN_NAV, NAV, labelFor } from '../utils/navigation.js';
import { ROLE_META, initials } from '../utils/format.js';
import Modal from './Modal.jsx';

const RBAC_NOTES = [
  ['Admin', 'Full create / read / update / delete on every module, plus Roles and Permissions.'],
  ['Teacher', 'Views students and courses. Creates and updates attendance and results only for their assigned courses.'],
  ['Student', 'Views only their own profile, course, attendance and results.'],
];

function Item({ to, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition ${
          isActive ? 'bg-brand text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      <span className="w-1.5 h-1.5 rounded-[2px] bg-current opacity-80" />
      {label}
    </NavLink>
  );
}

export default function Sidebar({ open, onClose }) {
  const { user, can, logout } = useAuth();
  const [rbacOpen, setRbacOpen] = useState(false);
  const meta = ROLE_META[user.role];

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-navy text-white flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex items-center gap-2.5 px-4 h-16 shrink-0">
          <span className="w-8 h-8 rounded-lg bg-brand grid place-items-center text-xs font-bold">GC</span>
          <span className="font-display font-bold text-sm">Greenfield Polytechnic</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {NAV.filter((n) => !n.module || can(n.module, 'read')).map((n) => (
            <Item key={n.to} to={n.to} label={labelFor(n, user.role)} onClick={onClose} />
          ))}
          {user.role === 'admin' && (
            <>
              <p className="px-3 pt-5 pb-1 text-[10px] font-semibold tracking-wider text-slate-400">ADMINISTRATION</p>
              {ADMIN_NAV.map((n) => <Item key={n.to} to={n.to} label={n.label} onClick={onClose} />)}
            </>
          )}
        </nav>

        <div className="p-3 space-y-3 shrink-0">
          <button onClick={() => setRbacOpen(true)} className="w-full text-left text-xs text-slate-300 border border-white/10 rounded-lg px-3 py-2 hover:bg-white/5">
            ⚙ How RBAC Works
          </button>
          <div className="flex items-center gap-2.5 px-1">
            <span className={`${meta.bg} w-7 h-7 rounded-full grid place-items-center text-[10px] font-bold shrink-0`}>{initials(user.name)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">{user.name}</p>
              <p className="text-[11px] text-slate-400">{meta.label}</p>
            </div>
            <button onClick={logout} title="Log out" aria-label="Log out" className="text-slate-400 hover:text-white p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
            </button>
          </div>
        </div>
      </aside>

      <Modal open={rbacOpen} title="How RBAC works" onClose={() => setRbacOpen(false)} footer={<button className="btn-primary" onClick={() => setRbacOpen(false)}>Got it</button>}>
        <p className="text-sm text-slate-600 mb-3">
          Every API request is checked on the server against your role and the permission matrix. Hiding menu items is only a convenience.
        </p>
        <ul className="space-y-3">
          {RBAC_NOTES.map(([role, text]) => (
            <li key={role} className="text-sm"><span className="font-semibold text-slate-900">{role}: </span><span className="text-slate-600">{text}</span></li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
