import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { authUnauthorizedEvent } from '@/api/axiosClient';
import { login as loginUser, logout as logoutUser } from '@/services/authService';
import { AuthContext, type AuthContextValue } from '@/context/authContext';
import type { User } from '@/types';

export const USER_KEY = 'mysociety.user';

const readStoredUser = (): User | null => {
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);

  useEffect(() => {
    const handleUnauthorized = () => {
      window.localStorage.removeItem(USER_KEY);
      setUser(null);
    };
    window.addEventListener(authUnauthorizedEvent, handleUnauthorized);
    return () => window.removeEventListener(authUnauthorizedEvent, handleUnauthorized);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const session = await loginUser(username, password);
    setUser(session.user);
  }, []);

  const logout = useCallback(() => {
    logoutUser();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ user, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
