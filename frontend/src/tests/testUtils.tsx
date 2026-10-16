import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from '../features/authentication/AuthContext';
import { AppRoutes } from '../routes/AppRoutes';
import type { PagedResponse } from '../types/api';
import type { Employee } from '../types/employee';

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="current-location">{location.pathname + location.search}</div>;
}

/** Renders the whole routed application (auth provider included) at the given URL. */
export function renderApp(initialPath: string) {
  const user = userEvent.setup();
  const utils = render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
      <LocationDisplay />
    </MemoryRouter>,
  );
  return { user, ...utils };
}

export function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 1,
    fullName: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    phoneNumber: '+91 98765 43210',
    department: 'Engineering',
    designation: 'Software Engineer',
    dateOfJoining: '2024-07-01',
    salary: 850000,
    employmentStatus: 'ACTIVE',
    createdAt: '2024-07-01T10:00:00Z',
    updatedAt: '2024-07-01T10:00:00Z',
    ...overrides,
  };
}

export function makePage(content: Employee[], overrides: Partial<PagedResponse<Employee>> = {}): PagedResponse<Employee> {
  const size = overrides.size ?? 10;
  const totalElements = overrides.totalElements ?? content.length;
  const totalPages = overrides.totalPages ?? Math.ceil(totalElements / size);
  const page = overrides.page ?? 0;
  return {
    content,
    page,
    size,
    totalElements,
    totalPages,
    first: page === 0,
    last: page >= totalPages - 1,
    ...overrides,
  };
}

export const ADMIN_USER = { username: 'admin', roles: ['ADMIN'] };
