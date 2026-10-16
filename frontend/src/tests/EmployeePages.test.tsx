import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../api/apiRequestError';
import { authApi } from '../api/authApi';
import { employeeApi } from '../api/employeeApi';
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

const existingEmployee = makeEmployee({ id: 7, fullName: 'Aarav Mehta', email: 'aarav.mehta@example.com', salary: 950000 });

beforeEach(() => {
  vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ADMIN_USER);
  vi.mocked(employeeApi.listDepartments).mockResolvedValue(['Engineering', 'Finance']);
  vi.mocked(employeeApi.listEmployees).mockResolvedValue(makePage([existingEmployee]));
});

describe('Add employee page', () => {
  async function fillForm(user: ReturnType<typeof renderApp>['user']) {
    await user.type(screen.getByLabelText(/^Full name/), 'Neha Gupta');
    await user.type(screen.getByLabelText(/^Email address/), 'neha.gupta@example.com');
    await user.type(screen.getByLabelText(/^Phone number/), '9876501234');
    await user.type(screen.getByLabelText(/^Designation/), 'Data Analyst');
    await user.type(screen.getByLabelText(/^Department/), 'Finance');
    fireEvent.change(screen.getByLabelText(/^Date of joining/), { target: { value: '2025-03-10' } });
    await user.type(screen.getByLabelText(/^Annual salary/), '720000');
  }

  it('creates an employee and opens the new record with a success message', async () => {
    const created = makeEmployee({ id: 31, fullName: 'Neha Gupta', email: 'neha.gupta@example.com' });
    vi.mocked(employeeApi.createEmployee).mockResolvedValue(created);
    vi.mocked(employeeApi.getEmployee).mockResolvedValue(created);
    const { user } = renderApp('/employees/new');
    await screen.findByRole('heading', { name: 'Add employee' });

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Create employee' }));

    expect(employeeApi.createEmployee).toHaveBeenCalledWith({
      fullName: 'Neha Gupta',
      email: 'neha.gupta@example.com',
      phoneNumber: '9876501234',
      department: 'Finance',
      designation: 'Data Analyst',
      dateOfJoining: '2025-03-10',
      salary: 720000,
      employmentStatus: 'ACTIVE',
    });
    expect(await screen.findByText('Employee "Neha Gupta" was created.')).toBeInTheDocument();
    expect(screen.getByTestId('current-location')).toHaveTextContent('/employees/31');
  });

  it('shows the server duplicate-email error beside the email field', async () => {
    vi.mocked(employeeApi.createEmployee).mockRejectedValue(
      new ApiRequestError('An employee with this email address already exists', 409, {
        email: 'An employee with this email address already exists',
      }),
    );
    const { user } = renderApp('/employees/new');
    await screen.findByRole('heading', { name: 'Add employee' });

    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Create employee' }));

    expect(await screen.findByText('Please correct the highlighted fields.')).toBeInTheDocument();
    expect(screen.getByText('An employee with this email address already exists')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email address/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('current-location')).toHaveTextContent('/employees/new');
  });
});

describe('Edit employee page', () => {
  it('pre-fills every field and sends unchanged fields back untouched', async () => {
    vi.mocked(employeeApi.getEmployee).mockResolvedValue(existingEmployee);
    vi.mocked(employeeApi.updateEmployee).mockImplementation(async (id, payload) => ({ ...existingEmployee, ...payload, id }));
    const { user } = renderApp('/employees/7/edit');

    const nameInput = await screen.findByLabelText(/^Full name/);
    expect(nameInput).toHaveValue('Aarav Mehta');
    expect(screen.getByLabelText(/^Email address/)).toHaveValue('aarav.mehta@example.com');
    expect(screen.getByLabelText(/^Annual salary/)).toHaveValue(950000);
    expect(screen.getByLabelText(/^Date of joining/)).toHaveValue('2024-07-01');

    await user.clear(screen.getByLabelText(/^Designation/));
    await user.type(screen.getByLabelText(/^Designation/), 'Senior Software Engineer');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(employeeApi.updateEmployee).toHaveBeenCalledWith(7, {
      fullName: 'Aarav Mehta',
      email: 'aarav.mehta@example.com',
      phoneNumber: '+91 98765 43210',
      department: 'Engineering',
      designation: 'Senior Software Engineer',
      dateOfJoining: '2024-07-01',
      salary: 950000,
      employmentStatus: 'ACTIVE',
    });
    expect(await screen.findByText('Changes to "Aarav Mehta" were saved.')).toBeInTheDocument();
    expect(screen.getByTestId('current-location')).toHaveTextContent('/employees/7');
  });

  it('shows a not-found message for a missing employee', async () => {
    vi.mocked(employeeApi.getEmployee).mockRejectedValue(new ApiRequestError('Employee with ID 99 was not found', 404));

    renderApp('/employees/99/edit');

    expect(await screen.findByRole('heading', { name: 'Employee not found' })).toBeInTheDocument();
  });
});

describe('Employee details page', () => {
  it('displays every employee field', async () => {
    vi.mocked(employeeApi.getEmployee).mockResolvedValue(existingEmployee);

    renderApp('/employees/7');

    expect(await screen.findByRole('heading', { name: 'Aarav Mehta' })).toBeInTheDocument();
    const details = screen.getByText('Employee ID').closest('dl') as HTMLElement;
    expect(within(details).getByText('#7')).toBeInTheDocument();
    expect(within(details).getByText('aarav.mehta@example.com')).toBeInTheDocument();
    expect(within(details).getByText('+91 98765 43210')).toBeInTheDocument();
    expect(within(details).getByText('Engineering')).toBeInTheDocument();
    expect(within(details).getByText('Software Engineer')).toBeInTheDocument();
    expect(within(details).getByText('01 Jul 2024')).toBeInTheDocument();
    expect(within(details).getByText('₹9,50,000.00')).toBeInTheDocument();
    expect(within(details).getByText('Active')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/employees/7/edit');
  });

  it('treats a non-numeric ID as not found without calling the API', async () => {
    renderApp('/employees/abc');

    expect(await screen.findByRole('heading', { name: 'Employee not found' })).toBeInTheDocument();
    expect(employeeApi.getEmployee).not.toHaveBeenCalled();
  });

  it('deletes after confirmation and returns to the list with a message', async () => {
    vi.mocked(employeeApi.getEmployee).mockResolvedValue(existingEmployee);
    vi.mocked(employeeApi.deleteEmployee).mockResolvedValue(undefined);
    const { user } = renderApp('/employees/7');
    await screen.findByRole('heading', { name: 'Aarav Mehta' });

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(employeeApi.deleteEmployee).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete employee' }));

    expect(employeeApi.deleteEmployee).toHaveBeenCalledWith(7);
    expect(await screen.findByText('Employee "Aarav Mehta" was deleted.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('current-location')).toHaveTextContent(/^\/employees$/));
  });
});
