import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import DashboardPage from '@/pages/DashboardPage';
import LoginPage from '@/pages/LoginPage';
import SelectSocietyPage from '@/pages/SelectSocietyPage';
import { SimpleAuthPage, SessionExpiredPage, UnauthorizedPage } from '@/pages/AuthSupportPages';
import { WorkflowPage } from '@/pages/WorkflowPage';
import NotFoundPage from '@/pages/NotFoundPage';

const module = (title: string, description: string) => <WorkflowPage title={title} description={description} />;
export default function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/forgot-password" element={<SimpleAuthPage title="Reset your password" description="Enter your email and we will send password reset instructions." action="Send reset link" />} />
    <Route path="/reset-password" element={<SimpleAuthPage title="Choose a new password" description="Set a strong password to secure your account." action="Continue" />} />
    <Route path="/verify-mfa" element={<SimpleAuthPage title="Verify your identity" description="Enter the one-time code from your authenticator application." action="Continue" />} />
    <Route path="/accept-invitation" element={<SimpleAuthPage title="Accept your invitation" description="Confirm your membership details to join this society." action="Continue" />} />
    <Route path="/select-society" element={<SelectSocietyPage />} />
    <Route path="/unauthorized" element={<UnauthorizedPage />} /><Route path="/session-expired" element={<SessionExpiredPage />} />
    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route path="/" element={<Navigate to="/dashboard" replace />} /><Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/societies" element={module('Societies', 'Manage society profiles, buildings, units, contacts, and active status.')} /><Route path="/societies/:societyId" element={module('Society details', 'Review society configuration and membership.') } />
      <Route path="/buildings" element={module('Buildings', 'Manage wings, floors, codes, unit counts, and status.')} /><Route path="/units" element={module('Units', 'Manage unit occupancy, ownership, residents, and parking.')} />
      <Route path="/residents" element={module('Residents', 'Manage household profiles, ownership, vehicles, and move history.')} /><Route path="/residents/new" element={module('New resident', 'Add a resident with household and unit details.')} /><Route path="/residents/:residentId" element={module('Resident profile', 'Review contact details, household relationships, and history.')} /><Route path="/residents/:residentId/edit" element={module('Edit resident', 'Update resident profile details.')} />
      <Route path="/charge-heads" element={module('Charge heads', 'Set up maintenance and one-time charge heads.')} /><Route path="/billing-runs" element={module('Billing runs', 'Review billing progress and generated invoices.')} /><Route path="/invoices" element={module('Invoices', 'Review invoices, adjustments, and payment status.')} /><Route path="/payments" element={module('Payments', 'Record and reconcile payments with idempotent processing.')} /><Route path="/receipts" element={module('Receipts', 'View receipts, refunds, and reconciliation details.')} />
      <Route path="/complaints" element={module('Complaints', 'Track complaint status, SLAs, assignment, and resolution.')} /><Route path="/work-orders" element={module('Work orders', 'Assign vendors and manage work order progress.')} />
      <Route path="/visitors" element={module('Visitors', 'Approve, search, check in, and check out visitors.')} /><Route path="/facilities" element={module('Facilities', 'Manage facility availability and reservation rules.')} /><Route path="/bookings" element={module('Bookings', 'Review bookings, conflicts, cancellations, and availability.')} />
      <Route path="/notices" element={module('Notices', 'Publish community notices to selected audiences.')} /><Route path="/documents" element={module('Documents', 'Manage shared documents and attachments.')} /><Route path="/notifications" element={module('Notifications', 'Review templates and notification delivery status.')} />
      <Route path="/reports" element={module('Reports', 'Run role-appropriate reports with filters and export options.')} /><Route path="/exports" element={module('Exports', 'Track export requests, statuses, and downloads.')} /><Route path="/audit-events" element={module('Audit events', 'Search read-only audit history.')} />
      <Route path="/profile" element={module('Profile', 'Update your profile and communication preferences.')} /><Route path="/settings" element={module('Settings', 'Manage role-authorized society settings and notification preferences.')} />
    </Route><Route path="*" element={<NotFoundPage />} />
  </Routes>;
}
