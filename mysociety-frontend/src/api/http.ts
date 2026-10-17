import { ApiError } from '@/types';
import { axiosClient } from '@/api/axiosClient';
import { clearToken, getActiveSocietyId, getToken, setActiveSocietyId, setToken } from '@/api/tokenStorage';

const societyId = (): string => getActiveSocietyId() ?? (import.meta.env.VITE_DEFAULT_SOCIETY_ID as string | undefined) ?? 'green-valley';

export { clearToken, getToken, setActiveSocietyId, setToken };

export async function request<T>(
  path: string,
  init: RequestInit & { query?: Record<string, unknown> } = {}
): Promise<T> {
  try {
    const headers: Record<string, string> = {
      'X-Society-Id': societyId(),
      ...(init.headers as Record<string, string> | undefined),
    };
    const response = await axiosClient.request<any>({
      url: path,
      method: init.method,
      data: init.body ? JSON.parse(init.body as string) : undefined,
      params: init.query,
      signal: init.signal ?? undefined,
      headers,
    });

    // Normalize Spring Page responses (common backend pattern) to the frontend Paginated<T> shape
    const raw = response.data;
    if (raw && typeof raw === 'object' && Array.isArray(raw.content)) {
      const content = raw.content as any[];
      const normalized = {
        items: content,
        total: raw.totalElements ?? raw.total ?? content.length,
        page: raw.number ?? (raw.page?.number ?? 0),
        pageSize: raw.size ?? (raw.page?.size ?? content.length),
      } as unknown as T;
      return normalized;
    }

    return response.data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const response = (error as { response?: { status?: number; data?: unknown; statusText?: string } })
      .response;
    const message =
      typeof response?.data === 'string'
        ? response.data
        : response?.data && typeof response.data === 'object' && 'message' in response.data
          ? String(response.data.message)
          : response?.data && typeof response.data === 'object' && 'detail' in response.data
            ? String((response.data as { detail: unknown }).detail)
          : response?.statusText || 'Request failed';
    throw new ApiError(response?.status || 0, message);
  }
}
