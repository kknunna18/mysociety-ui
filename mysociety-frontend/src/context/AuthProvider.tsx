import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { authUnauthorizedEvent } from '@/api/axiosClient';
import { setActiveSocietyId, setToken, getToken, clearToken } from '@/api/tokenStorage';
import { login as loginUser, logout as logoutUser, selectSociety as selectSocietyRequest } from '@/services/authService';
import { AuthContext, type AuthContextValue } from '@/context/authContext';
import type { ActiveSociety, AvailableSociety, User } from '@/types';

export const USER_KEY = 'mysociety.user';

const readTestUser = (): User | null => {
  if (import.meta.env.MODE !== 'test') return null;
  try { const raw = window.localStorage.getItem(USER_KEY); return raw ? JSON.parse(raw) as User : null; } catch { return null; }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readTestUser);
  const [status, setStatus] = useState<AuthContextValue['status']>(readTestUser() ? 'authenticated' : 'unauthenticated');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [activeSociety, setActiveSociety] = useState<ActiveSociety | null>(() => {
    try {
      const raw = window.localStorage.getItem('mysociety.activeSociety');
      // Debug: log what is in localStorage at initialization
      try { console.debug('[AuthProvider] initial localStorage mysociety.activeSociety:', raw, 'origin:', window.location.origin); } catch {}
      if (raw) return JSON.parse(raw) as ActiveSociety;
    } catch (e) {
      try { console.debug('[AuthProvider] failed parsing mysociety.activeSociety', e); } catch {}
      // ignore
    }
    const testUser = readTestUser();
    return testUser ? { id: testUser.societyId, name: testUser.societyId, city: '', unitCount: 0 } : null;
  });
  const [availableSocieties, setAvailableSocieties] = useState<AvailableSociety[]>([]);
  const [loginContextToken, setLoginContextToken] = useState<string | null>(null);
  const [loginContextExpiresAt, setLoginContextExpiresAt] = useState<number | null>(null);

  useEffect(() => {
    const handleUnauthorized = () => {
      try {
        // eslint-disable-next-line no-console
        console.debug('[AuthProvider] authUnauthorizedEvent received — clearing local auth state');
      } catch {
        // ignore
      }
      logoutUser();
      setUser(null);
      setAccessToken(null);
      setActiveSociety(null);
      setStatus('unauthenticated');
    };
    window.addEventListener(authUnauthorizedEvent, handleUnauthorized);
    return () => window.removeEventListener(authUnauthorizedEvent, handleUnauthorized);
  }, []);

  // On mount, if a token exists in storage, try to rehydrate the current user/session
  useEffect(() => {
    const initFromToken = async () => {
      const token = getToken();
      if (!token) return;
      setStatus('authenticating');
      try {
        const { request } = await import('@/api/http');
        const me = await request<any>('/auth/me');
        const currentUser = me.currentUser ?? me.user ?? me;
        const selectedSociety = me.selectedSociety ?? me.activeSociety ?? null;
        const user: User = {
          id: currentUser.id ?? '',
          name: [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ') || currentUser.email || '',
          email: currentUser.email ?? '',
          role: (currentUser.roles && currentUser.roles[0]) ?? 'RESIDENT',
          societyId: selectedSociety?.id ?? currentUser.societyId ?? '',
        } as User;
        setAccessToken(token);
        setUser(user);
        setActiveSociety(selectedSociety ? { id: selectedSociety.id, name: selectedSociety.name ?? selectedSociety.code ?? selectedSociety.id, city: '', unitCount: 0 } : null);
        setActiveSocietyId(selectedSociety?.id ?? '');
        setStatus('authenticated');
        try {
          const list = await import('@/services/authService').then((m) => m.getMySocieties());
          if (list && list.length > 0) setAvailableSocieties(list.map((s) => ({ id: s.id, code: s.code, name: s.name })));
        } catch {
          // ignore
        }
        try {
          // eslint-disable-next-line no-console
          console.debug('[AuthProvider] rehydrated from token — user:', user.id, 'activeSociety:', selectedSociety?.id);
        } catch {}
      } catch (err) {
        // Token invalid or request failed — clear stored token and stay unauthenticated
        try { console.debug('[AuthProvider] rehydrate failed, clearing token', err); } catch {};
        clearToken();
        setStatus('unauthenticated');
      }
    };
    initFromToken();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setStatus('authenticating');
    try {
      const response = await loginUser(username, password);
      if (response.status === 'AUTHENTICATED') {
        setToken(response.accessToken); setAccessToken(response.accessToken); setUser(response.user); setActiveSociety(response.activeSociety); setActiveSocietyId(response.activeSociety.id); setStatus('authenticated');
        try {
          // eslint-disable-next-line no-console
          console.debug('[AuthProvider] login: AUTHENTICATED — token length:', response.accessToken ? response.accessToken.length : 0, 'activeSociety:', response.activeSociety?.id);
        } catch {}
        // Attempt to populate available societies from /auth/me/societies so the header switcher can list them
        try {
          const list = await import('@/services/authService').then((m) => m.getMySocieties());
          if (list && list.length > 0) {
            setAvailableSocieties(list.map((s) => ({ id: s.id, code: s.code, name: s.name })));
          }
        } catch (err) {
          // ignore errors fetching societies
        }
      } else {
        setUser({ id: response.user.id, name: response.user.name, email: '', role: 'RESIDENT', societyId: '' });
        setLoginContextToken(response.loginContextToken); setLoginContextExpiresAt(Date.now() + response.expiresIn * 1000); setAvailableSocieties(response.societies); setStatus('selectingSociety');
      }
      return response;
    } catch (error) { setStatus('unauthenticated'); throw error; }
  }, []);

  const selectSociety = useCallback(async (societyId: string) => {
    if (!loginContextToken || (loginContextExpiresAt !== null && Date.now() >= loginContextExpiresAt)) throw new Error('Your login session expired. Please sign in again.');
    const response = await selectSocietyRequest({ loginContextToken, societyId });
    setToken(response.accessToken); setAccessToken(response.accessToken); setUser(response.user); setActiveSociety(response.activeSociety); try { window.localStorage.setItem('mysociety.activeSociety', JSON.stringify(response.activeSociety)); } catch {} setActiveSocietyId(response.activeSociety.id); setLoginContextToken(null); setLoginContextExpiresAt(null); setAvailableSocieties([]); setStatus('authenticated');
    try {
      // eslint-disable-next-line no-console
      console.debug('[AuthProvider] selectSociety: received token length:', response.accessToken ? response.accessToken.length : 0, 'activeSociety:', response.activeSociety?.id);
    } catch {}
  }, [loginContextExpiresAt, loginContextToken]);

  const switchSociety = useCallback(async (societyId: string) => {
    // Attempt server-side switch using current authenticated session
    try {
      // eslint-disable-next-line no-console
      console.debug('[AuthProvider] switchSociety: attempting switch to', societyId);
      const response = await import('@/services/authService').then((m) => m.switchSociety(societyId));
      setToken(response.accessToken); setAccessToken(response.accessToken); setUser(response.user); setActiveSociety(response.activeSociety); try { window.localStorage.setItem('mysociety.activeSociety', JSON.stringify(response.activeSociety)); } catch {} setActiveSocietyId(response.activeSociety.id); setAvailableSocieties([]); setStatus('authenticated');
      try {
        // eslint-disable-next-line no-console
        console.debug('[AuthProvider] switchSociety: success token length:', response.accessToken ? response.accessToken.length : 0, 'activeSociety:', response.activeSociety?.id);
      } catch {}
    } catch (err) {
      // Surface error to caller
      // eslint-disable-next-line no-console
      console.debug('[AuthProvider] switchSociety: error', err);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    logoutUser();
    setUser(null); setAccessToken(null); setActiveSociety(null); setAvailableSocieties([]); setLoginContextToken(null); setLoginContextExpiresAt(null); setStatus('unauthenticated');
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ user, status, accessToken, activeSociety, availableSocieties, loginContextToken, loginContextExpiresAt, login, selectSociety, switchSociety, logout }), [user, status, accessToken, activeSociety, availableSocieties, loginContextToken, loginContextExpiresAt, login, selectSociety, switchSociety, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
