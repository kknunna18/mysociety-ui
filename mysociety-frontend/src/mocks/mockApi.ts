import * as seed from '@/mocks/data';
import { ApiError } from '@/types';
import type {
  AuditEntry,
  Booking,
  Complaint,
  ComplaintStatus,
  CreateComplaintInput,
  DashboardSummary,
  Facility,
  Invoice,
  Payment,
  PaymentMethod,
  Resident,
  ResidentListItem,
  ResidentPageResponse,
  MembershipStatus,
  MembershipType,
  Session,
  Society,
  SocietyInput,
  SocietyListParams,
  SocietyProfile,
  Paginated,
  Visitor,
  FinanceInvoice,
  FinancePayment,
  ChargeHead,
  ChargeHeadInput,
  BillingRun,
  BillingRunInput,
} from '@/types';

interface Store {
  societies: SocietyProfile[];
  residents: Resident[];
  invoices: Invoice[];
  payments: Payment[];
  complaints: Complaint[];
  visitors: Visitor[];
  facilities: Facility[];
  bookings: Booking[];
  auditLog: AuditEntry[];
  // Communication / notices
  notices: any[]; // NoticeResponse[] (kept any to avoid import cycles in mock file)
  audiences: any[]; // AudienceResponse[]
}


const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const financeMock: { chargeHeads: ChargeHead[]; runs: BillingRun[] } = {
  chargeHeads: [
    { id: 'chg-1', code: 'MAINT', name: 'Monthly maintenance', description: null, calculationType: 'FLAT', defaultAmount: 2500, taxPercentage: 0, recurring: true, active: true },
  ],
  runs: [],
};

const createStore = (): Store => ({
  societies: clone(seed.societyProfiles),
  residents: clone(seed.residents),
  invoices: clone(seed.invoices),
  payments: clone(seed.payments),
  complaints: clone(seed.complaints),
  visitors: clone(seed.visitors),
  facilities: clone(seed.facilities),
  bookings: clone(seed.bookings),
  auditLog: clone(seed.auditLog),
  notices: ('notices' in seed) ? clone((seed as any).notices) : [],
  audiences: ('audiences' in seed) ? clone((seed as any).audiences) : [],
});

let store = createStore();

/** Restores the mock database to its seeded state. Used by tests. */
export const resetMockDb = (): void => {
  store = createStore();
};

const latency = (): number => {
  const raw = Number(import.meta.env.VITE_MOCK_LATENCY_MS);
  return Number.isFinite(raw) && raw >= 0 ? raw : 150;
};

const delay = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), latency()));

const nextId = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;

const audit = (actor: string, action: string, entity: string, entityId: string): void => {
  store.auditLog.unshift({
    id: nextId('aud'),
    societyId: seed.SOCIETY_ID,
    actor,
    action,
    entity,
    entityId,
    at: new Date().toISOString(),
  });
};

