import type { PagedResponse } from '../types/api';
import type { Employee, EmployeeListQuery, EmployeePayload } from '../types/employee';
import { toApiRequestError } from './apiRequestError';
import { httpClient } from './httpClient';

async function request<T>(operation: () => Promise<{ data: T }>): Promise<T> {
  try {
    const response = await operation();
    return response.data;
  } catch (error) {
    throw toApiRequestError(error);
  }
}

/** Drops empty filters so the URL only contains parameters the user actually set. */
function toQueryParams(query: EmployeeListQuery): Record<string, string | number> {
  const params: Record<string, string | number> = { page: query.page, size: query.size };
  if (query.search?.trim()) params.search = query.search.trim();
  if (query.department) params.department = query.department;
  if (query.status) params.status = query.status;
  if (query.sortBy) params.sortBy = query.sortBy;
  if (query.sortDirection) params.sortDirection = query.sortDirection;
  return params;
}

export const employeeApi = {
  listEmployees(query: EmployeeListQuery): Promise<PagedResponse<Employee>> {
    return request(() => httpClient.get<PagedResponse<Employee>>('/employees', { params: toQueryParams(query) }));
  },

  listDepartments(): Promise<string[]> {
    return request(() => httpClient.get<string[]>('/employees/departments'));
  },

  getEmployee(employeeId: number): Promise<Employee> {
    return request(() => httpClient.get<Employee>(`/employees/${employeeId}`));
  },

  createEmployee(payload: EmployeePayload): Promise<Employee> {
    return request(() => httpClient.post<Employee>('/employees', payload));
  },

  updateEmployee(employeeId: number, payload: EmployeePayload): Promise<Employee> {
    return request(() => httpClient.put<Employee>(`/employees/${employeeId}`, payload));
  },

  async deleteEmployee(employeeId: number): Promise<void> {
    await request(() => httpClient.delete<void>(`/employees/${employeeId}`));
  },
};
