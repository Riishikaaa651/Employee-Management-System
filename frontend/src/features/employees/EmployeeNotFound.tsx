import { Link } from 'react-router-dom';

export function EmployeeNotFound() {
  return (
    <div className="card empty-state">
      <h1 className="empty-state__title">Employee not found</h1>
      <p>The employee may have been deleted, or the link is incorrect.</p>
      <Link to="/employees" className="button button--primary">
        Back to employees
      </Link>
    </div>
  );
}
