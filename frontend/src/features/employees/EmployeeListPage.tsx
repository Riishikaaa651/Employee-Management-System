import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiRequestError } from '../../api/apiRequestError';
import { employeeApi } from '../../api/employeeApi';
import { Alert } from '../../components/Alert';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import { Pagination } from '../../components/Pagination';
import { StatusBadge } from '../../components/StatusBadge';
import type { PagedResponse } from '../../types/api';
import {
  EMPLOYMENT_STATUSES,
  type Employee,
  type EmployeeListQuery,
  type EmployeeSortField,
  type EmploymentStatus,
  type SortDirection,
} from '../../types/employee';
import { formatIsoDate, formatStatus } from '../../utils/format';
import { useFlashNotice } from '../../utils/useFlashNotice';
import { useDepartments } from './useDepartments';

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];
export const SEARCH_DEBOUNCE_MS = 300;
const SORTABLE_COLUMNS: EmployeeSortField[] = ['id', 'fullName', 'department', 'designation', 'dateOfJoining', 'employmentStatus'];

/** List state lives in the URL so filters survive refreshes and can be bookmarked or shared. */
function readQueryFromUrl(params: URLSearchParams): EmployeeListQuery {
  const page = Number.parseInt(params.get('page') ?? '', 10);
  const size = Number.parseInt(params.get('size') ?? '', 10);
  const status = params.get('status') as EmploymentStatus | null;
  const sortBy = params.get('sortBy') as EmployeeSortField | null;
  const sortDirection = params.get('sortDirection');
  return {
    page: Number.isFinite(page) && page > 0 ? page : 0,
    size: (PAGE_SIZE_OPTIONS as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE,
    search: params.get('search') ?? '',
    department: params.get('department') ?? '',
    status: status && EMPLOYMENT_STATUSES.includes(status) ? status : undefined,
    sortBy: sortBy && SORTABLE_COLUMNS.includes(sortBy) ? sortBy : 'id',
    sortDirection: sortDirection === 'desc' ? 'desc' : 'asc',
  };
}

export function EmployeeListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => readQueryFromUrl(searchParams), [searchParams]);
  const departments = useDepartments();

  const [searchInput, setSearchInput] = useState(query.search ?? '');
  const [pageData, setPageData] = useState<PagedResponse<Employee> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadCounter, setReloadCounter] = useState(0);
  const [notice, setNotice] = useFlashNotice();
  const [actionError, setActionError] = useState<string | null>(null);
  const [employeePendingDeletion, setEmployeePendingDeletion] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);

  const updateQuery = useCallback(
    (changes: Partial<Record<keyof EmployeeListQuery, string | number | undefined>>, resetPage = true) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          Object.entries(changes).forEach(([key, value]) => {
            if (value === undefined || value === '') next.delete(key);
            else next.set(key, String(value));
          });
          if (resetPage) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Keep the input in sync when the URL changes from elsewhere (e.g. "Clear filters").
  useEffect(() => {
    setSearchInput(query.search ?? '');
  }, [query.search]);

  // Debounce typing so the API is queried once the user pauses, not on every keystroke.
  useEffect(() => {
    if (searchInput.trim() === (query.search ?? '').trim()) return;
    const timeoutId = window.setTimeout(() => updateQuery({ search: searchInput.trim() }), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput, query.search, updateQuery]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    employeeApi
      .listEmployees(query)
      .then((result) => {
        if (cancelled) return;
        // A delete or filter change can leave us past the last page; step back to the last real page.
        if (result.content.length === 0 && result.totalPages > 0 && query.page >= result.totalPages) {
          updateQuery({ page: result.totalPages - 1 }, false);
          return;
        }
        setPageData(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Failed to load employees.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, reloadCounter, updateQuery]);

  const handleSort = (column: EmployeeSortField) => {
    const nextDirection: SortDirection = query.sortBy === column && query.sortDirection === 'asc' ? 'desc' : 'asc';
    updateQuery({ sortBy: column, sortDirection: nextDirection });
  };

  const handleConfirmDelete = async () => {
    if (!employeePendingDeletion) return;
    setDeleting(true);
    setActionError(null);
    try {
      await employeeApi.deleteEmployee(employeePendingDeletion.id);
      setNotice(`Employee "${employeePendingDeletion.fullName}" was deleted.`);
    } catch (error) {
      const alreadyGone = error instanceof ApiRequestError && error.isNotFound;
      setActionError(
        alreadyGone
          ? 'That employee no longer exists. The list has been refreshed.'
          : error instanceof Error
            ? error.message
            : 'Failed to delete employee.',
      );
    } finally {
      setDeleting(false);
      setEmployeePendingDeletion(null);
      setReloadCounter((count) => count + 1);
    }
  };

  const closeDeleteDialog = useCallback(() => setEmployeePendingDeletion(null), []);

  const hasActiveFilters = Boolean(query.search || query.department || query.status);
  const employees = pageData?.content ?? [];
  const firstRowNumber = pageData && pageData.totalElements > 0 ? pageData.page * pageData.size + 1 : 0;
  const lastRowNumber = pageData ? pageData.page * pageData.size + employees.length : 0;

  const sortHeader = (column: EmployeeSortField, label: string) => {
    const active = query.sortBy === column;
    const ariaSort = active ? (query.sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';
    return (
      <th scope="col" aria-sort={ariaSort}>
        <button type="button" className="sort-button" onClick={() => handleSort(column)}>
          {label}
          <span className="sort-button__icon" aria-hidden="true">
            {active ? (query.sortDirection === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </button>
      </th>
    );
  };

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">Search, filter and manage employee records.</p>
        </div>
        <Link to="/employees/new" className="button button--primary">
          + Add employee
        </Link>
      </header>

      {notice && (
        <Alert variant="success" onDismiss={() => setNotice(null)}>
          {notice}
        </Alert>
      )}
      {actionError && (
        <Alert variant="error" onDismiss={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      <div className="toolbar" role="search">
        <div className="form-field toolbar__search">
          <label htmlFor="employee-search">Search</label>
          <input
            id="employee-search"
            type="search"
            placeholder="Search by name or email"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="department-filter">Department</label>
          <select
            id="department-filter"
            value={query.department ?? ''}
            onChange={(event) => updateQuery({ department: event.target.value })}
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="status-filter">Status</label>
          <select
            id="status-filter"
            value={query.status ?? ''}
            onChange={(event) => updateQuery({ status: event.target.value })}
          >
            <option value="">All statuses</option>
            {EMPLOYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            className="button button--ghost toolbar__clear"
            onClick={() => updateQuery({ search: undefined, department: undefined, status: undefined })}
          >
            Clear filters
          </button>
        )}
      </div>

      {loadError && (
        <Alert variant="error">
          {loadError}{' '}
          <button type="button" className="link-button" onClick={() => setReloadCounter((count) => count + 1)}>
            Try again
          </button>
        </Alert>
      )}

      <div className="card table-card" aria-busy={loading}>
        {loading && !pageData && <LoadingIndicator label="Loading employees…" />}

        {!loadError && pageData && employees.length === 0 && !loading && (
          <div className="empty-state">
            <h2 className="empty-state__title">{hasActiveFilters ? 'No matching employees' : 'No employees yet'}</h2>
            <p>
              {hasActiveFilters
                ? 'Try a different search term or clear the filters.'
                : 'Add your first employee to get started.'}
            </p>
            {!hasActiveFilters && (
              <Link to="/employees/new" className="button button--primary">
                Add employee
              </Link>
            )}
          </div>
        )}

        {employees.length > 0 && (
          <>
            {loading && <div className="table-card__refreshing" aria-hidden="true" />}
            <table className="data-table">
              <caption className="visually-hidden">Employees</caption>
              <thead>
                <tr>
                  {sortHeader('id', 'ID')}
                  {sortHeader('fullName', 'Employee')}
                  {sortHeader('department', 'Department')}
                  {sortHeader('designation', 'Designation')}
                  {sortHeader('dateOfJoining', 'Joined')}
                  {sortHeader('employmentStatus', 'Status')}
                  <th scope="col" className="data-table__actions-header">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td data-label="ID" className="data-table__id">
                      #{employee.id}
                    </td>
                    <td data-label="Employee">
                      <div>
                        <Link to={`/employees/${employee.id}`} className="data-table__name">
                          {employee.fullName}
                        </Link>
                        <span className="data-table__email">{employee.email}</span>
                      </div>
                    </td>
                    <td data-label="Department">{employee.department}</td>
                    <td data-label="Designation">{employee.designation}</td>
                    <td data-label="Joined">{formatIsoDate(employee.dateOfJoining)}</td>
                    <td data-label="Status">
                      <StatusBadge status={employee.employmentStatus} />
                    </td>
                    <td data-label="Actions">
                      <div className="row-actions">
                        <Link
                          to={`/employees/${employee.id}`}
                          className="button button--ghost button--small"
                          aria-label={`View ${employee.fullName}`}
                        >
                          View
                        </Link>
                        <Link
                          to={`/employees/${employee.id}/edit`}
                          className="button button--ghost button--small"
                          aria-label={`Edit ${employee.fullName}`}
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="button button--ghost-danger button--small"
                          onClick={() => setEmployeePendingDeletion(employee)}
                          aria-label={`Delete ${employee.fullName}`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {pageData && pageData.totalElements > 0 && (
        <div className="list-footer">
          <p className="list-footer__summary" aria-live="polite">
            Showing {firstRowNumber}–{lastRowNumber} of {pageData.totalElements} employees
          </p>
          <div className="form-field form-field--inline">
            <label htmlFor="page-size">Rows per page</label>
            <select id="page-size" value={query.size} onChange={(event) => updateQuery({ size: event.target.value })}>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <Pagination
            page={pageData.page}
            totalPages={pageData.totalPages}
            onPageChange={(page) => updateQuery({ page }, false)}
          />
        </div>
      )}

      <ConfirmDialog
        open={employeePendingDeletion !== null}
        title="Delete employee?"
        confirmLabel="Delete employee"
        busy={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={closeDeleteDialog}
      >
        <p>
          This permanently removes <strong>{employeePendingDeletion?.fullName}</strong> ({employeePendingDeletion?.email}).
          This action cannot be undone.
        </p>
      </ConfirmDialog>
    </section>
  );
}
