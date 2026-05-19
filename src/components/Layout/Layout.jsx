import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0F172A' }}>
      {/* Desktop sidebar */}
      <div className="sidebar-wrapper" style={{ display: 'none' }}>
        <Sidebar />
      </div>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, overflowX: 'hidden' }}>
        <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '5rem' }}>
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <div className="mobile-nav-wrapper">
        <MobileNav />
      </div>

      <style>{`
        @media (min-width: 768px) {
          .sidebar-wrapper { display: flex !important; }
          .mobile-nav-wrapper { display: none !important; }
          main > div { padding-bottom: 1.5rem !important; }
        }
      `}</style>
    </div>
  );
}
