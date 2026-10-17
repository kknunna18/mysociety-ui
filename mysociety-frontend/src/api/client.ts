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
  NoticeRequest,
  NoticeResponse,
  AudienceRequest,
  AudienceResponse,
  Paginated,
  SocietyInput,
  SocietyListParams,
  SocietyProfile,
  FinanceInvoice,
  FinancePayment,
  ChargeHead,
  ChargeHeadInput,
  BillingRun,
  BillingRunInput,
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

const operationsUrl = (path: string): string =>
  import.meta.env.MODE === 'development' && import.meta.env.VITE_USE_API_PROXY !== 'false'
    ? `${window.location.origin}/api/v1${path}`
    : path;

interface BackendInvoice {
  id: string;
  societyId: string;
  unitId: string;
  invoiceNumber: string;
  billingPeriod: string;
  dueDate: string;
  totalAmount: number | string;
  outstandingAmount: number | string;
  status: string;
}

interface BackendPayment {
  id: string;
  societyId: string;
  unitId: string;
  paymentReference: string;
  provider: string;
  paymentMethod?: string | null;
  requestedAmount: number | string;
  confirmedAmount?: number | string | null;
  confirmedAt?: string | null;
  createdAt: string;
}

const toInvoice = (i: BackendInvoice): Invoice => {
  const settled = i.status === 'PAID' || Number(i.outstandingAmount) <= 0;
  const overdue = !settled && new Date(i.dueDate).getTime() < Date.now();
  return {
    id: i.id,
    societyId: i.societyId,
    residentId: i.unitId,
    unit: i.invoiceNumber,
    period: i.billingPeriod,
    amount: Number(i.totalAmount),
    dueDate: i.dueDate,
    status: settled ? 'PAID' : overdue ? 'OVERDUE' : 'DUE',
  };
};

