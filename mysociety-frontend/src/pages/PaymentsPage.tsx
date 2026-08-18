import { api } from '@/api/client';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { DataTable, type Column } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { useAsync } from '@/hooks/useAsync';
import { formatCurrency, formatDateTime, titleCase } from '@/utils/format';
import type { Payment } from '@/types';

const columns: Column<Payment>[] = [
  { key: 'id', header: 'Payment', render: (row) => row.id },
  { key: 'invoice', header: 'Invoice', render: (row) => row.invoiceId },
  { key: 'amount', header: 'Amount', render: (row) => formatCurrency(row.amount) },
  { key: 'method', header: 'Method', render: (row) => titleCase(row.method) },
  { key: 'paidAt', header: 'Paid at', render: (row) => formatDateTime(row.paidAt) },
  { key: 'reference', header: 'Reference', render: (row) => row.reference },
];

export default function PaymentsPage() {
  const { data, error, loading, reload } = useAsync<Payment[]>(() => api.listPayments());

  return (
    <>
      <PageHeader title="Payments" description="Receipts recorded against maintenance invoices." />
      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        <DataTable
          columns={columns}
          rows={data ?? []}
          rowKey={(row) => row.id}
          emptyMessage="No payments recorded yet."
        />
      </AsyncBoundary>
    </>
  );
}
