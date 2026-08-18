export type Role = 'ADMIN' | 'COMMITTEE' | 'RESIDENT' | 'SECURITY';

export interface Society {
  id: string;
  name: string;
  city: string;
  unitCount: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  societyId: string;
  unit?: string;
}

export interface Session {
  token: string;
  user: User;
}

export interface Resident {
  id: string;
  societyId: string;
  name: string;
  email: string;
  phone: string;
  unit: string;
  ownership: 'OWNER' | 'TENANT';
  moveInDate: string;
  active: boolean;
}

export type InvoiceStatus = 'PAID' | 'DUE' | 'OVERDUE';

export interface Invoice {
  id: string;
  societyId: string;
  residentId: string;
  unit: string;
  period: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
}

export type PaymentMethod = 'UPI' | 'CARD' | 'NETBANKING' | 'CASH';

export interface Payment {
  id: string;
  societyId: string;
  invoiceId: string;
  residentId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  reference: string;
}

export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Complaint {
  id: string;
  societyId: string;
  residentId: string;
  unit: string;
  category: 'PLUMBING' | 'ELECTRICAL' | 'HOUSEKEEPING' | 'SECURITY' | 'OTHER';
  title: string;
  description: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  createdAt: string;
  updatedAt: string;
}

export type VisitorStatus = 'EXPECTED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'DENIED';

export interface Visitor {
  id: string;
  societyId: string;
  name: string;
  phone: string;
  unit: string;
  purpose: string;
  status: VisitorStatus;
  expectedAt: string;
  checkedInAt?: string;
  checkedOutAt?: string;
}

export type BookingStatus = 'REQUESTED' | 'CONFIRMED' | 'CANCELLED';

export interface Facility {
  id: string;
  societyId: string;
  name: string;
  capacity: number;
  hourlyRate: number;
}

export interface Booking {
  id: string;
  societyId: string;
  facilityId: string;
  facilityName: string;
  residentId: string;
  unit: string;
  date: string;
  slot: string;
  status: BookingStatus;
}

export interface AuditEntry {
  id: string;
  societyId: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  at: string;
}

export interface DashboardSummary {
  residents: number;
  openComplaints: number;
  duesAmount: number;
  collectedThisMonth: number;
  visitorsToday: number;
  upcomingBookings: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
