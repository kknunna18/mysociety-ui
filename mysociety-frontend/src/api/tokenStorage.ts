const TOKEN_KEY = 'mysociety.token';
let accessToken: string | null = null;
let activeSocietyId: string | null = null;

export const getToken = (): string | null => accessToken;
export const setToken = (token: string): void => { accessToken = token; };
export const clearToken = (): void => { accessToken = null; activeSocietyId = null; window.localStorage.removeItem(TOKEN_KEY); };
export const getActiveSocietyId = (): string | null => activeSocietyId;
export const setActiveSocietyId = (societyId: string): void => { activeSocietyId = societyId; };
