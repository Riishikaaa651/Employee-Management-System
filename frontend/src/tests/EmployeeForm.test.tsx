import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmployeeForm } from '../features/employees/EmployeeForm';
import { EMPTY_EMPLOYEE_FORM, validateEmployeeForm } from '../features/employees/employeeValidation';
import type { EmployeeFormValues } from '../types/employee';

function renderForm(props: Partial<Parameters<typeof EmployeeForm>[0]> = {}) {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  render(
    <EmployeeForm
      initialValues={EMPTY_EMPLOYEE_FORM}
      submitLabel="Create employee"
      submitting={false}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
      {...props}
    />,
  );
  return { user, onSubmit };
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Full name/), '  Priya Sharma ');
  await user.type(screen.getByLabelText(/^Email address/), 'priya.sharma@example.com');
  await user.type(screen.getByLabelText(/^Phone number/), '+91 98765 43210');
  await user.type(screen.getByLabelText(/^Designation/), 'Software Engineer');
  await user.type(screen.getByLabelText(/^Department/), 'Engineering');
  fireEvent.change(screen.getByLabelText(/^Date of joining/), { target: { value: '2024-07-01' } });
  await user.type(screen.getByLabelText(/^Annual salary/), '850000.50');
}

describe('EmployeeForm', () => {
  it('shows a message for every required field and does not submit', async () => {
    const { user, onSubmit } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Create employee' }));

    expect(screen.getByText('Full name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Phone number is required')).toBeInTheDocument();
    expect(screen.getByText('Department is required')).toBeInTheDocument();
    expect(screen.getByText('Designation is required')).toBeInTheDocument();
    expect(screen.getByText('Date of joining is required')).toBeInTheDocument();
    expect(screen.getByText('Salary is required')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Full name/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^Full name/)).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects badly formatted email, phone, salary and future joining dates', async () => {
    const { user, onSubmit } = renderForm();
    await fillValidForm(user);
    await user.clear(screen.getByLabelText(/^Email address/));
    await user.type(screen.getByLabelText(/^Email address/), 'priya@localhost');
    await user.clear(screen.getByLabelText(/^Phone number/));
    await user.type(screen.getByLabelText(/^Phone number/), '12ab');
    await user.clear(screen.getByLabelText(/^Annual salary/));
    await user.type(screen.getByLabelText(/^Annual salary/), '-5');
    fireEvent.change(screen.getByLabelText(/^Date of joining/), { target: { value: '2999-01-01' } });

    await user.click(screen.getByRole('button', { name: 'Create employee' }));

    expect(screen.getByText('Email must be a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Phone number must contain 7 to 15 digits and may start with +')).toBeInTheDocument();
    expect(screen.getByText('Salary cannot be negative')).toBeInTheDocument();
    expect(screen.getByText('Date of joining cannot be in the future')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears an error as soon as the field is corrected after a failed submit', async () => {
    const { user } = renderForm();
    await user.click(screen.getByRole('button', { name: 'Create employee' }));
    expect(screen.getByText('Full name is required')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^Full name/), 'Priya');

    expect(screen.queryByText('Full name is required')).not.toBeInTheDocument();
  });

  it('submits trimmed values with a numeric salary when the form is valid', async () => {
    const { user, onSubmit } = renderForm();
    await fillValidForm(user);
    await user.selectOptions(screen.getByLabelText(/^Employment status/), 'INACTIVE');

    await user.click(screen.getByRole('button', { name: 'Create employee' }));

    expect(onSubmit).toHaveBeenCalledWith({
      fullName: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      phoneNumber: '+91 98765 43210',
      department: 'Engineering',
      designation: 'Software Engineer',
      dateOfJoining: '2024-07-01',
      salary: 850000.5,
      employmentStatus: 'INACTIVE',
    });
  });

  it('shows field errors returned by the server next to the matching input', () => {
    renderForm({ serverFieldErrors: { email: 'An employee with this email address already exists' } });

    expect(screen.getByText('An employee with this email address already exists')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email address/)).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('validateEmployeeForm', () => {
  const validValues: EmployeeFormValues = {
    fullName: 'Priya Sharma',
    email: 'priya@example.com',
    phoneNumber: '9876543210',
    department: 'Engineering',
    designation: 'Engineer',
    dateOfJoining: '2024-02-29',
    salary: '0',
    employmentStatus: 'ACTIVE',
  };

  it('accepts a zero salary, a leap day and a joining date of today', () => {
    expect(validateEmployeeForm(validValues, '2024-02-29')).toEqual({});
  });

  it('enforces maximum lengths and real calendar dates', () => {
    const errors = validateEmployeeForm(
      { ...validValues, fullName: 'x'.repeat(101), dateOfJoining: '2023-02-30', salary: '12.345' },
      '2026-01-01',
    );
    expect(errors.fullName).toBe('Full name must be at most 100 characters');
    expect(errors.dateOfJoining).toBe('Date of joining must be a valid date');
    expect(errors.salary).toBe('Salary must be a number with at most 10 digits and 2 decimal places');
  });

  it('requires a valid employment status', () => {
    expect(validateEmployeeForm({ ...validValues, employmentStatus: '' }, '2026-01-01').employmentStatus).toBe(
      'Employment status is required',
    );
  });
});
