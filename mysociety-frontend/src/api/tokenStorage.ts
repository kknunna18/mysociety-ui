const TOKEN_KEY = 'mysociety.token';

export const getToken = (): string | null => window.localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => window.localStorage.setItem(TOKEN_KEY, token);
export const clearToken = (): void => window.localStorage.removeItem(TOKEN_KEY);
