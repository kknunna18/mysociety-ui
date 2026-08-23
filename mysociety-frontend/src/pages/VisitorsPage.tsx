import { useState } from 'react';
import { api } from '@/api/client';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { DataTable, type Column } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { useAsync } from '@/hooks/useAsync';
import { formatDateTime } from '@/utils/format';
import type { Visitor } from '@/types';

export default function VisitorsPage() {
  const { data, error, loading, reload } = useAsync<Visitor[]>(() => api.listVisitors());
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
      reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Gate action failed');
    }
  };

  const columns: Column<Visitor>[] = [
    { key: 'name', header: 'Visitor', render: (row) => row.name },
    { key: 'unit', header: 'Unit', render: (row) => row.unit },
    { key: 'purpose', header: 'Purpose', render: (row) => row.purpose },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'expected', header: 'Expected', render: (row) => formatDateTime(row.expectedAt) },
    {
      key: 'in',
      header: 'Checked in',
      render: (row) => (row.checkedInAt ? formatDateTime(row.checkedInAt) : '—'),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => {
        if (row.status === 'EXPECTED') {
          return (
            <button type="button" onClick={() => run(() => api.checkInVisitor(row.id))}>
              Check in
            </button>
          );
        }
        if (row.status === 'CHECKED_IN') {
          return (
            <button type="button" onClick={() => run(() => api.checkOutVisitor(row.id))}>
              Check out
            </button>
          );
        }
        return <span className="muted">—</span>;
      },
    },
  ];

  return (
    <>
      <PageHeader title="Visitors" description="Gate register for expected and on-site visitors." />
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
