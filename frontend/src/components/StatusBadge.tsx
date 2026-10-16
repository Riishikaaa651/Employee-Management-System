import type { EmploymentStatus } from '../types/employee';
import { formatStatus } from '../utils/format';

export function StatusBadge({ status }: { status: EmploymentStatus }) {
  return (
    <span className={`status-badge status-badge--${status.toLowerCase()}`}>
      <span className="status-badge__dot" aria-hidden="true" />
      {formatStatus(status)}
    </span>
  );
}
