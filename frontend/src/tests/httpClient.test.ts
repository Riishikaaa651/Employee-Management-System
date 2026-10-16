import axios, { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError, toApiRequestError } from '../api/apiRequestError';
import { httpClient, setUnauthorizedHandler } from '../api/httpClient';

function respond(config: InternalAxiosRequestConfig, status: number, data: unknown): Promise<AxiosResponse> {
  const response: AxiosResponse = { data, status, statusText: String(status), headers: {}, config };
  if (status >= 400) {
    return Promise.reject(new AxiosError(`Status ${status}`, String(status), config, null, response));
  }
  return Promise.resolve(response);
}

describe('httpClient interceptors', () => {
  const originalAdapter = httpClient.defaults.adapter;
  const unauthorizedHandler = vi.fn();

  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=test-token';
    setUnauthorizedHandler(unauthorizedHandler);
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    setUnauthorizedHandler(null);
    unauthorizedHandler.mockReset();
  });

  it('notifies the app when an API call returns 401 because the session expired', async () => {
    httpClient.defaults.adapter = ((config) => respond(config, 401, { message: 'Authentication required' })) as AxiosAdapter;

    await expect(httpClient.get('/employees')).rejects.toBeInstanceOf(AxiosError);

    expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
  });

  it('does not treat a failed login or session probe as an expired session', async () => {
    httpClient.defaults.adapter = ((config) => respond(config, 401, { message: 'Invalid username or password' })) as AxiosAdapter;

    await expect(httpClient.post('/auth/login')).rejects.toBeInstanceOf(AxiosError);
    await expect(httpClient.get('/auth/me')).rejects.toBeInstanceOf(AxiosError);

    expect(unauthorizedHandler).not.toHaveBeenCalled();
  });

  it('refreshes the CSRF token and retries once when the token was rejected', async () => {
    const csrfRefresh = vi.spyOn(axios, 'get').mockResolvedValue({ status: 204 });
    let attempts = 0;
    httpClient.defaults.adapter = ((config) => {
      attempts += 1;
      return attempts === 1
        ? respond(config, 403, { message: 'Missing or invalid CSRF token. Refresh the page and try again.' })
        : respond(config, 201, { id: 1 });
    }) as AxiosAdapter;

    const response = await httpClient.post('/employees', {});

    expect(response.status).toBe(201);
    expect(attempts).toBe(2);
    expect(csrfRefresh).toHaveBeenCalledWith('/api/auth/csrf', { withCredentials: true });
  });
});

describe('toApiRequestError', () => {
  it('keeps the server message, status and field errors', () => {
    const config = { headers: {} } as InternalAxiosRequestConfig;
    const axiosError = new AxiosError('Request failed', '409', config, null, {
      data: { message: 'Duplicate', fieldErrors: { email: 'Duplicate' } },
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config,
    });

    const apiError = toApiRequestError(axiosError);

    expect(apiError).toBeInstanceOf(ApiRequestError);
    expect(apiError.message).toBe('Duplicate');
    expect(apiError.status).toBe(409);
    expect(apiError.fieldErrors).toEqual({ email: 'Duplicate' });
  });

  it('explains network failures in plain language', () => {
    const apiError = toApiRequestError(new AxiosError('Network Error', 'ERR_NETWORK'));

    expect(apiError.message).toMatch(/Unable to reach the server/);
    expect(apiError.status).toBeUndefined();
  });
});
