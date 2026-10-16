import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { EmployeeField, EmployeeFormValues, EmployeePayload } from '../../types/employee';
import { todayIsoDate } from '../../utils/format';
import {
  MAX_LENGTHS,
  toEmployeePayload,
  validateEmployeeForm,
  type EmployeeFormErrors,
} from './employeeValidation';

interface EmployeeFormProps {
  initialValues: EmployeeFormValues;
  departmentSuggestions?: string[];
  /** Field errors returned by the server (e.g. duplicate email), shown next to the matching input. */
  serverFieldErrors?: Record<string, string>;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (payload: EmployeePayload) => void;
  onCancel: () => void;
}

interface FieldConfig {
  name: EmployeeField;
  label: string;
  type?: string;
  autoComplete?: string;
  maxLength?: number;
  placeholder?: string;
  hint?: string;
}

const TEXT_FIELDS: FieldConfig[] = [
  { name: 'fullName', label: 'Full name', autoComplete: 'name', maxLength: MAX_LENGTHS.fullName, placeholder: 'e.g. Priya Sharma' },
  { name: 'email', label: 'Email address', type: 'email', autoComplete: 'email', maxLength: MAX_LENGTHS.email, placeholder: 'name@company.com' },
  { name: 'phoneNumber', label: 'Phone number', type: 'tel', autoComplete: 'tel', maxLength: 20, placeholder: '+91 98765 43210', hint: '7–15 digits; spaces, hyphens and a leading + are allowed' },
  { name: 'designation', label: 'Designation', maxLength: MAX_LENGTHS.designation, placeholder: 'e.g. Software Engineer' },
];

export function EmployeeForm({
  initialValues,
  departmentSuggestions = [],
  serverFieldErrors = {},
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
}: EmployeeFormProps) {
  const [values, setValues] = useState<EmployeeFormValues>(initialValues);
  const [errors, setErrors] = useState<EmployeeFormErrors>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const today = todayIsoDate();

  // Server-side errors arrive after submit; merge them in so they appear beside the right field.
  useEffect(() => {
    if (Object.keys(serverFieldErrors).length > 0) {
      setErrors((current) => ({ ...current, ...serverFieldErrors }));
    }
  }, [serverFieldErrors]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    const nextValues = { ...values, [name]: value };
    setValues(nextValues);
    // After the first submit, re-validate as the user types so fixed errors disappear immediately.
    if (submitAttempted) {
      setErrors(validateEmployeeForm(nextValues, today));
    } else if (errors[name as EmployeeField]) {
      setErrors((current) => ({ ...current, [name]: undefined }));
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitAttempted(true);
    const validationErrors = validateEmployeeForm(values, today);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      const firstInvalidField = Object.keys(validationErrors)[0];
      document.getElementById(`employee-${firstInvalidField}`)?.focus();
      return;
    }
    onSubmit(toEmployeePayload(values));
  };

  const describedBy = (name: EmployeeField, hint?: string) =>
    [errors[name] ? `employee-${name}-error` : null, hint ? `employee-${name}-hint` : null].filter(Boolean).join(' ') ||
    undefined;

  const renderError = (name: EmployeeField) =>
    errors[name] ? (
      <p id={`employee-${name}-error`} className="form-field__error">
        {errors[name]}
      </p>
    ) : null;

  return (
    <form className="form employee-form" onSubmit={handleSubmit} noValidate aria-label="Employee details">
      <div className="form-grid">
        {TEXT_FIELDS.map((field) => (
          <div className="form-field" key={field.name}>
            <label htmlFor={`employee-${field.name}`}>
              {field.label} <span className="required-marker" aria-hidden="true">*</span>
            </label>
            <input
              id={`employee-${field.name}`}
              name={field.name}
              type={field.type ?? 'text'}
              autoComplete={field.autoComplete}
              maxLength={field.maxLength}
              placeholder={field.placeholder}
              value={values[field.name]}
              onChange={handleChange}
              aria-invalid={Boolean(errors[field.name])}
              aria-describedby={describedBy(field.name, field.hint)}
              required
            />
            {field.hint && (
              <p id={`employee-${field.name}-hint`} className="form-field__hint">
                {field.hint}
              </p>
            )}
            {renderError(field.name)}
          </div>
        ))}

        <div className="form-field">
          <label htmlFor="employee-department">
            Department <span className="required-marker" aria-hidden="true">*</span>
          </label>
          <input
            id="employee-department"
            name="department"
            list="department-suggestions"
            maxLength={MAX_LENGTHS.department}
            placeholder="e.g. Engineering"
            value={values.department}
            onChange={handleChange}
            aria-invalid={Boolean(errors.department)}
            aria-describedby={describedBy('department')}
            required
          />
          <datalist id="department-suggestions">
            {departmentSuggestions.map((department) => (
              <option key={department} value={department} />
            ))}
          </datalist>
          {renderError('department')}
        </div>

        <div className="form-field">
          <label htmlFor="employee-dateOfJoining">
            Date of joining <span className="required-marker" aria-hidden="true">*</span>
          </label>
          <input
            id="employee-dateOfJoining"
            name="dateOfJoining"
            type="date"
            max={today}
            value={values.dateOfJoining}
            onChange={handleChange}
            aria-invalid={Boolean(errors.dateOfJoining)}
            aria-describedby={describedBy('dateOfJoining')}
            required
          />
          {renderError('dateOfJoining')}
        </div>

        <div className="form-field">
          <label htmlFor="employee-salary">
            Annual salary (INR) <span className="required-marker" aria-hidden="true">*</span>
          </label>
          <input
            id="employee-salary"
            name="salary"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="e.g. 850000"
            value={values.salary}
            onChange={handleChange}
            aria-invalid={Boolean(errors.salary)}
            aria-describedby={describedBy('salary')}
            required
          />
          {renderError('salary')}
        </div>

        <div className="form-field">
          <label htmlFor="employee-employmentStatus">
            Employment status <span className="required-marker" aria-hidden="true">*</span>
          </label>
          <select
            id="employee-employmentStatus"
            name="employmentStatus"
            value={values.employmentStatus}
            onChange={handleChange}
            aria-invalid={Boolean(errors.employmentStatus)}
            aria-describedby={describedBy('employmentStatus')}
            required
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          {renderError('employmentStatus')}
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="button button--secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="button button--primary" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
