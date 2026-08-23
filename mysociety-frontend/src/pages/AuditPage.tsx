import { api } from '@/api/client';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { DataTable, type Column } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { useAsync } from '@/hooks/useAsync';
import { formatDateTime, titleCase } from '@/utils/format';
import type { AuditEntry } from '@/types';

const columns: Column<AuditEntry>[] = [
  { key: 'at', header: 'When', render: (row) => formatDateTime(row.at) },
  { key: 'actor', header: 'Actor', render: (row) => row.actor },
  { key: 'action', header: 'Action', render: (row) => titleCase(row.action) },
  { key: 'entity', header: 'Entity', render: (row) => `${row.entity} · ${row.entityId}` },
];

export default function AuditPage() {
  const { data, error, loading, reload } = useAsync<AuditEntry[]>(() => api.listAudit());

  return (
    <>
      <PageHeader title="Audit log" description="Every state change recorded for this society." />
      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        <DataTable columns={columns} rows={data ?? []} rowKey={(row) => row.id} />
      </AsyncBoundary>
    </>
  );
}
