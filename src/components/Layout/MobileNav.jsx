import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', icon: '🏠', label: 'Home' },
  { to: '/transactions', icon: '📊', label: 'Money' },
  { to: '/traffic-light', icon: '🚦', label: 'Status' },
  { to: '/stock-analyzer', icon: '📈', label: 'Stocks' },
  { to: '/portfolio', icon: '💼', label: 'Portfolio' },
];

export default function MobileNav() {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#0D1526',
      borderTop: '1px solid #1E293B',
      display: 'flex',
      zIndex: 50,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.625rem 0.25rem',
            textDecoration: 'none',
            color: isActive ? '#10B981' : '#64748B',
            fontSize: '0.6rem',
            fontWeight: isActive ? 600 : 400,
            gap: '0.25rem',
            transition: 'color 0.15s',
          })}
        >
          {({ isActive }) => (
            <>
              <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{item.icon}</span>
              <span style={{ color: isActive ? '#10B981' : '#64748B' }}>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
