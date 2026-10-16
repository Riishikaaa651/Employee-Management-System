export type EmploymentStatus = 'ACTIVE' | 'INACTIVE';

export const EMPLOYMENT_STATUSES: readonly EmploymentStatus[] = ['ACTIVE', 'INACTIVE'];

/** Employee as returned by the API. Dates are ISO strings; salary is a JSON number. */
export interface Employee {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  department: string;
  designation: string;
  dateOfJoining: string;
  salary: number;
  employmentStatus: EmploymentStatus;
  createdAt: string;
  updatedAt: string;
}

/** Body sent to POST /api/employees and PUT /api/employees/{id}. */
export interface EmployeePayload {
  fullName: string;
  email: string;
  phoneNumber: string;
  department: string;
  designation: string;
  dateOfJoining: string;
  salary: number;
  employmentStatus: EmploymentStatus;
}

/** Raw form state; every input is kept as a string until validation succeeds. */
export interface EmployeeFormValues {
  fullName: string;
  email: string;
  phoneNumber: string;
  department: string;
  designation: string;
  dateOfJoining: string;
  salary: string;
  employmentStatus: EmploymentStatus | '';
}

export type EmployeeField = keyof EmployeeFormValues;

export type EmployeeSortField =
  | 'id'
  | 'fullName'
  | 'email'
  | 'department'
  | 'designation'
  | 'dateOfJoining'
  | 'salary'
  | 'employmentStatus';

export type SortDirection = 'asc' | 'desc';

export interface EmployeeListQuery {
  page: number;
  size: number;
  search?: string;
  department?: string;
  status?: EmploymentStatus;
  sortBy?: EmployeeSortField;
  sortDirection?: SortDirection;
}
