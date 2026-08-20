import { axiosClient } from '@/api/axiosClient';
import { api, isMockApiEnabled } from '@/api/client';
import { clearToken, getToken, setToken } from '@/api/tokenStorage';
import type { Session, User } from '@/types';

const USER_KEY = 'mysociety.user';

interface LoginResponse extends Partial<Session> {
  accessToken?: string;
  token?: string;
  user: User;
}

const saveUser = (user: User): void => window.localStorage.setItem(USER_KEY, JSON.stringify(user));

const apiBaseUrl = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'https://api.example.com/identity'
).replace(/\/$/, '');

const loginUrl =
  import.meta.env.MODE === 'development'
    ? `${window.location.origin}/identity/api/auth/login`
    : `${apiBaseUrl}/api/auth/login`;

export async function login(username: string, password: string): Promise<Session> {
  const response: LoginResponse = isMockApiEnabled()
    ? await api.login(username, password)
    : (await axiosClient.post<LoginResponse>(loginUrl, { username, password })).data;
  const token = response.accessToken || response.token;
  if (!token) throw new Error('Login response did not contain an access token');
  setToken(token);
  saveUser(response.user);
  return { token, user: response.user };
}

export function logout(): void {
  clearToken();
  window.localStorage.removeItem(USER_KEY);
}

export const getAccessToken = getToken;

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}
