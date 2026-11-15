import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Topbar from '../components/Topbar.jsx';

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]); // close the mobile drawer after navigating

  return (
    <div className="min-h-screen bg-page">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-60 flex flex-col min-h-screen">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="flex-1 p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
