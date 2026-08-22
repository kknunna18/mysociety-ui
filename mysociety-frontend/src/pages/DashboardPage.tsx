import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/utils/format';
import type { DashboardSummary } from '@/types';

const friendlyError = 'Dashboard data is temporarily unavailable. Please try again.';

function SummaryCard({
  icon,
  title,
  value,
  support,
  tone,
  to,
}: {
  icon: string;
  title: string;
  value: string | number;
  support: string;
  tone: string;
  to: string;
}) {
  return (
    <article className={`summary-card summary-card--${tone}`}>
      <div className="summary-card__top">
        <span className="summary-card__icon" aria-hidden="true">
          {icon}
        </span>
        <span>{title}</span>
      </div>
      <strong className="summary-card__value">{value}</strong>
      <p>{support}</p>
      <Link to={to}>
        View details <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useAsync<DashboardSummary>(() => api.getSummary());
  const [period, setPeriod] = useState<6 | 12>(6);
  const firstName = user?.name?.split(' ')[0] || 'there';
  useEffect(() => {
    if (error) console.error('Dashboard summary request failed', error);
  }, [error]);

  if (loading)
    return (
      <div className="dashboard-skeleton" role="status" aria-live="polite">
        <span>Loading dashboard...</span>
        <div className="skeleton-grid">
          {[1, 2, 3, 4].map((item) => (
            <i key={item} />
          ))}
        </div>
      </div>
    );
  if (error)
    return (
      <div className="dashboard-error" role="alert" aria-live="assertive">
        <span className="dashboard-error__icon" aria-hidden="true">
          !
        </span>
        <div>
          <strong>{friendlyError}</strong>
          <button type="button" onClick={reload}>
            Retry
          </button>
        </div>
      </div>
    );
  if (!data)
    return (
      <p className="dashboard-empty" role="status">
        No dashboard data is available yet.
      </p>
    );

  const pending = Math.max(data.duesAmount, 0);
  const collected = Math.max(data.collectedThisMonth, 0);
  const total = pending + collected || 1;
  const highPriority = data.openComplaints > 0 ? 1 : 0;
  const expectedVisitors = Math.max(data.visitorsToday - 1, 0);

  return (
    <div className="dashboard">
      <header className="dashboard-heading">
        <div>
          <h1>Good morning, {firstName}</h1>
          <p>Here's what's happening in Green Valley Apartments today.</p>
        </div>
        <button className="primary quick-action-button" type="button">
          + <span>Quick action</span>
        </button>
      </header>
      <section className="summary-grid" aria-label="Society summary">
        <SummaryCard
          icon="▣"
          title="Outstanding dues"
          value={formatCurrency(data.duesAmount)}
          support={`${data.residents} households`}
          tone="danger"
          to="/billing"
        />
        <SummaryCard
          icon="△"
          title="Open complaints"
          value={data.openComplaints}
          support={`${highPriority} high priority`}
          tone="warning"
          to="/complaints"
        />
        <SummaryCard
          icon="♧"
          title="Visitors today"
          value={data.visitorsToday}
          support={`${expectedVisitors} expected`}
          tone="success"
          to="/visitors"
        />
        <SummaryCard
          icon="□"
          title="Facility bookings"
          value={data.upcomingBookings}
          support="This week"
          tone="info"
          to="/bookings"
        />
      </section>
      <div className="dashboard-middle">
        <section className="dashboard-card collection-card">
          <div className="dashboard-card__heading">
            <h2>Collection overview</h2>
            <div className="period-toggle">
              <button
                className={period === 6 ? 'active' : ''}
                type="button"
                onClick={() => setPeriod(6)}
              >
                6 months
              </button>
              <button
                className={period === 12 ? 'active' : ''}
                type="button"
                onClick={() => setPeriod(12)}
              >
                12 months
              </button>
            </div>
          </div>
          <div className="collection-chart" aria-label={`Collection overview for ${period} months`}>
            <div className="chart-axis">
              <span>{formatCurrency(total)}</span>
              <span>{formatCurrency(Math.round(total / 2))}</span>
              <span>₹0</span>
            </div>
            <div className="chart-bars">
              <div className="chart-bar">
                <i style={{ height: `${Math.max((collected / total) * 100, 4)}%` }} />
                <span>Collected</span>
              </div>
              <div className="chart-bar chart-bar--pending">
                <i style={{ height: `${Math.max((pending / total) * 100, 4)}%` }} />
                <span>Pending</span>
              </div>
            </div>
          </div>
          <div className="chart-legend">
            <span>
              <i className="legend-collected" />
              Collected {formatCurrency(collected)}
            </span>
            <span>
              <i className="legend-pending" />
              Pending {formatCurrency(pending)}
            </span>
          </div>
        </section>
        <section className="dashboard-card">
          <div className="dashboard-card__heading">
            <h2>Quick actions</h2>
          </div>
          <div className="quick-actions">
            {[
              { label: 'Add resident', to: '/residents', icon: '+' },
              { label: 'Create bill', to: '/billing', icon: '▤' },
              { label: 'Record payment', to: '/payments', icon: '▣' },
              { label: 'Add visitor', to: '/visitors', icon: '♧' },
              { label: 'Book facility', to: '/bookings', icon: '□' },
              { label: 'Raise complaint', to: '/complaints', icon: '!' },
            ].map((action) => (
              <Link to={action.to} key={action.label}>
                <strong aria-hidden="true">{action.icon}</strong>
                <span>{action.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <div className="dashboard-bottom">
        <section className="dashboard-card activity-card">
          <div className="dashboard-card__heading">
            <h2>Recent activity</h2>
          </div>
          {data.collectedThisMonth > 0 ? (
            <ul className="activity-list">
              <li>
                <span className="activity-icon activity-icon--success">₹</span>
                <div>
                  <strong>Payment received</strong>
                  <small>Collection recorded for the society</small>
                </div>
                <time>Today</time>
              </li>
              <li>
                <span className="activity-icon activity-icon--warning">△</span>
                <div>
                  <strong>
                    {data.openComplaints ? 'New complaint raised' : 'No open complaints'}
                  </strong>
                  <small>
                    {data.openComplaints
                      ? `${data.openComplaints} complaints need attention`
                      : 'Everything is up to date'}
                  </small>
                </div>
                <time>Today</time>
              </li>
              <li>
                <span className="activity-icon activity-icon--info">□</span>
                <div>
                  <strong>Facility bookings updated</strong>
                  <small>{data.upcomingBookings} upcoming bookings</small>
                </div>
                <time>Today</time>
              </li>
            </ul>
          ) : (
            <p className="dashboard-empty">No recent activity to display.</p>
          )}
          <Link className="card-link" to="/audit">
            View all activity <span aria-hidden="true">→</span>
          </Link>
        </section>
        <section className="dashboard-card announcements-card">
          <div className="dashboard-card__heading">
            <h2>Announcements</h2>
          </div>
          <div className="dashboard-empty">
            <span aria-hidden="true">♢</span>
            <p>No announcements have been published yet.</p>
          </div>
          <a className="card-link" href="#announcements">
            View all announcements <span aria-hidden="true">→</span>
          </a>
        </section>
      </div>
    </div>
  );
}
