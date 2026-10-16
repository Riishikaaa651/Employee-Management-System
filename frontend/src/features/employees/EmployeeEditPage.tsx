import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiRequestError } from '../../api/apiRequestError';
import { employeeApi } from '../../api/employeeApi';
import { Alert } from '../../components/Alert';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import type { Employee, EmployeeFormValues, EmployeePayload } from '../../types/employee';
import type { FlashNoticeState } from '../../utils/useFlashNotice';
import { EmployeeForm } from './EmployeeForm';
import { EmployeeNotFound } from './EmployeeNotFound';
import { useDepartments } from './useDepartments';
import { useEmployee } from './useEmployee';

/** Every field is pre-filled from the stored record, so untouched fields are sent back unchanged. */
export function toFormValues(employee: Employee): EmployeeFormValues {
  return {
    fullName: employee.fullName,
    email: employee.email,
    phoneNumber: employee.phoneNumber,
    department: employee.department,
    designation: employee.designation,
    dateOfJoining: employee.dateOfJoining,
    salary: String(employee.salary),
    employmentStatus: employee.employmentStatus,
  };
}

export function EmployeeEditPage() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const loadState = useEmployee(employeeId);
  const departments = useDepartments();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});

  if (loadState.kind === 'loading') return <LoadingIndicator label="Loading employee…" />;
  if (loadState.kind === 'not-found') return <EmployeeNotFound />;
  if (loadState.kind === 'error') return <Alert variant="error">{loadState.message}</Alert>;

  const { employee } = loadState;

  const handleSubmit = async (payload: EmployeePayload) => {
    setSubmitting(true);
    setFormError(null);
    setServerFieldErrors({});
    try {
      const updatedEmployee = await employeeApi.updateEmployee(employee.id, payload);
      const state: FlashNoticeState = { notice: `Changes to "${updatedEmployee.fullName}" were saved.` };
      navigate(`/employees/${updatedEmployee.id}`, { state });
    } catch (error) {
      if (error instanceof ApiRequestError && error.isNotFound) {
        setFormError('This employee no longer exists. It may have been deleted by another user.');
      } else if (error instanceof ApiRequestError && Object.keys(error.fieldErrors).length > 0) {
        setServerFieldErrors(error.fieldErrors);
        setFormError('Please correct the highlighted fields.');
      } else {
        setFormError(error instanceof Error ? error.message : 'Failed to save changes.');
      }
      setSubmitting(false);
    }
  };

  return (
    <section className="page page--narrow">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/employees">Employees</Link> <span aria-hidden="true">/</span>{' '}
        <Link to={`/employees/${employee.id}`}>{employee.fullName}</Link> <span aria-hidden="true">/</span>{' '}
        <span>Edit</span>
      </nav>
      <header className="page-header">
        <div>
          <h1 className="page-title">Edit employee</h1>
          <p className="page-subtitle">Employee ID #{employee.id}</p>
        </div>
      </header>
      {formError && <Alert variant="error">{formError}</Alert>}
      <div className="card">
        <EmployeeForm
          key={employee.id}
          initialValues={toFormValues(employee)}
          departmentSuggestions={departments}
          serverFieldErrors={serverFieldErrors}
          submitLabel="Save changes"
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/employees/${employee.id}`)}
        />
      </div>
    </section>
  );
}
