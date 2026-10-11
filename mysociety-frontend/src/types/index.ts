export type Role =
  | 'ADMIN'
  | 'COMMITTEE'
  | 'RESIDENT'
  | 'SECURITY'
  | 'ACCOUNTANT'
  | 'FACILITY_MANAGER'
  | 'VENDOR'
  | 'PLATFORM_ADMIN';

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
  mobileNumber?: string;
  status?: string;
  entitlements?: string[];
}

export interface Session {
  token: string;
  user: User;
}

export interface ActiveSociety {
  id: string;
  code?: string;
  name: string;
  city?: string;
  unitCount?: number;
  unit?: string;
  membershipType?: string;
  roles?: string[];
}

export type AvailableSociety = ActiveSociety;
export type AuthUser = User;

export interface AuthenticatedLoginResponse {
  status: 'AUTHENTICATED';
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUser;
  activeSociety: ActiveSociety;
}

export interface SocietySelectionRequiredResponse {
  status: 'SOCIETY_SELECTION_REQUIRED';
  loginContextToken: string;
  expiresIn: number;
  user: { id: string; name: string };
  societies: AvailableSociety[];
}

export type LoginResponse = AuthenticatedLoginResponse | SocietySelectionRequiredResponse;

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

export type MembershipType = 'OWNER' | 'TENANT' | 'FAMILY_MEMBER' | 'OTHER_OCCUPANT';

export type MembershipStatus =
  | 'INVITED'
  | 'PENDING_VERIFICATION'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'REJECTED'
  | 'INACTIVE'
  | 'MOVED_OUT';

export interface ResidentListItem {
  membershipId: string;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  email: string | null;
  mobile: string | null;
  societyId: string;
  block: { id: string; name: string } | null;
  unit: { id: string; number: string };
  membershipType: MembershipType;
  primaryMember: boolean;
  status: MembershipStatus;
  moveInDate: string | null;
}

export interface ResidentPageMetadata {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface ResidentPageResponse {
  items: ResidentListItem[];
  page: ResidentPageMetadata;
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

export type ComplaintStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_RESIDENT'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED'
  | 'REJECTED';
export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** Mirrors the operations service ComplaintResponse. */
export interface Complaint {
  id: string;
  complaintNumber: string;
  category: string;
  subject: string;
  description: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assignedUserId?: string | null;
  slaDueAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

/** Mirrors the operations service CreateComplaintRequest. */
export interface CreateComplaintInput {
  category: string;
  subcategory?: string;
  subject: string;
  description: string;
  locationDetails?: string;
  priority: ComplaintPriority;
  unitId?: string;
  preferredVisitAt?: string;
  entryPermission: boolean;
}

export type VisitorStatus = 'EXPECTED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'DENIED';

export type SocietyStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

/** Mirrors the society service SocietyResponse (the societies table). */
export interface SocietyProfile {
  id: string;
  code: string;
  name: string;
  registrationNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateName?: string | null;
  postalCode?: string | null;
  countryCode: string;
  timezone: string;
  currencyCode: string;
  logoUrl?: string | null;
  status: SocietyStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
}

/** Mirrors the society service SocietyRequest. */
export interface SocietyInput {
  code: string;
  name: string;
  registrationNumber?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateName?: string;
  postalCode?: string;
  countryCode?: string;
  timezone?: string;
  currencyCode?: string;
  logoUrl?: string;
  status?: SocietyStatus;
}

export interface SocietyListParams {
  q?: string;
  status?: SocietyStatus | '';
  page?: number;
  size?: number;
}

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

/* Notices / Communication types */
export interface NoticeRequest {
  noticeNumber: string;
  title: string;
  content: string;
  category: string; // backend enum NoticeCategory
  // backend enum NoticePriority: URGENT | HIGH | LOW | NORMAL
  priority: 'URGENT' | 'HIGH' | 'LOW' | 'NORMAL';
  publishAt?: string | null;
  expiresAt?: string | null;
}

export interface NoticeResponse extends NoticeRequest {
  id: string;
  societyId: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
}

export interface AudienceRequest {
  type: 'ALL' | 'BLOCK' | 'UNIT' | 'ROLE' | 'CUSTOM';
  value?: string; // e.g., block id, unit id, role name, or custom group id
}

export interface AudienceResponse extends AudienceRequest {
  id: string;
  noticeId: string;
  createdAt: string;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export type FinanceInvoiceStatus = 'DRAFT' | 'PUBLISHED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'ADJUSTED';

export interface FinanceInvoice {
  id: string;
  unitId: string;
  invoiceNumber: string;
  billingPeriod: string;
  invoiceDate: string;
  dueDate: string;
  currencyCode: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: FinanceInvoiceStatus;
}

export interface FinancePayment {
  id: string;
  unitId: string;
  paymentReference: string;
  provider: string;
  requestedAmount: number;
  confirmedAmount: number;
  refundedAmount: number;
  status: string;
  createdAt: string;
  confirmedAt: string | null;
}

export interface ChargeHead {
  id: string;
  code: string;
  name: string;
  description: string | null;
  calculationType: string;
  defaultAmount: number | null;
  taxPercentage: number;
  recurring: boolean;
  active: boolean;
}

export interface ChargeHeadInput {
  code: string;
  name: string;
  defaultAmount?: number | null;
}

export interface BillingRun {
  id: string;
  runNumber: string;
  billingPeriod: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: string;
  totalUnits: number;
  totalAmount: number;
  publishedAt: string | null;
}

export interface BillingRunInput {
  runNumber: string;
  billingPeriod: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
}
