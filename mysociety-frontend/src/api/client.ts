import { mockApi, type MockApi } from '@/mocks/mockApi';
import { request } from '@/api/http';
import type {
  AuditEntry,
  Booking,
  Complaint,
  ComplaintStatus,
  DashboardSummary,
  Facility,
  Invoice,
  Payment,
  PaymentMethod,
  Resident,
  ResidentPageResponse,
  MembershipStatus,
  MembershipType,
  LoginResponse,
  AuthenticatedLoginResponse,
  Visitor,
} from '@/types';

/** Both the mock and the HTTP implementation satisfy this contract. */
export interface GetResidentsParams {
  societyId: string;
  page: number;
  size: number;
  search?: string;
  blockId?: string;
  unitId?: string;
  membershipType?: MembershipType;
  status?: MembershipStatus;
  sort?: string;
}

export type ApiClient = Omit<MockApi, 'login' | 'selectSociety'> & {
  login: (email: string, password: string) => Promise<LoginResponse & { token?: string }>;
  getResidents: (params: GetResidentsParams, signal?: AbortSignal) => Promise<ResidentPageResponse>;
  selectSociety: (request: { loginContextToken: string; societyId: string }) => Promise<AuthenticatedLoginResponse>;
};

const httpApi: ApiClient = {
  login: (email, password) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  selectSociety: (selection) =>
    request<AuthenticatedLoginResponse>('/auth/select-society', {
      method: 'POST',
      body: JSON.stringify(selection),
    }),
  getSummary: () => request<DashboardSummary>('/dashboard/summary'),
  listResidents: (query = '') =>
    request<Resident[]>(`/residents${query ? `?q=${encodeURIComponent(query)}` : ''}`),
  getResidents: (params: GetResidentsParams, signal?: AbortSignal) => {
    const { societyId, ...query } = params;
    const requestQuery = { societyId, ...query };
    const residentsPath = `/api/v1/societies/${encodeURIComponent(societyId)}/residents`;
    const url = import.meta.env.MODE === 'development'
      ? `${window.location.origin}/identity${residentsPath}`
      : `/v1/societies/${encodeURIComponent(societyId)}/residents`;
    return request<ResidentPageResponse>(url, {
      signal,
      query: requestQuery,
    });
  },
  createResident: (input) =>
    request<Resident>('/residents', { method: 'POST', body: JSON.stringify(input) }),
  listInvoices: () => request<Invoice[]>('/invoices'),
  listPayments: () => request<Payment[]>('/payments'),
  recordPayment: (invoiceId: string, method: PaymentMethod) =>
    request<Payment>('/payments', {
      method: 'POST',
      body: JSON.stringify({ invoiceId, method }),
    }),
  listComplaints: () => request<Complaint[]>('/complaints'),
  createComplaint: (input) =>
    request<Complaint>('/complaints', { method: 'POST', body: JSON.stringify(input) }),
  updateComplaintStatus: (id: string, status: ComplaintStatus) =>
    request<Complaint>(`/complaints/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  listVisitors: () => request<Visitor[]>('/visitors'),
  checkInVisitor: (id: string) => request<Visitor>(`/visitors/${id}/check-in`, { method: 'POST' }),
  checkOutVisitor: (id: string) =>
    request<Visitor>(`/visitors/${id}/check-out`, { method: 'POST' }),
  listFacilities: () => request<Facility[]>('/facilities'),
  listBookings: () => request<Booking[]>('/bookings'),
  createBooking: (input) =>
    request<Booking>('/bookings', { method: 'POST', body: JSON.stringify(input) }),
  cancelBooking: (id: string) => request<Booking>(`/bookings/${id}/cancel`, { method: 'POST' }),
  listAudit: () => request<AuditEntry[]>('/audit'),
};

export const isMockApiEnabled = (): boolean =>
  import.meta.env.VITE_USE_MOCK_API === 'true' || import.meta.env.MODE === 'test';

export const api: ApiClient = new Proxy({} as ApiClient, {
  get(_target, property: keyof ApiClient) {
    const impl = isMockApiEnabled() ? mockApi : httpApi;
    return impl[property];
  },
});
