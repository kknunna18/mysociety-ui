import { useState } from 'react';
import { api } from '@/api/client';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { DataTable, type Column } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { useAsync } from '@/hooks/useAsync';
import { formatDate } from '@/utils/format';
import type { Resident } from '@/types';

const columns: Column<Resident>[] = [
  { key: 'name', header: 'Name', render: (row) => row.name },
  { key: 'unit', header: 'Unit', render: (row) => row.unit },
  { key: 'ownership', header: 'Type', render: (row) => <StatusBadge status={row.ownership} /> },
  { key: 'email', header: 'Email', render: (row) => row.email },
  { key: 'phone', header: 'Phone', render: (row) => row.phone },
  { key: 'moveIn', header: 'Move-in', render: (row) => formatDate(row.moveInDate) },
  {
    key: 'active',
    header: 'Status',
    render: (row) => <StatusBadge status={row.active ? 'CONFIRMED' : 'CANCELLED'} />,
  },
];

export default function ResidentsPage() {
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ name: '', unit: '', email: '', phone: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { data, error, loading, reload } = useAsync<Resident[]>(
    () => api.listResidents(query),
    [query]
  );

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.createResident({
        ...form,
        ownership: 'OWNER',
        moveInDate: new Date().toISOString().slice(0, 10),
        active: true,
      });
      setForm({ name: '', unit: '', email: '', phone: '' });
      reload();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Could not add resident');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Residents" description="Owners and tenants registered in this society." />

      <form className="card" onSubmit={handleAdd}>
        <h2>Add resident</h2>
        <div className="form-grid">
          <div>
            <label htmlFor="resident-name">Name</label>
            <input
              id="resident-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="resident-unit">Unit</label>
            <input
              id="resident-unit"
              value={form.unit}
              onChange={(event) => setForm({ ...form, unit: event.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="resident-email">Email</label>
            <input
              id="resident-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="resident-phone">Phone</label>
            <input
              id="resident-phone"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              required
            />
          </div>
          <button className="primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Add resident'}
          </button>
        </div>
        {formError ? (
          <p className="state state--error" role="alert">
            {formError}
          </p>
        ) : null}
      </form>

      <div className="toolbar">
        <label htmlFor="resident-search" className="sr-label">
          Search residents
        </label>
        <input
          id="resident-search"
          placeholder="Search by name, unit or email"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <AsyncBoundary loading={loading} error={error} onRetry={reload}>
        <DataTable
          columns={columns}
          rows={data ?? []}
          rowKey={(row) => row.id}
          emptyMessage="No residents match your search."
        />
      </AsyncBoundary>
    </>
  );
}
