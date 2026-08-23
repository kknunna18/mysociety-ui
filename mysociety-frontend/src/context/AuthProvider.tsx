import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { authUnauthorizedEvent } from '@/api/axiosClient';
import { setActiveSocietyId, setToken } from '@/api/tokenStorage';
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
    const testUser = readTestUser();
    return testUser ? { id: testUser.societyId, name: testUser.societyId, city: '', unitCount: 0 } : null;
  });
  const [availableSocieties, setAvailableSocieties] = useState<AvailableSociety[]>([]);
  const [loginContextToken, setLoginContextToken] = useState<string | null>(null);
  const [loginContextExpiresAt, setLoginContextExpiresAt] = useState<number | null>(null);

  useEffect(() => {
    const handleUnauthorized = () => {
      logoutUser();
      setUser(null);
      setAccessToken(null);
      setActiveSociety(null);
      setStatus('unauthenticated');
    };
    window.addEventListener(authUnauthorizedEvent, handleUnauthorized);
    return () => window.removeEventListener(authUnauthorizedEvent, handleUnauthorized);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setStatus('authenticating');
    try {
      const response = await loginUser(username, password);
      if (response.status === 'AUTHENTICATED') {
        setToken(response.accessToken); setAccessToken(response.accessToken); setUser(response.user); setActiveSociety(response.activeSociety); setActiveSocietyId(response.activeSociety.id); setStatus('authenticated');
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
    setToken(response.accessToken); setAccessToken(response.accessToken); setUser(response.user); setActiveSociety(response.activeSociety); setActiveSocietyId(response.activeSociety.id); setLoginContextToken(null); setLoginContextExpiresAt(null); setAvailableSocieties([]); setStatus('authenticated');
  }, [loginContextExpiresAt, loginContextToken]);

  const logout = useCallback(() => {
    logoutUser();
    setUser(null); setAccessToken(null); setActiveSociety(null); setAvailableSocieties([]); setLoginContextToken(null); setLoginContextExpiresAt(null); setStatus('unauthenticated');
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ user, status, accessToken, activeSociety, availableSocieties, loginContextToken, loginContextExpiresAt, login, selectSociety, logout }), [user, status, accessToken, activeSociety, availableSocieties, loginContextToken, loginContextExpiresAt, login, selectSociety, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
