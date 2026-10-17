import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { clearToken, getToken } from '@/api/tokenStorage';

const publicEndpoints = ['/auth/login', '/auth/forgot-password', '/auth/reset-password', '/auth/refresh'];
let redirectInProgress = false;

export const isPublicEndpoint = (url = ''): boolean => {
  const path = new URL(url, window.location.origin).pathname.replace(/\/$/, '') || '/';
  return publicEndpoints.some((endpoint) => path.endsWith(endpoint));
};

export const authUnauthorizedEvent = 'mysociety:auth-unauthorized';
export const axiosClient = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8081/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

axiosClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!isPublicEndpoint(config.url)) {
    const token = getToken();
    if (token) config.headers.Authorization = 'Bearer ' + token;
  }
  // Debug: log select-society requests in dev to help trace auth flow
  try {
    if (config.url && config.url.includes('/auth/select-society')) {
      // eslint-disable-next-line no-console
      console.debug('[axios] Sending select-society request to', config.url, 'headers:', config.headers);
    }
  } catch (e) {
    // ignore
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => {
    try {
      if (response.config && response.config.url && response.config.url.includes('/auth/select-society')) {
        // eslint-disable-next-line no-console
        console.debug('[axios] Received select-society response', response.status, response.data);
      }
    } catch (e) {
      // ignore
    }
    return response;
  },
  (error: AxiosError) => {
    try {
      if (error.response?.status === 401 && !isPublicEndpoint(error.config?.url) && !redirectInProgress) {
        // eslint-disable-next-line no-console
        console.debug('[axios] 401 unauthorized response for', error.config?.url, 'clearing token and dispatching authUnauthorizedEvent');
        redirectInProgress = true;
        clearToken();
        window.dispatchEvent(new Event(authUnauthorizedEvent));
      }
    } catch (e) {
      // ignore
    }
    return Promise.reject(error);
  }
);

