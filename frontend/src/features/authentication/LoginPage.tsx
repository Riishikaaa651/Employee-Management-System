import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ApiRequestError } from '../../api/apiRequestError';
import { Alert } from '../../components/Alert';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import { useAuth } from './AuthContext';
import type { LoginRedirectState } from './ProtectedRoute';

interface LoginFieldErrors {
  username?: string;
  password?: string;
}

export function LoginPage() {
  const { status, sessionExpired, login } = useAuth();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTarget = (location.state as LoginRedirectState | null)?.from ?? '/employees';

  if (status === 'checking') {
    return (
      <div className="page-centered">
        <LoadingIndicator label="Checking your session…" />
      </div>
    );
  }
  if (status === 'authenticated') {
    return <Navigate to={redirectTarget} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: LoginFieldErrors = {};
    if (!username.trim()) errors.username = 'Username is required';
    if (!password) errors.password = 'Password is required';
    setFieldErrors(errors);
    setFormError(null);
    if (errors.username || errors.password) return;

    setSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (error) {
      const message =
        error instanceof ApiRequestError && error.status === 401
          ? 'Invalid username or password.'
          : error instanceof Error
            ? error.message
            : 'Login failed. Please try again.';
      setFormError(message);
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__brand">
          <span className="brand-mark" aria-hidden="true">
            EM
          </span>
          <div>
            <h1 className="login-card__title">Employee Management</h1>
            <p className="login-card__subtitle">Sign in to manage employee records</p>
          </div>
        </div>

        {sessionExpired && !formError && <Alert variant="info">Your session has expired. Please sign in again.</Alert>}
        {formError && <Alert variant="error">{formError}</Alert>}

        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              aria-invalid={Boolean(fieldErrors.username)}
              aria-describedby={fieldErrors.username ? 'username-error' : undefined}
              autoFocus
            />
            {fieldErrors.username && (
              <p id="username-error" className="form-field__error">
                {fieldErrors.username}
              </p>
            )}
          </div>
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            {fieldErrors.password && (
              <p id="password-error" className="form-field__error">
                {fieldErrors.password}
              </p>
            )}
          </div>
          <button type="submit" className="button button--primary button--block" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
