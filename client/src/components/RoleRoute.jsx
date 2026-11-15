import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Restricts a route by role (`roles`) and/or by the permission matrix (`module` must have "read").
// This is a UX guard only – the API enforces the same rules on every request.
export default function RoleRoute({ roles, module }) {
  const { user, can } = useAuth();
  const roleOk = !roles || roles.includes(user.role);
  const moduleOk = !module || can(module, 'read');

  if (roleOk && moduleOk) return <Outlet />;
  return (
    <div className="card p-8 max-w-md mx-auto mt-10 text-center">
      <h2 className="text-lg font-bold text-slate-900">Access denied</h2>
      <p className="text-sm text-slate-500 mt-1">Your role ({user.role}) doesn’t have access to this page.</p>
      <Link to="/dashboard" className="btn-primary mt-4">Back to dashboard</Link>
    </div>
  );
}
