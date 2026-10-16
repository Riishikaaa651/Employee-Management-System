import { EMPLOYMENT_STATUSES, type EmployeeField, type EmployeeFormValues, type EmployeePayload } from '../../types/employee';
import { todayIsoDate } from '../../utils/format';

export type EmployeeFormErrors = Partial<Record<EmployeeField, string>>;

// Kept identical to the backend rules in EmployeeRequest.java so users see the same messages either way.
export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const PHONE_NUMBER_PATTERN = /^(?=(?:\D*\d){7,15}\D*$)\+?\d+(?:[ -]\d+)*$/;
const SALARY_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const MAX_LENGTHS = {
  fullName: 100,
  email: 150,
  department: 100,
  designation: 100,
} as const;

export const EMPTY_EMPLOYEE_FORM: EmployeeFormValues = {
  fullName: '',
  email: '',
  phoneNumber: '',
  department: '',
  designation: '',
  dateOfJoining: '',
  salary: '',
  employmentStatus: 'ACTIVE',
};

function requiredText(value: string, label: string, maxLength: number): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required`;
  if (trimmed.length > maxLength) return `${label} must be at most ${maxLength} characters`;
  return undefined;
}

function isRealCalendarDate(isoDate: string): boolean {
  if (!ISO_DATE_PATTERN.test(isoDate)) return false;
  const [year, month, day] = isoDate.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validateEmployeeForm(values: EmployeeFormValues, today: string = todayIsoDate()): EmployeeFormErrors {
  const errors: EmployeeFormErrors = {};

  errors.fullName = requiredText(values.fullName, 'Full name', MAX_LENGTHS.fullName);

  errors.email = requiredText(values.email, 'Email', MAX_LENGTHS.email);
  if (!errors.email && !EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Email must be a valid email address';
  }

  if (!values.phoneNumber.trim()) {
    errors.phoneNumber = 'Phone number is required';
  } else if (!PHONE_NUMBER_PATTERN.test(values.phoneNumber.trim())) {
    errors.phoneNumber = 'Phone number must contain 7 to 15 digits and may start with +';
  }

  errors.department = requiredText(values.department, 'Department', MAX_LENGTHS.department);
  errors.designation = requiredText(values.designation, 'Designation', MAX_LENGTHS.designation);

  if (!values.dateOfJoining) {
    errors.dateOfJoining = 'Date of joining is required';
  } else if (!isRealCalendarDate(values.dateOfJoining)) {
    errors.dateOfJoining = 'Date of joining must be a valid date';
  } else if (values.dateOfJoining > today) {
    errors.dateOfJoining = 'Date of joining cannot be in the future';
  }

  const salary = values.salary.trim();
  if (!salary) {
    errors.salary = 'Salary is required';
  } else if (salary.startsWith('-')) {
    errors.salary = 'Salary cannot be negative';
  } else if (!SALARY_PATTERN.test(salary)) {
    errors.salary = 'Salary must be a number with at most 10 digits and 2 decimal places';
  }

  if (!values.employmentStatus) {
    errors.employmentStatus = 'Employment status is required';
  } else if (!EMPLOYMENT_STATUSES.includes(values.employmentStatus)) {
    errors.employmentStatus = 'Employment status must be Active or Inactive';
  }

  return Object.fromEntries(
    Object.entries(errors).filter(([, message]) => message !== undefined),
  ) as EmployeeFormErrors;
}

/** Converts validated form values into the API payload. Call only after validation passes. */
export function toEmployeePayload(values: EmployeeFormValues): EmployeePayload {
  return {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    phoneNumber: values.phoneNumber.trim(),
    department: values.department.trim(),
    designation: values.designation.trim(),
    dateOfJoining: values.dateOfJoining,
    salary: Number(values.salary.trim()),
    employmentStatus: values.employmentStatus as EmployeePayload['employmentStatus'],
  };
}
