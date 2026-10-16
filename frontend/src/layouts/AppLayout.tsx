import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/authentication/AuthContext';

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <Link to="/employees" className="brand">
            <span className="brand-mark" aria-hidden="true">
              EM
            </span>
            <span className="brand__name">Employee Management</span>
          </Link>
          <nav className="app-nav" aria-label="Main">
            <NavLink to="/employees" end className="app-nav__link">
              Employees
            </NavLink>
            <NavLink to="/employees/new" className="app-nav__link">
              Add employee
            </NavLink>
          </nav>
          <div className="app-header__user">
            <span className="app-header__username" title="Signed in user">
              {user?.username}
            </span>
            <button type="button" className="button button--secondary button--small" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? 'Signing out…' : 'Log out'}
            </button>
          </div>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
