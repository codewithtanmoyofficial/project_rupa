import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext.jsx';
import { getError, rolesApi } from '../services/api.js';
import { ROLE_META } from '../utils/format.js';

const ROLES = ['admin', 'teacher', 'student'];
const ACTIONS = ['create', 'read', 'update', 'delete'];
const MODULE_LABEL = { students: 'Students', teachers: 'Teachers', courses: 'Courses', attendance: 'Attendance', results: 'Results', roles: 'Roles' };

// Same rules as the server (utils/permissions.js): these cells can't be changed
const isLocked = (role, module, action) => role === 'admin' || module === 'roles' || (role === 'student' && action !== 'read');

export default function Permissions() {
  const toast = useToast();
  const [params] = useSearchParams();
  const highlight = params.get('role');
  const [modules, setModules] = useState([]);
  const [matrix, setMatrix] = useState(null);
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    rolesApi.permissions()
      .then((d) => { setModules(d.modules); setMatrix(structuredClone(d.permissions)); setSaved(structuredClone(d.permissions)); })
      .catch((e) => toast.error(getError(e).message));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!matrix) return <p className="text-sm text-slate-500">Loading permissions…</p>;
  const dirty = JSON.stringify(matrix) !== JSON.stringify(saved);

  const toggle = (role, module, action, checked) =>
    setMatrix((prev) => {
      const next = structuredClone(prev);
      const cell = next[role][module];
      cell[action] = checked;
      if (action === 'read' && !checked) ACTIONS.forEach((a) => { if (!isLocked(role, module, a)) cell[a] = false; }); // no read => no other rights
      if (action !== 'read' && checked) cell.read = true;
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      const next = structuredClone(matrix);
      for (const role of ['teacher', 'student']) {
        if (JSON.stringify(matrix[role]) !== JSON.stringify(saved[role])) {
          next[role] = (await rolesApi.savePermissions(role, matrix[role])).matrix;
        }
      }
      setMatrix(next);
      setSaved(structuredClone(next));
      toast.success('Permissions saved');
    } catch (e) {
      toast.error(getError(e).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-slate-500">Control what each role can do in every module. Changes apply on the server immediately after saving.</p>
        <div className="flex gap-2">
          <button className="btn-secondary" disabled={!dirty || saving} onClick={() => setMatrix(structuredClone(saved))}>Reset</button>
          <button className="btn-primary" disabled={!dirty || saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr>
                <th rowSpan={2} className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-4 py-3 align-bottom">Module</th>
                {ROLES.map((r) => (
                  <th key={r} colSpan={4} className={`px-2 pt-3 pb-1 text-center border-l border-slate-100 ${highlight === r ? 'bg-blue-50' : ''}`}>
                    <span className={`${ROLE_META[r].bg} text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full`}>{ROLE_META[r].label}</span>
                  </th>
                ))}
              </tr>
              <tr>
                {ROLES.flatMap((r) => ACTIONS.map((a, i) => (
                  <th key={`${r}-${a}`} className={`px-2 pb-2 text-center text-[11px] font-semibold text-slate-500 capitalize ${i === 0 ? 'border-l border-slate-100' : ''} ${highlight === r ? 'bg-blue-50' : ''}`}>{a}</th>
                )))}
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => (
                <tr key={m} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{MODULE_LABEL[m]}</td>
                  {ROLES.flatMap((r) => ACTIONS.map((a, i) => {
                    const locked = isLocked(r, m, a);
                    return (
                      <td key={`${r}-${a}`} className={`text-center py-3 ${i === 0 ? 'border-l border-slate-100' : ''} ${highlight === r ? 'bg-blue-50/50' : ''}`}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
                          checked={!!matrix[r][m][a]}
                          disabled={locked}
                          title={locked ? 'Fixed by the system' : `${r}: ${a} ${m}`}
                          aria-label={`${r} can ${a} ${m}`}
                          onChange={(e) => toggle(r, m, a, e.target.checked)}
                        />
                      </td>
                    );
                  }))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 px-4 py-3 border-t border-slate-100">
          Greyed-out boxes are fixed: Admin always has full access, Roles &amp; Permissions are Admin-only, and students can only ever read their own records.
          Teachers are always limited to their assigned courses for attendance and results.
        </p>
      </div>
    </>
  );
}
