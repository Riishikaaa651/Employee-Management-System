import type { CurrentUser } from '../types/auth';
import { toApiRequestError } from './apiRequestError';
import { httpClient } from './httpClient';

export const authApi = {
  /** Spring Security's form login expects URL-encoded fields, not JSON. */
  async login(username: string, password: string): Promise<CurrentUser> {
    try {
      const body = new URLSearchParams({ username, password });
      const response = await httpClient.post<CurrentUser>('/auth/login', body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      return response.data;
    } catch (error) {
      throw toApiRequestError(error);
    }
  },

  async logout(): Promise<void> {
    try {
      await httpClient.post('/auth/logout');
    } catch (error) {
      throw toApiRequestError(error);
    }
  },

  /** Returns null when there is no active session. */
  async fetchCurrentUser(): Promise<CurrentUser | null> {
    try {
      const response = await httpClient.get<CurrentUser>('/auth/me');
      return response.data;
    } catch (error) {
      const apiError = toApiRequestError(error);
      if (apiError.status === 401) {
        return null;
      }
      throw apiError;
    }
  },
};
