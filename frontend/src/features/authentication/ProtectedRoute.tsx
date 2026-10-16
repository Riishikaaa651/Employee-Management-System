import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import { useAuth } from './AuthContext';

export interface LoginRedirectState {
  from?: string;
}

/** Renders child routes only for a logged-in user; otherwise redirects to /login and remembers the target. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'checking') {
    return (
      <div className="page-centered">
        <LoadingIndicator label="Checking your session…" />
      </div>
    );
  }
  if (status === 'unauthenticated') {
    const state: LoginRedirectState = { from: location.pathname + location.search };
    return <Navigate to="/login" replace state={state} />;
  }
  return <Outlet />;
}
