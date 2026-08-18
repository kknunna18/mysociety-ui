import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '@/api/client';
import { clearToken, setToken } from '@/api/http';
import { AuthContext, type AuthContextValue } from '@/context/authContext';
import type { User } from '@/types';

const USER_KEY = 'mysociety.user';

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

  const login = useCallback(async (email: string, password: string) => {
    const session = await api.login(email, password);
    setToken(session.token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
    setUser(session.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    window.localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ user, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
