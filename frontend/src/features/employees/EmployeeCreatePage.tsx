import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiRequestError } from '../../api/apiRequestError';
import { employeeApi } from '../../api/employeeApi';
import { Alert } from '../../components/Alert';
import type { EmployeePayload } from '../../types/employee';
import type { FlashNoticeState } from '../../utils/useFlashNotice';
import { EmployeeForm } from './EmployeeForm';
import { EMPTY_EMPLOYEE_FORM } from './employeeValidation';
import { useDepartments } from './useDepartments';

export function EmployeeCreatePage() {
  const navigate = useNavigate();
  const departments = useDepartments();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (payload: EmployeePayload) => {
    setSubmitting(true);
    setFormError(null);
    setServerFieldErrors({});
    try {
      const createdEmployee = await employeeApi.createEmployee(payload);
      const state: FlashNoticeState = { notice: `Employee "${createdEmployee.fullName}" was created.` };
      navigate(`/employees/${createdEmployee.id}`, { state });
    } catch (error) {
      if (error instanceof ApiRequestError && Object.keys(error.fieldErrors).length > 0) {
        setServerFieldErrors(error.fieldErrors);
        setFormError('Please correct the highlighted fields.');
      } else {
        setFormError(error instanceof Error ? error.message : 'Failed to create employee.');
      }
      setSubmitting(false);
    }
  };

  return (
    <section className="page page--narrow">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/employees">Employees</Link> <span aria-hidden="true">/</span> <span>Add employee</span>
      </nav>
      <header className="page-header">
        <div>
          <h1 className="page-title">Add employee</h1>
          <p className="page-subtitle">All fields are required.</p>
        </div>
      </header>
      {formError && <Alert variant="error">{formError}</Alert>}
      <div className="card">
        <EmployeeForm
          initialValues={EMPTY_EMPLOYEE_FORM}
          departmentSuggestions={departments}
          serverFieldErrors={serverFieldErrors}
          submitLabel="Create employee"
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/employees')}
        />
      </div>
    </section>
  );
}
