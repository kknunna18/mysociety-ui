import { useState } from 'react';
import { api } from '@/api/client';
import { AsyncBoundary } from '@/components/AsyncBoundary';
import { DataTable, type Column } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/utils/format';
import type { Booking, Facility } from '@/types';

const SLOTS = ['07:00-08:00', '10:00-12:00', '16:00-18:00', '18:00-21:00'];

export default function BookingsPage() {
  const { user } = useAuth();
  const facilities = useAsync<Facility[]>(() => api.listFacilities());
  const bookings = useAsync<Booking[]>(() => api.listBookings());
  const [facilityId, setFacilityId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState(SLOTS[0]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedFacility = facilityId || facilities.data?.[0]?.id || '';

  const book = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setActionError(null);
    try {
      await api.createBooking({
        facilityId: selectedFacility,
        residentId: user?.id ?? 'res-001',
        unit: user?.unit ?? 'A-402',
        date,
        slot,
      });
      bookings.reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not create booking');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: string) => {
    setActionError(null);
    try {
      await api.cancelBooking(id);
      bookings.reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not cancel booking');
    }
  };

  const columns: Column<Booking>[] = [
    { key: 'facility', header: 'Facility', render: (row) => row.facilityName },
    { key: 'unit', header: 'Unit', render: (row) => row.unit },
    { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
    { key: 'slot', header: 'Slot', render: (row) => row.slot },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) =>
        row.status === 'CANCELLED' ? (
          <span className="muted">—</span>
        ) : (
          <button type="button" onClick={() => cancel(row.id)}>
            Cancel
          </button>
        ),
    },
  ];

  return (
    <>
      <PageHeader title="Facility bookings" description="Reserve the clubhouse, gym or courts." />

      <form className="card" onSubmit={book}>
        <h2>New booking</h2>
        <div className="form-grid">
          <div>
            <label htmlFor="booking-facility">Facility</label>
            <select
              id="booking-facility"
              value={selectedFacility}
              onChange={(event) => setFacilityId(event.target.value)}
            >
              {(facilities.data ?? []).map((facility) => (
                <option key={facility.id} value={facility.id}>
                  {facility.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="booking-date">Date</label>
            <input
              id="booking-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="booking-slot">Slot</label>
            <select
              id="booking-slot"
              value={slot}
              onChange={(event) => setSlot(event.target.value)}
            >
              {SLOTS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <button className="primary" type="submit" disabled={busy || !selectedFacility}>
            {busy ? 'Booking…' : 'Request booking'}
          </button>
        </div>
      </form>

      {actionError ? (
        <p className="state state--error" role="alert">
          {actionError}
        </p>
      ) : null}

      <AsyncBoundary loading={bookings.loading} error={bookings.error} onRetry={bookings.reload}>
        <DataTable columns={columns} rows={bookings.data ?? []} rowKey={(row) => row.id} />
      </AsyncBoundary>
    </>
  );
}
