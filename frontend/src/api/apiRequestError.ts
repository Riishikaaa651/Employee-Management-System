import { isAxiosError } from 'axios';
import type { ApiErrorBody } from '../types/api';

/** The single error type the API layer throws, so UI code never inspects Axios internals. */
export class ApiRequestError extends Error {
  readonly status: number | undefined;
  readonly fieldErrors: Record<string, string>;

  constructor(message: string, status?: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

const NETWORK_ERROR_MESSAGE = 'Unable to reach the server. Check that the backend is running and try again.';

export function toApiRequestError(error: unknown): ApiRequestError {
  if (error instanceof ApiRequestError) {
    return error;
  }
  if (isAxiosError<ApiErrorBody>(error)) {
    if (!error.response) {
      return new ApiRequestError(NETWORK_ERROR_MESSAGE);
    }
    const body = error.response.data;
    const status = error.response.status;
    const message =
      typeof body === 'object' && body?.message ? body.message : `Request failed with status ${status}`;
    return new ApiRequestError(message, status, body?.fieldErrors ?? {});
  }
  return new ApiRequestError('An unexpected error occurred.');
}
