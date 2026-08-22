import { axiosClient } from '@/api/axiosClient';
import { api, isMockApiEnabled } from '@/api/client';
import { clearToken, getToken, setToken } from '@/api/tokenStorage';
import type { Session, User } from '@/types';

const USER_KEY = 'mysociety.user';

interface LoginResponse {
  accessToken?: string;
  token?: string;
  user: BackendUser | User;
}

interface BackendUser {
  id: string;
  email: string;
  mobileNumber?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role?: User['role'];
  societyId?: string;
  unit?: string;
  status?: string;
  entitlements?: string[];
  roles?: string[];
}

const saveUser = (user: User): void => window.localStorage.setItem(USER_KEY, JSON.stringify(user));

const normalizeUser = (user: BackendUser | User): User => {
  const displayName =
    'name' in user && user.name
      ? user.name
      : 'firstName' in user
        ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
        : user.email;

  return {
    id: user.id,
    name: displayName,
    email: user.email,
    role: user.role || 'RESIDENT',
    societyId: user.societyId || 'green-valley',
    unit: user.unit,
    mobileNumber: user.mobileNumber,
    status: user.status,
    entitlements:
      user.entitlements || ('roles' in user ? user.roles : undefined) || (user.role ? [user.role] : []),
  };
};

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
  const user = normalizeUser(response.user);
  setToken(token);
  saveUser(user);
  return { token, user };
}

export function logout(): void {
  clearToken();
  window.localStorage.removeItem(USER_KEY);
}

export const getAccessToken = getToken;

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}
