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
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8081/api/v1'
).replace(/\/$/, '');

const loginUrl =
  import.meta.env.MODE === 'development'
    ? `${window.location.origin}/api/v1/auth/login`
    : `${apiBaseUrl}/auth/login`;

export async function login(username: string, password: string): Promise<LoginResponse> {
  const raw = isMockApiEnabled()
    ? await api.login(username, password)
    : (await axiosClient.post<any>(loginUrl, { username, password })).data;

  if ('status' in raw) {
    if (raw.status === 'AUTHENTICATED' && raw.accessToken) setToken(raw.accessToken);
    return raw as LoginResponse;
  }

  // Handle token-only responses (some backends return only tokens on login)
  if (raw && raw.accessToken && !raw.currentUser) {
    setToken(raw.accessToken);
    const meUrl =
      import.meta.env.MODE === 'development'
        ? `${window.location.origin}/api/v1/auth/me`
        : `${apiBaseUrl}/auth/me`;
    try {
      const me = (await axiosClient.get<any>(meUrl)).data;
      const currentUser = me.currentUser ?? me.user ?? me;
      const selectedSociety = me.selectedSociety ?? me.activeSociety ?? null;
      const user: User = {
        id: currentUser.id ?? '',
        name: [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ') || currentUser.email || '',
        email: currentUser.email ?? '',
        role: toRole(currentUser.roles),
        societyId: selectedSociety?.id ?? currentUser.societyId ?? '',
        mobileNumber: currentUser.mobileNumber,
        status: currentUser.status,
        entitlements: me.permissions ?? currentUser.permissions ?? [],
      };
      return {
        status: 'AUTHENTICATED',
        accessToken: raw.accessToken,
        tokenType: raw.tokenType ?? 'Bearer',
        expiresIn: raw.expiresIn ?? 0,
        user,
        activeSociety: toSociety(selectedSociety ?? null),
      } as AuthenticatedLoginResponse;
    } catch {
      // If we cannot fetch the current user, return a safe minimal authenticated response.
      return {
        status: 'AUTHENTICATED',
        accessToken: raw.accessToken,
        tokenType: raw.tokenType ?? 'Bearer',
        expiresIn: raw.expiresIn ?? 0,
        user: { id: '', name: '', email: '', role: 'RESIDENT', societyId: '' },
        activeSociety: toSociety(null),
      } as AuthenticatedLoginResponse;
    }
  }

  const user: User = {
    id: raw.currentUser.id,
    name: [raw.currentUser.firstName, raw.currentUser.lastName].filter(Boolean).join(' ') || raw.currentUser.email,
    email: raw.currentUser.email,
    role: toRole(raw.roles),
    societyId: raw.selectedSociety?.id ?? '',
    mobileNumber: raw.currentUser.mobileNumber,
    status: raw.currentUser.status,
    entitlements: raw.permissions,
  };
  if (raw.requiresSocietySelection) {
    return {
      status: 'SOCIETY_SELECTION_REQUIRED',
      loginContextToken: raw.loginContextToken ?? '',
      expiresIn: raw.expiresIn,
      user: { id: user.id, name: user.name },
      societies: raw.availableSocieties.map(toSociety),
    };
  }

  setToken(raw.accessToken);
  return {
    status: 'AUTHENTICATED',
    accessToken: raw.accessToken,
    tokenType: raw.tokenType,
    expiresIn: raw.expiresIn,
    user,
    activeSociety: toSociety(raw.selectedSociety),
  };
}

const ROLE_ALIASES: Record<string, Role> = {
  SOCIETY_ADMIN: 'ADMIN',
  COMMITTEE_MEMBER: 'COMMITTEE',
  SECURITY_GUARD: 'SECURITY',
  VENDOR_TECHNICIAN: 'VENDOR',
};
const ROLE_PRIORITY: Role[] = ['PLATFORM_ADMIN', 'ADMIN', 'COMMITTEE', 'ACCOUNTANT', 'FACILITY_MANAGER', 'SECURITY', 'VENDOR', 'RESIDENT'];

// Maps backend role codes to the UI role; when several are held, the most privileged one wins.
const toRole = (role: string | string[] | undefined): Role => {
  const mapped = (Array.isArray(role) ? role : [role]).map((r) => {
    const upper = r?.toUpperCase() ?? '';
    return ROLE_ALIASES[upper] ?? (upper as Role);
  });
  return ROLE_PRIORITY.find((candidate) => mapped.includes(candidate)) ?? 'RESIDENT';
};

// The backend session user carries a `roles` list; the UI works with a single `role`.
const withUiRole = (response: AuthenticatedLoginResponse): AuthenticatedLoginResponse => {
  const roles = (response.user as { roles?: string[] }).roles;
  return roles ? { ...response, user: { ...response.user, role: toRole(roles) } } : response;
};

const toSociety = (society: BackendSociety | null): AvailableSociety => ({
  id: society?.id ?? '',
  code: society?.code,
  name: society?.name ?? 'Selected society',
});

export async function selectSociety(request: { loginContextToken: string; societyId: string }): Promise<AuthenticatedLoginResponse> {
  const response = withUiRole(isMockApiEnabled() ? await api.selectSociety(request) : (await axiosClient.post<AuthenticatedLoginResponse>('/auth/select-society', request)).data);
  setToken(response.accessToken);
  return response;
}

// Switch society while already authenticated. Backend should accept a post with societyId and return a new token+activeSociety.
export async function switchSociety(societyId: string): Promise<AuthenticatedLoginResponse> {
  if (isMockApiEnabled()) {
    // mockApi.selectSociety ignores loginContextToken so pass empty
    return await api.selectSociety({ loginContextToken: '', societyId });
  }
  const response = withUiRole((await axiosClient.post<AuthenticatedLoginResponse>('/auth/select-society', { societyId })).data);
  setToken(response.accessToken);
  return response;
}

// Fetch societies the current authenticated user belongs to.
export async function getMySocieties(): Promise<BackendSociety[] | null> {
  if (isMockApiEnabled()) {
    // Return mock seed societies with minimal fields
    const seed = await import('@/mocks/data');
    return seed.societies.map((s: any) => ({ id: s.id, code: (s.name || '').toUpperCase().replace(/\s+/g, '_'), name: s.name }));
  }
  const url = import.meta.env.MODE === 'development' ? `${window.location.origin}/api/v1/auth/me/societies` : `${apiBaseUrl}/auth/me/societies`;
  try {
    const resp = (await axiosClient.get<any>(url)).data;
    return resp as BackendSociety[];
  } catch (err) {
    return null;
  }
}

export function logout(): void {
  clearToken();
  try { window.localStorage.removeItem('mysociety.user'); window.localStorage.removeItem('mysociety.activeSociety'); } catch {}
}

export const getAccessToken = getToken;

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}
