import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { axiosClient } from '@/api/axiosClient';
import { clearToken, setToken } from '@/api/tokenStorage';

const responseFor = (config: InternalAxiosRequestConfig): AxiosResponse => ({
  data: { ok: true },
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
});

afterEach(() => {
  axiosClient.defaults.adapter = undefined;
  clearToken();
});

describe('axiosClient authentication', () => {
  it('adds the bearer header when a token exists', async () => {
    setToken('test-token');
    let requestConfig: InternalAxiosRequestConfig | undefined;
    const adapter: AxiosAdapter = async (config) => {
      requestConfig = config;
      return responseFor(config);
    };
    axiosClient.defaults.adapter = adapter;

    await axiosClient.get('/residents');

    expect(requestConfig?.headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('omits the bearer header when no token exists', async () => {
    let requestConfig: InternalAxiosRequestConfig | undefined;
    const adapter: AxiosAdapter = async (config) => {
      requestConfig = config;
      return responseFor(config);
    };
    axiosClient.defaults.adapter = adapter;

    await axiosClient.get('/residents');

    expect(requestConfig?.headers.get('Authorization')).toBeUndefined();
  });

  it('omits the bearer header for public endpoints', async () => {
    setToken('test-token');
    let requestConfig: InternalAxiosRequestConfig | undefined;
    const adapter: AxiosAdapter = async (config) => {
      requestConfig = config;
      return responseFor(config);
    };
    axiosClient.defaults.adapter = adapter;

    await axiosClient.post('/auth/login', {});

    expect(requestConfig?.headers.get('Authorization')).toBeUndefined();
  });

  it('omits the bearer header for the identity API login endpoint', async () => {
    setToken('test-token');
    let requestConfig: InternalAxiosRequestConfig | undefined;
    const adapter: AxiosAdapter = async (config) => {
      requestConfig = config;
      return responseFor(config);
    };
    axiosClient.defaults.adapter = adapter;

    await axiosClient.post(`${window.location.origin}/identity/api/auth/login`, {});

    expect(requestConfig?.headers.get('Authorization')).toBeUndefined();
  });

  it('adds the bearer header to identity-proxied protected endpoints', async () => {
    setToken('test-token');
    let requestConfig: InternalAxiosRequestConfig | undefined;
    const adapter: AxiosAdapter = async (config) => {
      requestConfig = config;
      return responseFor(config);
    };
    axiosClient.defaults.adapter = adapter;

    await axiosClient.get(
      `${window.location.origin}/identity/api/v1/societies/society-1/residents`
    );

    expect(requestConfig?.headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('clears the token after an authenticated 401 response', async () => {
    setToken('expired-token');
    window.history.replaceState({}, '', '/login');
    const adapter: AxiosAdapter = async (config) => {
      const response: AxiosResponse = {
        data: { message: 'Unauthorized' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
      };
      throw new AxiosError('Unauthorized', 'ERR_BAD_RESPONSE', config, undefined, response);
    };
    axiosClient.defaults.adapter = adapter;

    await expect(axiosClient.get('/residents')).rejects.toBeInstanceOf(AxiosError);

    expect(window.localStorage.getItem('mysociety.token')).toBeNull();
  });
});
