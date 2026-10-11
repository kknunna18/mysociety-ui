const TOKEN_KEY = 'mysociety.token';
const ACTIVE_SOCIETY_KEY = 'mysociety.activeSocietyId';

// Initialize from localStorage so full page reloads preserve auth state
let accessToken: string | null = window.localStorage.getItem(TOKEN_KEY) ?? null;
let activeSocietyId: string | null = window.localStorage.getItem(ACTIVE_SOCIETY_KEY) ?? null;

export const getToken = (): string | null => accessToken;
export const setToken = (token: string): void => {
  accessToken = token;
  try { window.localStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
  try {
    // eslint-disable-next-line no-console
    console.debug('[tokenStorage] setToken called, token length:', token ? token.length : 0);
  } catch {
    // ignore
  }
};
export const clearToken = (): void => {
  accessToken = null;
  activeSocietyId = null;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(ACTIVE_SOCIETY_KEY);
  } catch {
    /* ignore */
  }
};
export const getActiveSocietyId = (): string | null => activeSocietyId;
export const setActiveSocietyId = (societyId: string): void => {
  activeSocietyId = societyId;
  try { window.localStorage.setItem(ACTIVE_SOCIETY_KEY, societyId); } catch { /* ignore */ }
};
