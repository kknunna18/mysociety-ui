import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { clearToken, getToken } from '@/api/tokenStorage';

const publicEndpoints = [
  '/auth/login',
  '/identity/api/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/refresh-token',
];

let redirectInProgress = false;

export const isPublicEndpoint = (url = ''): boolean => {
  const path = (() => {
    try {
      return new URL(url, window.location.origin).pathname.replace(/\/$/, '') || '/';
    } catch {
      return url.split('?')[0].replace(/\/$/, '') || '/';
    }
  })();
  return publicEndpoints.some((endpoint) => path === endpoint || path.startsWith(`${endpoint}/`));
};

const baseURL =
  import.meta.env.MODE === 'development' && import.meta.env.VITE_USE_API_PROXY !== 'false'
    ? '/api'
    : (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';

const isExternalUrl = (url: string | undefined): boolean => {
  if (!url || !/^https?:\/\//i.test(url)) return false;

  try {
    const requestUrl = new URL(url);
    const configuredBase = new URL(
      (import.meta.env.VITE_API_BASE_URL as string | undefined) || window.location.origin,
      window.location.origin
    );
    return requestUrl.origin !== configuredBase.origin;
  } catch {
    return true;
  }
};

export const authUnauthorizedEvent = 'mysociety:auth-unauthorized';

export const axiosClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

axiosClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const url = config.url || '';
  if (!isPublicEndpoint(url) && !isExternalUrl(url)) {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !isPublicEndpoint(url) && !redirectInProgress) {
      redirectInProgress = true;
      clearToken();
      window.dispatchEvent(new Event(authUnauthorizedEvent));
      if (window.location.pathname !== '/login') window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);
