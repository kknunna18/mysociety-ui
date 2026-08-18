import { ApiError } from '@/types';

const baseUrl = (): string =>
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8080/api';

const societyId = (): string =>
  (import.meta.env.VITE_DEFAULT_SOCIETY_ID as string | undefined) ?? 'green-valley';

const TOKEN_KEY = 'mysociety.token';

export const getToken = (): string | null => window.localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => window.localStorage.setItem(TOKEN_KEY, token);
export const clearToken = (): void => window.localStorage.removeItem(TOKEN_KEY);

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Society-Id': societyId(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(response.status, message || response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
