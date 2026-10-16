import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../features/authentication/LoginPage';
import { ProtectedRoute } from '../features/authentication/ProtectedRoute';
import { EmployeeCreatePage } from '../features/employees/EmployeeCreatePage';
import { EmployeeDetailsPage } from '../features/employees/EmployeeDetailsPage';
import { EmployeeEditPage } from '../features/employees/EmployeeEditPage';
import { EmployeeListPage } from '../features/employees/EmployeeListPage';
import { AppLayout } from '../layouts/AppLayout';

function PageNotFound() {
  return (
    <div className="card empty-state">
      <h1 className="empty-state__title">Page not found</h1>
      <p>The page you requested does not exist.</p>
      <Link to="/employees" className="button button--primary">
        Go to employees
      </Link>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/employees" replace />} />
          <Route path="/employees" element={<EmployeeListPage />} />
          <Route path="/employees/new" element={<EmployeeCreatePage />} />
          <Route path="/employees/:employeeId" element={<EmployeeDetailsPage />} />
          <Route path="/employees/:employeeId/edit" element={<EmployeeEditPage />} />
          <Route path="*" element={<PageNotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
