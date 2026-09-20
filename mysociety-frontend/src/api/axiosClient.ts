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
  baseURL: (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:8080/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

axiosClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!isPublicEndpoint(config.url)) {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !isPublicEndpoint(error.config?.url) && !redirectInProgress) {
      redirectInProgress = true;
      clearToken();
      window.dispatchEvent(new Event(authUnauthorizedEvent));
    }
    return Promise.reject(error);
  }
);
