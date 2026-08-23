import { createContext } from 'react';
import type { ActiveSociety, AvailableSociety, LoginResponse, User } from '@/types';

export type AuthStatus = 'unauthenticated' | 'authenticating' | 'selectingSociety' | 'authenticated';

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  accessToken: string | null;
  activeSociety: ActiveSociety | null;
  availableSocieties: AvailableSociety[];
  loginContextToken: string | null;
  loginContextExpiresAt: number | null;
  login: (username: string, password: string) => Promise<LoginResponse>;
  selectSociety: (societyId: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
