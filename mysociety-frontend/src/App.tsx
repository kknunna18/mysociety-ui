import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import AuditPage from '@/pages/AuditPage';
import BillingPage from '@/pages/BillingPage';
import BookingsPage from '@/pages/BookingsPage';
import ComplaintsPage from '@/pages/ComplaintsPage';
import DashboardPage from '@/pages/DashboardPage';
import LoginPage from '@/pages/LoginPage';
import NotFoundPage from '@/pages/NotFoundPage';
import PaymentsPage from '@/pages/PaymentsPage';
import ResidentsPage from '@/pages/ResidentsPage';
import VisitorsPage from '@/pages/VisitorsPage';
import SelectSocietyPage from '@/pages/SelectSocietyPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/select-society" element={<SelectSocietyPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/residents" element={<ResidentsPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/complaints" element={<ComplaintsPage />} />
        <Route path="/visitors" element={<VisitorsPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route
          path="/audit"
          element={
            <ProtectedRoute roles={['ADMIN', 'COMMITTEE']}>
              <AuditPage />
            </ProtectedRoute>
          }
        />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
