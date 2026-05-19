import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', icon: '🏠', label: 'Dashboard' },
  { to: '/transactions', icon: '📊', label: 'Income & Expenses' },
  { to: '/debts', icon: '💳', label: 'My Debts' },
  { to: '/emergency-fund', icon: '🛡️', label: 'Emergency Fund' },
  { to: '/goals', icon: '🎯', label: 'Financial Goals' },
  { to: '/traffic-light', icon: '🚦', label: 'Investor Traffic Light' },
  { to: '/stock-analyzer', icon: '📈', label: 'Stock Analyzer' },
  { to: '/portfolio', icon: '💼', label: 'My Portfolio' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  return (
    <aside style={{
      width: '230px',
      minWidth: '230px',
      background: '#0D1526',
      borderRight: '1px solid #1E293B',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '1.25rem 1rem 0.75rem', borderBottom: '1px solid #1E293B' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ fontSize: '1.5rem' }}>📈</span>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#10B981', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              From Zero
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              to Investor
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem 0.5rem' }}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              padding: '0.5625rem 0.75rem',
              borderRadius: '0.5rem',
              marginBottom: '0.125rem',
              textDecoration: 'none',
              fontSize: '0.8125rem',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#10B981' : '#94A3B8',
              background: isActive ? 'rgba(16,185,129,0.1)' : 'transparent',
              transition: 'all 0.15s',
              borderLeft: isActive ? '2px solid #10B981' : '2px solid transparent',
            })}
            onMouseEnter={e => {
              if (!e.currentTarget.style.background.includes('rgba(16')) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.color = '#E2E8F0';
              }
            }}
            onMouseLeave={e => {
              if (!e.currentTarget.style.background.includes('rgba(16')) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#94A3B8';
              }
            }}
          >
            <span style={{ fontSize: '1rem', minWidth: '1.25rem', textAlign: 'center' }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '0.75rem 0.75rem', borderTop: '1px solid #1E293B' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.5rem', marginBottom: '0.375rem', background: '#0F172A', borderRadius: '0.5rem' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
            {user?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.75rem', color: 'white', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{user}</div>
            <div style={{ fontSize: '0.65rem', color: '#64748B' }}>Logged in</div>
          </div>
          <button onClick={() => { if (confirm('¿Cerrar sesión?')) logout(); }} title="Logout"
            style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '0.25rem' }}>
            🚪
          </button>
        </div>
        <p style={{ margin: 0, fontSize: '0.6rem', color: '#475569', lineHeight: 1.5, textAlign: 'center' }}>
          Educational use only.<br />Not financial advice.
        </p>
      </div>
    </aside>
  );
}
