import { ApiError } from '@/types';
import { axiosClient } from '@/api/axiosClient';
import { clearToken, getToken, setToken } from '@/api/tokenStorage';

const societyId = (): string =>
  (import.meta.env.VITE_DEFAULT_SOCIETY_ID as string | undefined) ?? 'green-valley';

export { clearToken, getToken, setToken };

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    const headers: Record<string, string> = {
      'X-Society-Id': societyId(),
      ...(init.headers as Record<string, string> | undefined),
    };
    const response = await axiosClient.request<T>({
      url: path,
      method: init.method,
      data: init.body ? JSON.parse(init.body as string) : undefined,
      headers,
    });
    return response.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const response = (error as { response?: { status?: number; data?: unknown; statusText?: string } })
      .response;
    const message =
      typeof response?.data === 'string'
        ? response.data
        : response?.data && typeof response.data === 'object' && 'message' in response.data
          ? String(response.data.message)
          : response?.statusText || 'Request failed';
    throw new ApiError(response?.status || 0, message);
  }
}
