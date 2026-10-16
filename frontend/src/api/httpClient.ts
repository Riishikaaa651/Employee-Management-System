import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api';

const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
const XSRF_HEADER_NAME = 'X-XSRF-TOKEN';
const STATE_CHANGING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

/**
 * Shared Axios instance. Sends the session cookie with every request and copies the
 * XSRF-TOKEN cookie into the X-XSRF-TOKEN header, as the backend's CSRF protection expects.
 */
export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  xsrfCookieName: XSRF_COOKIE_NAME,
  xsrfHeaderName: XSRF_HEADER_NAME,
  // The base URL is always our own backend, so the token may be sent even if it is on another port.
  withXSRFToken: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

function hasXsrfCookie(): boolean {
  return document.cookie.split(';').some((cookie) => cookie.trim().startsWith(`${XSRF_COOKIE_NAME}=`));
}

/** Asks the backend to (re)issue the XSRF-TOKEN cookie. */
export async function refreshCsrfToken(): Promise<void> {
  await axios.get(`${API_BASE_URL}/auth/csrf`, { withCredentials: true });
}

httpClient.interceptors.request.use(async (config) => {
  const method = (config.method ?? 'get').toLowerCase();
  if (STATE_CHANGING_METHODS.has(method) && !hasXsrfCookie()) {
    await refreshCsrfToken();
  }
  return config;
});

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/** Registered by AuthProvider so an expired session anywhere in the app returns the user to login. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export function notifySessionExpired(): void {
  unauthorizedHandler?.();
}

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  csrfRetried?: boolean;
}

// Login failures and the initial "who am I" probe legitimately return 401 and must not trigger a session-expired redirect.
const AUTH_ENDPOINTS_WITH_EXPECTED_401 = ['/auth/login', '/auth/me'];

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    const config = error.config as RetriableRequestConfig | undefined;
    const status = error.response?.status;
    const url = config?.url ?? '';

    // The token rotates on login/logout; fetch a fresh one and retry the request once.
    const isCsrfFailure = status === 403 && (error.response?.data?.message ?? '').includes('CSRF');
    if (isCsrfFailure && config && !config.csrfRetried) {
      config.csrfRetried = true;
      await refreshCsrfToken();
      return httpClient.request(config);
    }

    if (status === 401 && !AUTH_ENDPOINTS_WITH_EXPECTED_401.some((endpoint) => url.endsWith(endpoint))) {
      notifySessionExpired();
    }
    return Promise.reject(error);
  },
);
