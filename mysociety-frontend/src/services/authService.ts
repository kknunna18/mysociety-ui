import { axiosClient } from '@/api/axiosClient';
import { api, isMockApiEnabled } from '@/api/client';
import { clearToken, getToken, setToken } from '@/api/tokenStorage';
import type { AuthenticatedLoginResponse, AvailableSociety, LoginResponse, Role, User } from '@/types';

interface BackendLoginUser {
  id: string;
  email: string;
  mobileNumber?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
}

interface BackendSociety {
  id: string;
  code?: string;
  name: string;
}

interface BackendLoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  requiresSocietySelection: boolean;
  currentUser: BackendLoginUser;
  availableSocieties: BackendSociety[];
  selectedSociety: BackendSociety | null;
  roles: string[];
  permissions: string[];
  loginContextToken?: string;
}

const apiBaseUrl = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8080/api/v1'
).replace(/\/$/, '');

const loginUrl =
  import.meta.env.MODE === 'development'
    ? `${window.location.origin}/api/auth/login`
    : `${apiBaseUrl}/auth/login`;

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = isMockApiEnabled()
    ? await api.login(username, password)
    : (await axiosClient.post<BackendLoginResponse>(loginUrl, { username, password })).data;
  if ('status' in response) {
    if (response.status === 'AUTHENTICATED') setToken(response.accessToken);
    return response;
  }

  const user: User = {
    id: response.currentUser.id,
    name: [response.currentUser.firstName, response.currentUser.lastName].filter(Boolean).join(' ') || response.currentUser.email,
    email: response.currentUser.email,
    role: toRole(response.roles[0]),
    societyId: response.selectedSociety?.id ?? '',
    mobileNumber: response.currentUser.mobileNumber,
    status: response.currentUser.status,
    entitlements: response.permissions,
  };
  if (response.requiresSocietySelection) {
    return {
      status: 'SOCIETY_SELECTION_REQUIRED',
      loginContextToken: response.loginContextToken ?? '',
      expiresIn: response.expiresIn,
      user: { id: user.id, name: user.name },
      societies: response.availableSocieties.map(toSociety),
    };
  }

  setToken(response.accessToken);
  return {
    status: 'AUTHENTICATED',
    accessToken: response.accessToken,
    tokenType: response.tokenType,
    expiresIn: response.expiresIn,
    user,
    activeSociety: toSociety(response.selectedSociety),
  };
}

const toRole = (role: string | undefined): Role => {
  const normalized = role?.toUpperCase();
  const roles: Role[] = ['ADMIN', 'COMMITTEE', 'SECURITY', 'ACCOUNTANT', 'FACILITY_MANAGER', 'VENDOR', 'PLATFORM_ADMIN'];
  return roles.includes(normalized as Role) ? (normalized as Role) : 'RESIDENT';
};

const toSociety = (society: BackendSociety | null): AvailableSociety => ({
  id: society?.id ?? '',
  code: society?.code,
  name: society?.name ?? 'Selected society',
});

export async function selectSociety(request: { loginContextToken: string; societyId: string }): Promise<AuthenticatedLoginResponse> {
  const response = isMockApiEnabled() ? await api.selectSociety(request) : (await axiosClient.post<AuthenticatedLoginResponse>('/auth/select-society', request)).data;
  setToken(response.accessToken);
  return response;
}

export function logout(): void {
  clearToken();
  window.localStorage.removeItem('mysociety.user');
}

export const getAccessToken = getToken;

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}
