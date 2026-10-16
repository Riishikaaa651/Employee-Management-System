import { act, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../api/apiRequestError';
import { authApi } from '../api/authApi';
import { employeeApi } from '../api/employeeApi';
import { notifySessionExpired } from '../api/httpClient';
import { ADMIN_USER, makeEmployee, makePage, renderApp } from './testUtils';

vi.mock('../api/authApi', () => ({
  authApi: { login: vi.fn(), logout: vi.fn(), fetchCurrentUser: vi.fn() },
}));
vi.mock('../api/employeeApi', () => ({
  employeeApi: {
    listEmployees: vi.fn(),
    listDepartments: vi.fn(),
    getEmployee: vi.fn(),
    createEmployee: vi.fn(),
    updateEmployee: vi.fn(),
    deleteEmployee: vi.fn(),
  },
}));

beforeEach(() => {
  vi.mocked(employeeApi.listDepartments).mockResolvedValue([]);
  vi.mocked(employeeApi.listEmployees).mockResolvedValue(makePage([makeEmployee()]));
});

describe('Protected routes', () => {
  it('redirects an unauthenticated visitor to the login page', async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(null);

    renderApp('/employees');

    expect(await screen.findByRole('heading', { name: 'Employee Management' })).toBeInTheDocument();
    expect(screen.getByTestId('current-location')).toHaveTextContent('/login');
    expect(employeeApi.listEmployees).not.toHaveBeenCalled();
  });

  it('restores an existing session on page load', async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ADMIN_USER);

    renderApp('/employees');

    expect(await screen.findByRole('heading', { name: 'Employees' })).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });
});

describe('Login page', () => {
  beforeEach(() => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(null);
  });

  it('requires both username and password before calling the API', async () => {
    const { user } = renderApp('/login');
    await screen.findByRole('button', { name: 'Sign in' });

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Username is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('shows an error and clears the password when credentials are rejected', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new ApiRequestError('Invalid username or password', 401));
    const { user } = renderApp('/login');
    await screen.findByRole('button', { name: 'Sign in' });

    await user.type(screen.getByLabelText('Username'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password.');
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(authApi.login).toHaveBeenCalledWith('admin', 'wrong-password');
    expect(screen.getByTestId('current-location')).toHaveTextContent('/login');
  });

  it('returns the user to the page they originally requested after logging in', async () => {
    vi.mocked(authApi.login).mockResolvedValue(ADMIN_USER);
    vi.mocked(employeeApi.getEmployee).mockResolvedValue(makeEmployee({ id: 5, fullName: 'Meera Nair' }));
    const { user } = renderApp('/employees/5');
    await screen.findByRole('button', { name: 'Sign in' });

    await user.type(screen.getByLabelText('Username'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Meera Nair' })).toBeInTheDocument();
    expect(screen.getByTestId('current-location')).toHaveTextContent('/employees/5');
  });
});

describe('Logout and session expiry', () => {
  beforeEach(() => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ADMIN_USER);
  });

  it('logs out and blocks access to protected pages afterwards', async () => {
    vi.mocked(authApi.logout).mockResolvedValue(undefined);
    const { user } = renderApp('/employees');
    await screen.findByRole('heading', { name: 'Employees' });

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(authApi.logout).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByTestId('current-location')).toHaveTextContent('/login');
  });

  it('still signs the user out locally if the logout request fails', async () => {
    vi.mocked(authApi.logout).mockRejectedValue(new ApiRequestError('Unable to reach the server.'));
    const { user } = renderApp('/employees');
    await screen.findByRole('heading', { name: 'Employees' });

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('sends the user to login with a message when the server reports an expired session', async () => {
    renderApp('/employees');
    await screen.findByRole('heading', { name: 'Employees' });

    act(() => notifySessionExpired());

    await waitFor(() => expect(screen.getByTestId('current-location')).toHaveTextContent('/login'));
    expect(screen.getByRole('status')).toHaveTextContent('Your session has expired. Please sign in again.');
  });
});
