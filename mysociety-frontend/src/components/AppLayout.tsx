import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { Role } from '@/types';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '⌂', end: true },
  { to: '/residents', label: 'Residents', icon: '♙' },
  { to: '/billing', label: 'Billing', icon: '▣' },
  { to: '/payments', label: 'Payments', icon: '↔' },
  { to: '/complaints', label: 'Complaints', icon: '!' },
  { to: '/visitors', label: 'Visitors', icon: '♧' },
  { to: '/bookings', label: 'Bookings', icon: '□' },
  { to: '/audit', label: 'Audit log', icon: '≡', roles: ['ADMIN', 'COMMITTEE'] as Role[] },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = user?.name || user?.email || user?.id || 'User';
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const visibleNav = NAV.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <div
      className={`app${sidebarCollapsed ? ' app--collapsed' : ''}${mobileOpen ? ' app--drawer-open' : ''}`}
    >
      {mobileOpen ? (
        <button
          className="sidebar__scrim"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <aside className="sidebar" aria-label="Application navigation">
        <div className="brand">
          <span className="brand__mark">MS</span>
          <span className="brand__name">MySociety</span>
          <button
            className="sidebar__collapse"
            type="button"
            aria-label="Collapse navigation"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          >
            {sidebarCollapsed ? '»' : '«'}
          </button>
        </div>
        <nav aria-label="Main">
          <ul>
            {visibleNav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  title={sidebarCollapsed ? item.label : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => (isActive ? 'active' : undefined)}
                >
                  <span className="nav__icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="nav__label">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <a className="sidebar__help" href="mailto:support@mysociety.test">
          <span className="nav__icon" aria-hidden="true">
            ?
          </span>
          <span className="nav__label">Help &amp; Support</span>
        </a>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            className="topbar__menu"
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            ☰
          </button>
          <div className="topbar__society">
            <span aria-hidden="true">▥</span>
            <strong>Green Valley Apartments</strong>
            <span aria-hidden="true">⌄</span>
          </div>
          <label className="topbar__search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search residents, units, payments..."
              aria-label="Search residents, units, payments"
            />
          </label>
          <div className="topbar__actions">
            <button className="topbar__notification" type="button" aria-label="Notifications">
              ♧<span>3</span>
            </button>
            <div className="topbar__user">
              <button
                className="topbar__profile-trigger"
                type="button"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                aria-label={`Open profile menu for ${displayName}`}
                onClick={() => setProfileOpen((isOpen) => !isOpen)}
              >
                <span className="topbar__avatar" aria-hidden="true">
                  {initials}
                </span>
                <span className="topbar__identity">
                  <strong>{displayName}</strong>
                  <small>{user?.role || 'Member'}</small>
                </span>
                <span aria-hidden="true">⌄</span>
              </button>
              {profileOpen ? (
                <div className="topbar__profile-menu" role="menu">
                  <a href="#profile" role="menuitem">
                    Profile
                  </a>
                  <a href="#settings" role="menuitem">
                    Settings
                  </a>
                  <button type="button" role="menuitem" onClick={logout}>
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
