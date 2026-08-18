import * as seed from '@/mocks/data';
import { ApiError } from '@/types';
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

interface Store {
  residents: Resident[];
  invoices: Invoice[];
  payments: Payment[];
  complaints: Complaint[];
  visitors: Visitor[];
  facilities: Facility[];
  bookings: Booking[];
  auditLog: AuditEntry[];
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const createStore = (): Store => ({
  residents: clone(seed.residents),
  invoices: clone(seed.invoices),
  payments: clone(seed.payments),
  complaints: clone(seed.complaints),
  visitors: clone(seed.visitors),
  facilities: clone(seed.facilities),
  bookings: clone(seed.bookings),
  auditLog: clone(seed.auditLog),
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
  async login(email: string, password: string): Promise<Session> {
    const user = seed.users.find((candidate) => candidate.email === email);
    if (!user || user.password !== password) {
      throw new ApiError(401, 'Invalid email or password');
    }
    const { password: _password, ...safeUser } = user;
    return delay({ token: `mock-token-${safeUser.id}`, user: safeUser });
  },

  async getSummary(): Promise<DashboardSummary> {
    const duesAmount = store.invoices
      .filter((invoice) => invoice.status !== 'PAID')
      .reduce((total, invoice) => total + invoice.amount, 0);
    const collectedThisMonth = store.payments.reduce((total, payment) => total + payment.amount, 0);

    return delay({
      residents: store.residents.filter((resident) => resident.active).length,
      openComplaints: store.complaints.filter((complaint) =>
        ['OPEN', 'IN_PROGRESS'].includes(complaint.status)
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

  async listComplaints(): Promise<Complaint[]> {
    return delay(clone(store.complaints));
  },

  async createComplaint(
    input: Pick<Complaint, 'unit' | 'category' | 'title' | 'description' | 'priority'> & {
      residentId: string;
    }
  ): Promise<Complaint> {
    const now = new Date().toISOString();
    const complaint: Complaint = {
      ...input,
      id: nextId('cmp'),
      societyId: seed.SOCIETY_ID,
      status: 'OPEN',
      createdAt: now,
      updatedAt: now,
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
};

export type MockApi = typeof mockApi;
