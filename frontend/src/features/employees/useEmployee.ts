import { useEffect, useState } from 'react';
import { ApiRequestError } from '../../api/apiRequestError';
import { employeeApi } from '../../api/employeeApi';
import type { Employee } from '../../types/employee';

export type EmployeeLoadState =
  | { kind: 'loading' }
  | { kind: 'loaded'; employee: Employee }
  | { kind: 'not-found' }
  | { kind: 'error'; message: string };

/** Parses the :employeeId route segment; anything other than a positive integer is treated as not found. */
export function parseEmployeeId(rawId: string | undefined): number | null {
  if (!rawId || !/^\d+$/.test(rawId)) return null;
  const employeeId = Number(rawId);
  return Number.isSafeInteger(employeeId) && employeeId > 0 ? employeeId : null;
}

export function useEmployee(rawId: string | undefined): EmployeeLoadState {
  const employeeId = parseEmployeeId(rawId);
  const [state, setState] = useState<EmployeeLoadState>(employeeId === null ? { kind: 'not-found' } : { kind: 'loading' });

  useEffect(() => {
    if (employeeId === null) {
      setState({ kind: 'not-found' });
      return;
    }
    let cancelled = false;
    setState({ kind: 'loading' });
    employeeApi
      .getEmployee(employeeId)
      .then((employee) => {
        if (!cancelled) setState({ kind: 'loaded', employee });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiRequestError && error.isNotFound) {
          setState({ kind: 'not-found' });
        } else {
          setState({ kind: 'error', message: error instanceof Error ? error.message : 'Failed to load employee.' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  return state;
}
