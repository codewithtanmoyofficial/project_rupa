import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleRoute from './components/RoleRoute.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Students from './pages/Students.jsx';
import Teachers from './pages/Teachers.jsx';
import Courses from './pages/Courses.jsx';
import Attendance from './pages/Attendance.jsx';
import Results from './pages/Results.jsx';
import Roles from './pages/Roles.jsx';
import Permissions from './pages/Permissions.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* module routes: visible when the role's matrix grants "read" */}
          <Route element={<RoleRoute module="students" />}><Route path="/students" element={<Students />} /></Route>
          <Route element={<RoleRoute module="teachers" />}><Route path="/teachers" element={<Teachers />} /></Route>
          <Route element={<RoleRoute module="courses" />}><Route path="/courses" element={<Courses />} /></Route>
          <Route element={<RoleRoute module="attendance" />}><Route path="/attendance" element={<Attendance />} /></Route>
          <Route element={<RoleRoute module="results" />}><Route path="/results" element={<Results />} /></Route>

          {/* admin only */}
          <Route element={<RoleRoute roles={['admin']} />}>
            <Route path="/roles" element={<Roles />} />
            <Route path="/permissions" element={<Permissions />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
