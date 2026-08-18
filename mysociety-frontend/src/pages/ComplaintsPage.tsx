import { useState } from 'react';
import { api } from '@/api/client';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { DataTable, type Column } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTime, titleCase } from '@/utils/format';
import type { Complaint, ComplaintStatus } from '@/types';

const NEXT_STATUS: Record<ComplaintStatus, ComplaintStatus | null> = {
  OPEN: 'IN_PROGRESS',
  IN_PROGRESS: 'RESOLVED',
  RESOLVED: 'CLOSED',
  CLOSED: null,
};

export default function ComplaintsPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useAsync<Complaint[]>(() => api.listComplaints());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Complaint['priority']>('MEDIUM');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const raise = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setActionError(null);
    try {
      await api.createComplaint({
        residentId: user?.id ?? 'res-001',
        unit: user?.unit ?? 'A-402',
        category: 'OTHER',
        title,
        description,
        priority,
      });
      setTitle('');
      setDescription('');
      reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not raise complaint');
    } finally {
      setBusy(false);
    }
  };

  const advance = async (complaint: Complaint) => {
    const next = NEXT_STATUS[complaint.status];
    if (!next) return;
    setActionError(null);
    try {
      await api.updateComplaintStatus(complaint.id, next);
      reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not update complaint');
    }
  };

  const columns: Column<Complaint>[] = [
    { key: 'title', header: 'Title', render: (row) => row.title },
    { key: 'unit', header: 'Unit', render: (row) => row.unit },
    { key: 'category', header: 'Category', render: (row) => titleCase(row.category) },
    { key: 'priority', header: 'Priority', render: (row) => titleCase(row.priority) },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'updated', header: 'Updated', render: (row) => formatDateTime(row.updatedAt) },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => {
        const next = NEXT_STATUS[row.status];
        return next ? (
          <button type="button" onClick={() => advance(row)}>
            Move to {titleCase(next)}
          </button>
        ) : (
          <span className="muted">Done</span>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader title="Complaints" description="Track and resolve resident complaints." />

      <form className="card" onSubmit={raise}>
        <h2>Raise a complaint</h2>
        <div className="form-grid">
          <div>
            <label htmlFor="complaint-title">Title</label>
            <input
              id="complaint-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="complaint-description">Description</label>
            <input
              id="complaint-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="complaint-priority">Priority</label>
            <select
              id="complaint-priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value as Complaint['priority'])}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
          <button className="primary" type="submit" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </form>

      {actionError ? (
        <p className="state state--error" role="alert">
          {actionError}
        </p>
      ) : null}

      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        <DataTable columns={columns} rows={data ?? []} rowKey={(row) => row.id} />
      </AsyncBoundary>
    </>
  );
}
