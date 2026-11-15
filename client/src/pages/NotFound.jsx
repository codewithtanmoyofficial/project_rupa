import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="card p-8 max-w-md mx-auto mt-10 text-center">
      <h2 className="text-lg font-bold text-slate-900">Page not found</h2>
      <p className="text-sm text-slate-500 mt-1">The page you’re looking for doesn’t exist.</p>
      <Link to="/dashboard" className="btn-primary mt-4">Back to dashboard</Link>
    </div>
  );
}
