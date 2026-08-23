import { useState } from 'react';
import { api } from '@/api/client';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { DataTable, type Column } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { useAsync } from '@/hooks/useAsync';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Invoice } from '@/types';

export default function BillingPage() {
  const { data, error, loading, reload } = useAsync<Invoice[]>(() => api.listInvoices());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const markPaid = async (invoiceId: string) => {
    setBusyId(invoiceId);
    setActionError(null);
    try {
      await api.recordPayment(invoiceId, 'UPI');
      reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not record payment');
    } finally {
      setBusyId(null);
    }
  };

  const columns: Column<Invoice>[] = [
    { key: 'id', header: 'Invoice', render: (row) => row.id },
    { key: 'unit', header: 'Unit', render: (row) => row.unit },
    { key: 'period', header: 'Period', render: (row) => row.period },
    { key: 'amount', header: 'Amount', render: (row) => formatCurrency(row.amount) },
    { key: 'due', header: 'Due date', render: (row) => formatDate(row.dueDate) },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) =>
        row.status === 'PAID' ? (
          <span className="muted">Settled</span>
        ) : (
          <button type="button" disabled={busyId === row.id} onClick={() => markPaid(row.id)}>
            {busyId === row.id ? 'Recording…' : 'Record UPI payment'}
          </button>
        ),
    },
  ];

  return (
    <>
      <PageHeader title="Billing" description="Maintenance invoices raised for each unit." />
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