const toPayment = (p: BackendPayment): Payment => ({
  id: p.id,
  societyId: p.societyId,
  invoiceId: '',
  residentId: p.unitId,
  amount: Number(p.confirmedAmount) || Number(p.requestedAmount),
  method: (p.paymentMethod ?? p.provider) as PaymentMethod,
  paidAt: p.confirmedAt ?? p.createdAt,
  reference: p.paymentReference,
});

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
      ? `${window.location.origin}${residentsPath}`
      : `/v1/societies/${encodeURIComponent(societyId)}/residents`;
    return request<ResidentPageResponse>(url, {
      signal,
      query: requestQuery,
    });
  },
  createResident: (input) =>
    request<Resident>('/residents', { method: 'POST', body: JSON.stringify(input) }),
  listInvoices: async () => {
    const page = await request<Paginated<BackendInvoice>>(operationsUrl('/invoices'), { query: { size: 100 } });
    return page.items.map(toInvoice);
  },
  listPayments: async () => {
    const page = await request<Paginated<BackendPayment>>(operationsUrl('/payments'), { query: { size: 100 } });
    return page.items.map(toPayment);
  },
  recordPayment: async (invoiceId: string, method: PaymentMethod) => {
    const invoice = await request<BackendInvoice>(operationsUrl(`/invoices/${encodeURIComponent(invoiceId)}`));
    const amount = Number(invoice.outstandingAmount);
    const payment = await request<BackendPayment>(operationsUrl('/payments'), {
      method: 'POST',
      headers: { 'Idempotency-Key': `ui-${invoiceId}-${Date.now()}` },
      body: JSON.stringify({ unitId: invoice.unitId, provider: method, amount }),
    });
    await request(operationsUrl(`/payments/${payment.id}/allocations`), {
      method: 'POST',
      body: JSON.stringify({ invoiceId, amount }),
    });
    return { ...toPayment(payment), invoiceId };
  },
  listFinanceInvoices: async () => {
    const page = await request<Paginated<FinanceInvoice>>(operationsUrl('/invoices'), { query: { size: 100, sort: 'dueDate,desc' } });
    return page.items.map((i) => ({
      ...i,
      totalAmount: Number(i.totalAmount),
      paidAmount: Number(i.paidAmount),
      outstandingAmount: Number(i.outstandingAmount),
    }));
  },
  listFinancePayments: async () => {
    const page = await request<Paginated<FinancePayment>>(operationsUrl('/payments'), { query: { size: 100 } });
    return page.items.map((p) => ({
      ...p,
      requestedAmount: Number(p.requestedAmount),
      confirmedAmount: Number(p.confirmedAmount),
      refundedAmount: Number(p.refundedAmount),
    }));
  },
  payFinanceInvoice: async (invoiceId: string, provider: PaymentMethod) => {
    await httpApi.recordPayment(invoiceId, provider);
  },
  listChargeHeads: async () => {
    const page = await request<Paginated<ChargeHead>>(operationsUrl('/charge-heads'), { query: { size: 100 } });
    return page.items;
  },
  createChargeHead: (input: ChargeHeadInput) =>
    request<ChargeHead>(operationsUrl('/charge-heads'), { method: 'POST', body: JSON.stringify(input) }),
  listBillingRuns: async () => {
    const page = await request<Paginated<BillingRun>>(operationsUrl('/billing-runs'), { query: { size: 100 } });
    return page.items.map((r) => ({ ...r, totalAmount: Number(r.totalAmount) }));
  },
  createBillingRun: (input: BillingRunInput) =>
    request<BillingRun>(operationsUrl('/billing-runs'), { method: 'POST', body: JSON.stringify(input) }),
  publishBillingRun: (id: string) =>
    request<BillingRun>(operationsUrl(`/billing-runs/${encodeURIComponent(id)}/publish`), { method: 'POST' }),
  listSocieties: (params: SocietyListParams = {}) =>
    request<Paginated<SocietyProfile>>(operationsUrl('/societies'), {
      query: { q: params.q ?? '', status: params.status ?? '', page: params.page ?? 0, size: params.size ?? 12 },
    }),
  getSociety: (id: string) => request<SocietyProfile>(operationsUrl(`/societies/${encodeURIComponent(id)}`)),
  createSociety: (input: SocietyInput) =>
    request<SocietyProfile>(operationsUrl('/societies'), { method: 'POST', body: JSON.stringify(input) }),
  updateSociety: (id: string, input: SocietyInput) =>
    request<SocietyProfile>(operationsUrl(`/societies/${encodeURIComponent(id)}`), {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  listComplaints: async () => {
    // request() already normalizes Spring pages into { items, total, ... }
    const page = await request<{ items?: Complaint[]; content?: Complaint[] } | Complaint[]>(
      operationsUrl('/complaints')
    );
    if (Array.isArray(page)) return page;
    return page.items ?? page.content ?? [];
  },
  createComplaint: (input) =>
    request<Complaint>(operationsUrl('/complaints'), { method: 'POST', body: JSON.stringify(input) }),
  updateComplaintStatus: (id: string, status: ComplaintStatus, reason?: string) =>
    request<Complaint>(operationsUrl(`/complaints/${id}/transitions`), {
      method: 'POST',
      body: JSON.stringify({ status, reason }),
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

  // Notices / Communication http implementations
  listNotices: (page = 0, pageSize = 50) =>
    request<Paginated<NoticeResponse>>('/notices', { query: { page, pageSize } }),
  createNotice: (input: NoticeRequest) =>
    request<NoticeResponse>('/notices', { method: 'POST', body: JSON.stringify(input) }),
  replaceNotice: (id: string, input: NoticeRequest) =>
    request<NoticeResponse>(`/notices/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) }),
  publishNotice: (id: string) => request<NoticeResponse>(`/notices/${encodeURIComponent(id)}/publish`, { method: 'POST' }),
  deleteNotice: (id: string) => request<void>(`/notices/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  listNoticeAudiences: (id: string) => request<AudienceResponse[]>(`/notices/${encodeURIComponent(id)}/audiences`),
  addNoticeAudience: (id: string, input: AudienceRequest) =>
    request<AudienceResponse>(`/notices/${encodeURIComponent(id)}/audiences`, { method: 'POST', body: JSON.stringify(input) }),
  deleteNoticeAudience: (noticeId: string, id: string) =>
    request<void>(`/notices/${encodeURIComponent(noticeId)}/audiences/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export const isMockApiEnabled = (): boolean =>
  import.meta.env.VITE_USE_MOCK_API === 'true' || import.meta.env.MODE === 'test';

export const api: ApiClient = new Proxy({} as ApiClient, {
  get(_target, property: keyof ApiClient) {
    const impl = isMockApiEnabled() ? mockApi : httpApi;
    return impl[property];
  },
});
