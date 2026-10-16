import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../api/apiRequestError';
import { authApi } from '../api/authApi';
import { employeeApi } from '../api/employeeApi';
import type { PagedResponse } from '../types/api';
import type { Employee } from '../types/employee';
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

const priya = makeEmployee();
const rahul = makeEmployee({
  id: 2,
  fullName: 'Rahul Verma',
  email: 'rahul.verma@example.com',
  department: 'Finance',
  designation: 'Accountant',
  employmentStatus: 'INACTIVE',
});

function lastListQuery() {
  const calls = vi.mocked(employeeApi.listEmployees).mock.calls;
  return calls[calls.length - 1]?.[0];
}

describe('EmployeeListPage', () => {
  beforeEach(() => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ADMIN_USER);
    vi.mocked(employeeApi.listDepartments).mockResolvedValue(['Engineering', 'Finance']);
    vi.mocked(employeeApi.listEmployees).mockResolvedValue(makePage([priya, rahul]));
  });

  it('shows a loading indicator and then renders employees from the API', async () => {
    let resolveList: (page: PagedResponse<Employee>) => void = () => undefined;
    vi.mocked(employeeApi.listEmployees).mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      }),
    );

    renderApp('/employees');

    expect(await screen.findByText('Loading employees…')).toBeInTheDocument();
    resolveList(makePage([priya, rahul]));

    const table = await screen.findByRole('table', { name: 'Employees' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3); // header + 2 employees
    expect(within(rows[1]!).getByRole('link', { name: 'Priya Sharma' })).toHaveAttribute('href', '/employees/1');
    expect(within(rows[1]!).getByText('priya.sharma@example.com')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Active')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('Showing 1–2 of 2 employees')).toBeInTheDocument();
    expect(lastListQuery()).toMatchObject({ page: 0, size: 10, sortBy: 'id', sortDirection: 'asc' });
  });

  it('shows an empty state when there are no employees', async () => {
    vi.mocked(employeeApi.listEmployees).mockResolvedValue(makePage([]));

    renderApp('/employees');

    expect(await screen.findByRole('heading', { name: 'No employees yet' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a "no matching employees" state when filters exclude everything', async () => {
    vi.mocked(employeeApi.listEmployees).mockResolvedValue(makePage([]));

    renderApp('/employees?search=zzz');

    expect(await screen.findByRole('heading', { name: 'No matching employees' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });

  it('debounces typing and searches by the final term from the first page', async () => {
    const { user } = renderApp('/employees?page=2');
    await screen.findByRole('table');

    await user.type(screen.getByLabelText('Search'), 'priya');

    await waitFor(() => expect(lastListQuery()).toMatchObject({ search: 'priya', page: 0 }));
    const searchedTerms = vi.mocked(employeeApi.listEmployees).mock.calls.map(([query]) => query.search);
    expect(searchedTerms).not.toContain('p');
    expect(searchedTerms).not.toContain('pri');
    expect(screen.getByTestId('current-location')).toHaveTextContent('/employees?search=priya');
  });

  it('combines department and status filters', async () => {
    const { user } = renderApp('/employees');
    await screen.findByRole('table');
    await screen.findByRole('option', { name: 'Finance' });

    await user.selectOptions(screen.getByLabelText('Department'), 'Finance');
    await user.selectOptions(screen.getByLabelText('Status'), 'INACTIVE');

    await waitFor(() => expect(lastListQuery()).toMatchObject({ department: 'Finance', status: 'INACTIVE', page: 0 }));

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(lastListQuery()).toMatchObject({ department: '', status: undefined, search: '' }));
  });

  it('moves between pages with the pagination controls', async () => {
    vi.mocked(employeeApi.listEmployees).mockImplementation(async (query) =>
      makePage([makeEmployee({ id: query.page * 10 + 1 })], { page: query.page, totalElements: 25, totalPages: 3 }),
    );
    const { user } = renderApp('/employees');
    await screen.findByText('Showing 1–1 of 25 employees');

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(lastListQuery()).toMatchObject({ page: 1 }));
    expect(await screen.findByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('button', { name: 'Page 3' }));
    await waitFor(() => expect(lastListQuery()).toMatchObject({ page: 2 }));
    expect(await screen.findByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('changes the sort order when a column header is clicked', async () => {
    const { user } = renderApp('/employees');
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: /Department/ }));
    await waitFor(() => expect(lastListQuery()).toMatchObject({ sortBy: 'department', sortDirection: 'asc' }));
    await user.click(screen.getByRole('button', { name: /Department/ }));
    await waitFor(() => expect(lastListQuery()).toMatchObject({ sortBy: 'department', sortDirection: 'desc' }));
  });

  it('asks for confirmation and only deletes after the user confirms', async () => {
    vi.mocked(employeeApi.deleteEmployee).mockResolvedValue(undefined);
    const { user } = renderApp('/employees');
    await screen.findByRole('table');
    const callsBeforeDelete = vi.mocked(employeeApi.listEmployees).mock.calls.length;

    await user.click(screen.getByRole('button', { name: 'Delete Priya Sharma' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Delete employee?' });
    expect(within(dialog).getByText('Priya Sharma')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(employeeApi.deleteEmployee).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Delete Priya Sharma' }));
    await user.click(screen.getByRole('button', { name: 'Delete employee' }));

    expect(employeeApi.deleteEmployee).toHaveBeenCalledWith(1);
    expect(await screen.findByText('Employee "Priya Sharma" was deleted.')).toBeInTheDocument();
    await waitFor(() =>
      expect(vi.mocked(employeeApi.listEmployees).mock.calls.length).toBeGreaterThan(callsBeforeDelete),
    );
  });

  it('closes the delete dialog with the Escape key', async () => {
    const { user } = renderApp('/employees');
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: 'Delete Rahul Verma' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(employeeApi.deleteEmployee).not.toHaveBeenCalled();
  });

  it('shows an error with a retry option when loading fails', async () => {
    vi.mocked(employeeApi.listEmployees)
      .mockRejectedValueOnce(new ApiRequestError('Unable to reach the server. Check that the backend is running and try again.'))
      .mockResolvedValue(makePage([priya]));
    const { user } = renderApp('/employees');

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the server');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('link', { name: 'Priya Sharma' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('reports a failed delete without removing the row', async () => {
    vi.mocked(employeeApi.deleteEmployee).mockRejectedValue(
      new ApiRequestError('An unexpected error occurred. Please try again later.', 500),
    );
    const { user } = renderApp('/employees');
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: 'Delete Priya Sharma' }));
    await user.click(screen.getByRole('button', { name: 'Delete employee' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('An unexpected error occurred');
    expect(screen.getByRole('link', { name: 'Priya Sharma' })).toBeInTheDocument();
  });
});
