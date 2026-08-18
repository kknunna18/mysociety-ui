import { api } from '@/api/client';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { PageHeader } from '@/components/PageHeader';
import { useAsync } from '@/hooks/useAsync';
import { formatCurrency } from '@/utils/format';
import type { DashboardSummary } from '@/types';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, error, loading, reload } = useAsync<DashboardSummary>(() => api.getSummary());

  return (
    <>
      <PageHeader title="Dashboard" description="Today at a glance across the society." />
      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        {data ? (
          <div className="stat-grid">
            <Stat label="Active residents" value={data.residents} />
            <Stat label="Open complaints" value={data.openComplaints} />
            <Stat label="Outstanding dues" value={formatCurrency(data.duesAmount)} />
            <Stat label="Collected" value={formatCurrency(data.collectedThisMonth)} />
            <Stat label="Visitors on site" value={data.visitorsToday} />
            <Stat label="Upcoming bookings" value={data.upcomingBookings} />
          </div>
        ) : null}
      </AsyncBoundary>
    </>
  );
}
