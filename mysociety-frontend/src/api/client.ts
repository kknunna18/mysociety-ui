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
  Session,
  Visitor,
} from '@/types';

/** Both the mock and the HTTP implementation satisfy this contract. */
export type ApiClient = MockApi;

const httpApi: ApiClient = {
  login: (email, password) =>
    request<Session>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getSummary: () => request<DashboardSummary>('/dashboard/summary'),
  listResidents: (query = '') =>
    request<Resident[]>(`/residents${query ? `?q=${encodeURIComponent(query)}` : ''}`),
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

export const isMockApiEnabled = (): boolean => import.meta.env.VITE_USE_MOCK_API !== 'false';

export const api: ApiClient = new Proxy({} as ApiClient, {
  get(_target, property: keyof ApiClient) {
    const impl = isMockApiEnabled() ? mockApi : httpApi;
    return impl[property];
  },
});
