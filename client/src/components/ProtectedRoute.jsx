import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Any logged-in user. Everyone else is sent to /login.
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page text-sm text-slate-500">Loading…</div>
    );
  }
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}
