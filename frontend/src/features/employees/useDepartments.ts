import { useEffect, useState } from 'react';
import { employeeApi } from '../../api/employeeApi';

/** Department names currently in use. Failure is non-fatal: filters and suggestions just stay empty. */
export function useDepartments(): string[] {
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    employeeApi
      .listDepartments()
      .then((result) => {
        if (!cancelled) setDepartments(result);
      })
      .catch(() => {
        if (!cancelled) setDepartments([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return departments;
}
