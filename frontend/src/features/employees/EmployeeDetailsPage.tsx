import { useCallback, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { employeeApi } from '../../api/employeeApi';
import { Alert } from '../../components/Alert';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import { StatusBadge } from '../../components/StatusBadge';
import { formatIsoDate, formatSalary } from '../../utils/format';
import { useFlashNotice, type FlashNoticeState } from '../../utils/useFlashNotice';
import { EmployeeNotFound } from './EmployeeNotFound';
import { useEmployee } from './useEmployee';

export function EmployeeDetailsPage() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const loadState = useEmployee(employeeId);
  const [notice, setNotice] = useFlashNotice();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const closeDeleteDialog = useCallback(() => setConfirmingDelete(false), []);

  if (loadState.kind === 'loading') return <LoadingIndicator label="Loading employee…" />;
  if (loadState.kind === 'not-found') return <EmployeeNotFound />;
  if (loadState.kind === 'error') return <Alert variant="error">{loadState.message}</Alert>;

  const { employee } = loadState;

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await employeeApi.deleteEmployee(employee.id);
      const state: FlashNoticeState = { notice: `Employee "${employee.fullName}" was deleted.` };
      navigate('/employees', { state });
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete employee.');
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  const details: Array<[string, ReactNode]> = [
    ['Employee ID', `#${employee.id}`],
    ['Full name', employee.fullName],
    ['Email address', <a href={`mailto:${employee.email}`}>{employee.email}</a>],
    ['Phone number', <a href={`tel:${employee.phoneNumber.replace(/[\s-]/g, '')}`}>{employee.phoneNumber}</a>],
    ['Department', employee.department],
    ['Designation', employee.designation],
    ['Date of joining', formatIsoDate(employee.dateOfJoining)],
    ['Annual salary', formatSalary(employee.salary)],
    ['Employment status', <StatusBadge status={employee.employmentStatus} />],
  ];

  return (
    <section className="page page--narrow">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/employees">Employees</Link> <span aria-hidden="true">/</span> <span>{employee.fullName}</span>
      </nav>

      {notice && (
        <Alert variant="success" onDismiss={() => setNotice(null)}>
          {notice}
        </Alert>
      )}
      {deleteError && <Alert variant="error">{deleteError}</Alert>}

      <header className="page-header">
        <div className="profile-heading">
          <span className="avatar" aria-hidden="true">
            {employee.fullName
              .split(/\s+/)
              .slice(0, 2)
              .map((namePart) => namePart.charAt(0).toUpperCase())
              .join('')}
          </span>
          <div>
            <h1 className="page-title">{employee.fullName}</h1>
            <p className="page-subtitle">
              {employee.designation} · {employee.department}
            </p>
          </div>
        </div>
        <div className="page-header__actions">
          <Link to={`/employees/${employee.id}/edit`} className="button button--primary">
            Edit
          </Link>
          <button type="button" className="button button--danger-outline" onClick={() => setConfirmingDelete(true)}>
            Delete
          </button>
        </div>
      </header>

      <div className="card">
        <dl className="details-list">
          {details.map(([label, value]) => (
            <div className="details-list__item" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <Link to="/employees" className="back-link">
        ← Back to employees
      </Link>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete employee?"
        confirmLabel="Delete employee"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={closeDeleteDialog}
      >
        <p>
          This permanently removes <strong>{employee.fullName}</strong> ({employee.email}). This action cannot be undone.
        </p>
      </ConfirmDialog>
    </section>
  );
}