export const mockApi = {
  async login(email: string, password: string): Promise<Session & {
    status: 'AUTHENTICATED';
    accessToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
    activeSociety: Society;
  }> {
    const user = seed.users.find((candidate) => candidate.email === email);
    if (!user || user.password !== password) {
      throw new ApiError(401, 'Invalid email or password');
    }
    const { password: _password, ...safeUser } = user;
    const activeSociety = seed.societies.find((society) => society.id === safeUser.societyId) ?? seed.societies[0];
    const accessToken = `mock-token-${safeUser.id}`;
    return delay({ token: accessToken, accessToken, status: 'AUTHENTICATED', tokenType: 'Bearer', expiresIn: 3600, user: safeUser, activeSociety });
  },

  async selectSociety({ societyId }: { loginContextToken: string; societyId: string }) {
    const society = seed.societies.find((item) => item.id === societyId);
    if (!society) throw new ApiError(403, 'Society access denied');
    const { password: _password, ...user } = seed.users[0];
    return delay({
      status: 'AUTHENTICATED' as const,
      accessToken: `mock-token-${user.id}-${society.id}`,
      tokenType: 'Bearer' as const,
      expiresIn: 3600,
      user,
      activeSociety: society,
    });
  },

  async getMySocieties() {
    // Return available societies for the current mock user
    const list = seed.societies.map((s) => ({ id: s.id, code: (s.name || '').toUpperCase().replace(/\s+/g, '_'), name: s.name, roles: [] }));
    return delay(list);
  },

  async getSummary(): Promise<DashboardSummary> {
    const duesAmount = store.invoices
      .filter((invoice) => invoice.status !== 'PAID')
      .reduce((total, invoice) => total + invoice.amount, 0);
    const collectedThisMonth = store.payments.reduce((total, payment) => total + payment.amount, 0);

    return delay({
      residents: store.residents.filter((resident) => resident.active).length,
      openComplaints: store.complaints.filter((complaint) =>
        ['OPEN', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_RESIDENT', 'REOPENED'].includes(complaint.status)
      ).length,
      duesAmount,
      collectedThisMonth,
      visitorsToday: store.visitors.filter((visitor) => visitor.status !== 'CHECKED_OUT').length,
      upcomingBookings: store.bookings.filter((booking) => booking.status !== 'CANCELLED').length,
    });
  },

  async listResidents(query = ''): Promise<Resident[]> {
    const needle = query.trim().toLowerCase();
    const items = needle
      ? store.residents.filter((resident) =>
          [resident.name, resident.unit, resident.email].some((field) =>
            field.toLowerCase().includes(needle)
          )
        )
      : store.residents;
    return delay(clone(items));
  },

  async getResidents({
    societyId,
    page,
    size,
    search = '',
    blockId,
    unitId,
    membershipType,
    sort = 'fullName,asc',
  }: {
    societyId: string;
    page: number;
    size: number;
    search?: string;
    blockId?: string;
    unitId?: string;
    membershipType?: MembershipType;
    status?: MembershipStatus;
    sort?: string;
  }): Promise<ResidentPageResponse> {
    const needle = search.trim().toLowerCase();
    const filtered = store.residents.filter((resident) => {
      const searchable = [resident.name, resident.unit, resident.email, resident.phone];
      const matchesSearch = !needle || searchable.some((field) => field.toLowerCase().includes(needle));
      const matchesBlock = !blockId || resident.unit.startsWith(`${blockId}-`);
      const matchesUnit = !unitId || resident.unit === unitId;
      const matchesType = !membershipType || resident.ownership === membershipType;
      const residentStatus: MembershipStatus = resident.active ? 'ACTIVE' : 'INACTIVE';
      const matchesStatus = !status || residentStatus === status;
      return resident.societyId === societyId && matchesSearch && matchesBlock && matchesUnit && matchesType && matchesStatus;
    });
    const [field, direction] = sort.split(',');
    const sorted = [...filtered].sort((left, right) => {
      const leftValue = field === 'moveInDate' ? left.moveInDate : field === 'unitNumber' ? left.unit : left.name;
      const rightValue = field === 'moveInDate' ? right.moveInDate : field === 'unitNumber' ? right.unit : right.name;
      return leftValue.localeCompare(rightValue) * (direction === 'desc' ? -1 : 1);
    });
    const totalPages = Math.ceil(sorted.length / size);
    const items: ResidentListItem[] = sorted.slice(page * size, (page + 1) * size).map((resident) => ({
      membershipId: resident.id,
      userId: resident.id,
      fullName: resident.name,
      avatarUrl: null,
      email: resident.email || null,
      mobile: resident.phone || null,
      societyId: resident.societyId,
      block: resident.unit ? { id: resident.unit.split('-')[0], name: `Block ${resident.unit.split('-')[0]}` } : null,
      unit: { id: resident.unit, number: resident.unit },
      membershipType: resident.ownership,
      primaryMember: resident.ownership === 'OWNER',
      status: resident.active ? 'ACTIVE' : 'INACTIVE',
      moveInDate: resident.moveInDate || null,
    }));
    return delay({
      items: clone(items),
      page: {
        number: page,
        size,
        totalElements: sorted.length,
        totalPages,
        first: page === 0,
        last: totalPages === 0 || page >= totalPages - 1,
      },
    });
  },

  async createResident(input: Omit<Resident, 'id' | 'societyId'>): Promise<Resident> {
    if (store.residents.some((resident) => resident.unit === input.unit && resident.active)) {
      throw new ApiError(409, `Unit ${input.unit} already has an active resident`);
    }
    const resident: Resident = { ...input, id: nextId('res'), societyId: seed.SOCIETY_ID };
    store.residents = [resident, ...store.residents];
    audit('system', 'RESIDENT_CREATED', 'Resident', resident.id);
    return delay(clone(resident));
  },

  async listInvoices(): Promise<Invoice[]> {
    return delay(clone(store.invoices));
  },

  async listPayments(): Promise<Payment[]> {
    return delay(clone(store.payments));
  },

  async recordPayment(invoiceId: string, method: PaymentMethod): Promise<Payment> {
    const invoice = store.invoices.find((candidate) => candidate.id === invoiceId);
    if (!invoice) {
      throw new ApiError(404, `Invoice ${invoiceId} not found`);
    }
    if (invoice.status === 'PAID') {
      throw new ApiError(409, `Invoice ${invoiceId} is already paid`);
    }

    const payment: Payment = {
      id: nextId('pay'),
      societyId: seed.SOCIETY_ID,
      invoiceId,
      residentId: invoice.residentId,
      amount: invoice.amount,
      method,
      paidAt: new Date().toISOString(),
      reference: nextId('REF').toUpperCase(),
    };
    invoice.status = 'PAID';
    store.payments = [payment, ...store.payments];
    audit('system', 'PAYMENT_RECORDED', 'Payment', payment.id);
    return delay(clone(payment));
  },

  async listFinanceInvoices(): Promise<FinanceInvoice[]> {
    return delay(
      store.invoices.map((i) => ({
        id: i.id,
        unitId: i.unit,
        invoiceNumber: i.id.toUpperCase(),
        billingPeriod: i.period,
        invoiceDate: i.dueDate,
        dueDate: i.dueDate,
        currencyCode: 'INR',
        totalAmount: i.amount,
        paidAmount: i.status === 'PAID' ? i.amount : 0,
        outstandingAmount: i.status === 'PAID' ? 0 : i.amount,
        status: i.status === 'PAID' ? 'PAID' : i.status === 'OVERDUE' ? 'OVERDUE' : 'PUBLISHED',
      }))
    );
  },

  async listFinancePayments(): Promise<FinancePayment[]> {
    return delay(
      store.payments.map((p) => ({
        id: p.id,
        unitId: p.residentId,
        paymentReference: p.reference,
        provider: p.method,
        requestedAmount: p.amount,
        confirmedAmount: p.amount,
        refundedAmount: 0,
        status: 'CONFIRMED',
        createdAt: p.paidAt,
        confirmedAt: p.paidAt,
      }))
    );
  },

  async payFinanceInvoice(invoiceId: string, provider: PaymentMethod): Promise<void> {
    await mockApi.recordPayment(invoiceId, provider);
  },

  async listChargeHeads(): Promise<ChargeHead[]> {
    return delay(clone(financeMock.chargeHeads));
  },

  async createChargeHead(input: ChargeHeadInput): Promise<ChargeHead> {
    if (financeMock.chargeHeads.some((c) => c.code === input.code)) {
      throw new ApiError(409, `Charge head ${input.code} already exists`);
    }
    const head: ChargeHead = {
      id: nextId('chg'),
      code: input.code,
      name: input.name,
      description: null,
      calculationType: 'FLAT',
      defaultAmount: input.defaultAmount ?? null,
      taxPercentage: 0,
      recurring: true,
      active: true,
    };
    financeMock.chargeHeads = [head, ...financeMock.chargeHeads];
    return delay(clone(head));
  },

  async listBillingRuns(): Promise<BillingRun[]> {
    return delay(clone(financeMock.runs));
  },

  async createBillingRun(input: BillingRunInput): Promise<BillingRun> {
    const run: BillingRun = { id: nextId('run'), ...input, status: 'DRAFT', totalUnits: 0, totalAmount: 0, publishedAt: null };
    financeMock.runs = [run, ...financeMock.runs];
    return delay(clone(run));
  },

  async publishBillingRun(id: string): Promise<BillingRun> {
    const run = financeMock.runs.find((r) => r.id === id);
    if (!run) throw new ApiError(404, `Billing run ${id} not found`);
    run.status = 'PUBLISHED';
    run.publishedAt = new Date().toISOString();
    return delay(clone(run));
  },

  async listSocieties(params: SocietyListParams = {}): Promise<Paginated<SocietyProfile>> {
    const q = (params.q ?? '').trim().toLowerCase();
    const matches = store.societies.filter(
      (s) =>
        (!params.status || s.status === params.status) &&
        (!q || [s.name, s.code, s.city ?? ''].some((v) => v.toLowerCase().includes(q)))
    );
    const page = params.page ?? 0;
    const pageSize = params.size ?? 12;
    return delay({ items: clone(matches.slice(page * pageSize, (page + 1) * pageSize)), total: matches.length, page, pageSize });
  },

  async getSociety(id: string): Promise<SocietyProfile> {
    const found = store.societies.find((s) => s.id === id);
    if (!found) throw new ApiError(404, 'Society not found');
    return delay(clone(found));
  },

  async createSociety(input: SocietyInput): Promise<SocietyProfile> {
    const code = input.code.trim().toUpperCase();
    if (store.societies.some((s) => s.code === code)) throw new ApiError(400, 'Society code already exists');
    const now = new Date().toISOString();
    const society: SocietyProfile = {
      ...input,
      id: nextId('soc'),
      code,
      countryCode: input.countryCode ?? 'IN',
      timezone: input.timezone ?? 'Asia/Kolkata',
      currencyCode: input.currencyCode ?? 'INR',
      status: input.status ?? 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      version: 0,
    };
    store.societies.unshift(society);
    return delay(clone(society));
  },

  async updateSociety(id: string, input: SocietyInput): Promise<SocietyProfile> {
    const index = store.societies.findIndex((s) => s.id === id);
    if (index < 0) throw new ApiError(404, 'Society not found');
    const code = input.code.trim().toUpperCase();
    if (store.societies.some((s) => s.code === code && s.id !== id)) throw new ApiError(400, 'Society code already exists');
    const current = store.societies[index];
    store.societies[index] = {
      ...current,
      ...input,
      code,
      countryCode: input.countryCode ?? current.countryCode,
      timezone: input.timezone ?? current.timezone,
      currencyCode: input.currencyCode ?? current.currencyCode,
      status: input.status ?? current.status,
      updatedAt: new Date().toISOString(),
      version: current.version + 1,
    };
    return delay(clone(store.societies[index]));
  },

  async listComplaints(): Promise<Complaint[]> {
    return delay(clone(store.complaints));
  },

  async createComplaint(input: CreateComplaintInput): Promise<Complaint> {
    const now = new Date().toISOString();
    const complaint: Complaint = {
      id: nextId('cmp'),
      complaintNumber: `CMP-${Math.random().toString(16).slice(2, 10).toUpperCase()}`,
      category: input.category,
      subject: input.subject,
      description: input.description,
      priority: input.priority,
      status: 'OPEN',
      assignedUserId: null,
      slaDueAt: null,
      resolvedAt: null,
      closedAt: null,
      createdAt: now,
      updatedAt: now,
      version: 0,
    };
    store.complaints = [complaint, ...store.complaints];
    audit('system', 'COMPLAINT_CREATED', 'Complaint', complaint.id);
    return delay(clone(complaint));
  },

  async updateComplaintStatus(id: string, status: ComplaintStatus): Promise<Complaint> {
    const complaint = store.complaints.find((candidate) => candidate.id === id);
    if (!complaint) {
      throw new ApiError(404, `Complaint ${id} not found`);
    }
    complaint.status = status;
    complaint.updatedAt = new Date().toISOString();
    audit('system', `COMPLAINT_${status}`, 'Complaint', complaint.id);
    return delay(clone(complaint));
  },

  async listVisitors(): Promise<Visitor[]> {
    return delay(clone(store.visitors));
  },

  async checkInVisitor(id: string): Promise<Visitor> {
    const visitor = store.visitors.find((candidate) => candidate.id === id);
    if (!visitor) {
      throw new ApiError(404, `Visitor ${id} not found`);
    }
    if (visitor.status === 'CHECKED_IN') {
      throw new ApiError(409, `${visitor.name} is already checked in`);
    }
    visitor.status = 'CHECKED_IN';
    visitor.checkedInAt = new Date().toISOString();
    audit('security', 'VISITOR_CHECKED_IN', 'Visitor', visitor.id);
    return delay(clone(visitor));
  },

  async checkOutVisitor(id: string): Promise<Visitor> {
    const visitor = store.visitors.find((candidate) => candidate.id === id);
    if (!visitor) {
      throw new ApiError(404, `Visitor ${id} not found`);
    }
    visitor.status = 'CHECKED_OUT';
    visitor.checkedOutAt = new Date().toISOString();
    audit('security', 'VISITOR_CHECKED_OUT', 'Visitor', visitor.id);
    return delay(clone(visitor));
  },

  async listFacilities(): Promise<Facility[]> {
    return delay(clone(store.facilities));
  },

  async listBookings(): Promise<Booking[]> {
    return delay(clone(store.bookings));
  },

  async createBooking(input: {
    facilityId: string;
    residentId: string;
    unit: string;
    date: string;
    slot: string;
  }): Promise<Booking> {
    const facility = store.facilities.find((candidate) => candidate.id === input.facilityId);
    if (!facility) {
      throw new ApiError(404, `Facility ${input.facilityId} not found`);
    }
    const conflict = store.bookings.some(
      (booking) =>
        booking.facilityId === input.facilityId &&
        booking.date === input.date &&
        booking.slot === input.slot &&
        booking.status !== 'CANCELLED'
    );
    if (conflict) {
      throw new ApiError(
        409,
        `${facility.name} is already booked for ${input.slot} on ${input.date}`
      );
    }

    const booking: Booking = {
      ...input,
      id: nextId('bkg'),
      societyId: seed.SOCIETY_ID,
      facilityName: facility.name,
      status: 'REQUESTED',
    };
    store.bookings = [booking, ...store.bookings];
    audit('system', 'BOOKING_REQUESTED', 'Booking', booking.id);
    return delay(clone(booking));
  },

  async cancelBooking(id: string): Promise<Booking> {
    const booking = store.bookings.find((candidate) => candidate.id === id);
    if (!booking) {
      throw new ApiError(404, `Booking ${id} not found`);
    }
    booking.status = 'CANCELLED';
    audit('system', 'BOOKING_CANCELLED', 'Booking', booking.id);
    return delay(clone(booking));
  },

  async listAudit(): Promise<AuditEntry[]> {
    return delay(clone(store.auditLog));
  },

  // Notices / Communication mock implementations
  async listNotices(page = 0, pageSize = 50): Promise<any> {
    const items = clone(store.notices || []);
    return delay({ items, total: items.length, page, pageSize });
  },


  async createNotice(input: { noticeNumber: string; title: string; content: string; category: string; priority: string; publishAt?: string | null; expiresAt?: string | null }): Promise<any> {
    const now = new Date().toISOString();
    const notice = {
      id: nextId('notice'),
      societyId: seed.SOCIETY_ID,
      noticeNumber: input.noticeNumber,
      title: input.title,
      content: input.content,
      category: input.category,
      priority: input.priority,
      publishAt: input.publishAt ?? null,
      expiresAt: input.expiresAt ?? null,
      createdAt: now,
      updatedAt: now,
      publishedAt: input.publishAt ?? null,
    };
    store.notices = [notice, ...(store.notices || [])];
    audit('system', 'NOTICE_CREATED', 'Notice', notice.id);
    return delay(clone(notice));
  },

  async replaceNotice(id: string, input: { noticeNumber: string; title: string; content: string; category: string; priority: string; publishAt?: string | null; expiresAt?: string | null }): Promise<any> {
    const notice = (store.notices || []).find((n) => n.id === id);
    if (!notice) throw new ApiError(404, `Notice ${id} not found`);
    notice.noticeNumber = input.noticeNumber;
    notice.title = input.title;
    notice.content = input.content;
    notice.priority = input.priority;
    notice.category = input.category;
    notice.publishAt = input.publishAt ?? null;
    notice.expiresAt = input.expiresAt ?? null;
    notice.updatedAt = new Date().toISOString();
    if (input.publishAt) notice.publishedAt = input.publishAt;
    audit('system', 'NOTICE_UPDATED', 'Notice', notice.id);
    return delay(clone(notice));
  },


  async publishNotice(id: string): Promise<any> {
    const notice = (store.notices || []).find((n) => n.id === id);
    if (!notice) throw new ApiError(404, `Notice ${id} not found`);
    const now = new Date().toISOString();
    notice.publishAt = now;
    notice.publishedAt = now;
    notice.updatedAt = now;
    audit('system', 'NOTICE_PUBLISHED', 'Notice', notice.id);
    return delay(clone(notice));
  },

  async deleteNotice(id: string): Promise<void> {
    const before = (store.notices || []).length;
    store.notices = (store.notices || []).filter((n) => n.id !== id);
    if ((store.notices || []).length === before) throw new ApiError(404, `Notice ${id} not found`);
    audit('system', 'NOTICE_DELETED', 'Notice', id);
    return delay(undefined as unknown as void);
  },

  async listNoticeAudiences(noticeId: string): Promise<any[]> {
    const items = (store.audiences || []).filter((a) => a.noticeId === noticeId);
    return delay(clone(items));
  },

  async addNoticeAudience(noticeId: string, input: { type: string; value?: string }): Promise<any> {
    const notice = (store.notices || []).find((n) => n.id === noticeId);
    if (!notice) throw new ApiError(404, `Notice ${noticeId} not found`);
    const audience = {
      id: nextId('aud'),
      noticeId,
      type: input.type,
      value: input.value ?? null,
      createdAt: new Date().toISOString(),
    };
    store.audiences = [audience, ...(store.audiences || [])];
    audit('system', 'AUDIENCE_ADDED', 'Audience', audience.id);
    return delay(clone(audience));
  },

  async deleteNoticeAudience(noticeId: string, id: string): Promise<void> {
    const before = (store.audiences || []).length;
    store.audiences = (store.audiences || []).filter((a) => !(a.noticeId === noticeId && a.id === id));
    if ((store.audiences || []).length === before) throw new ApiError(404, `Audience ${id} not found for notice ${noticeId}`);
    audit('system', 'AUDIENCE_REMOVED', 'Audience', id);
    return delay(undefined as unknown as void);
  },
};

export type MockApi = typeof mockApi;
