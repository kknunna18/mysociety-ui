import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isMockApiEnabled } from '@/api/client';

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/residents', label: 'Residents' },
  { to: '/billing', label: 'Billing' },
  { to: '/payments', label: 'Payments' },
  { to: '/complaints', label: 'Complaints' },
  { to: '/visitors', label: 'Visitors' },
  { to: '/bookings', label: 'Bookings' },
  { to: '/audit', label: 'Audit log' },
];

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark">MS</span>
          <span>MySociety</span>
        </div>
        <nav aria-label="Main">
          <ul>
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => (isActive ? 'active' : undefined)}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        {isMockApiEnabled() ? <p className="sidebar__note">Mock API enabled</p> : null}
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="muted">Green Valley Apartments</span>
          <div className="topbar__user">
            <span>
              {user?.name} · {user?.role}
            </span>
            <button type="button" onClick={logout}>
              Sign out
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
