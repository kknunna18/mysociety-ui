import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { useAsync } from '@/hooks/useAsync';
import { formatDate } from '@/utils/format';
import { useAuth } from '@/hooks/useAuth';
import type { Resident } from '@/types';

const PAGE_SIZE = 8;
const FRIENDLY_ERROR = "We couldn't load residents";
const FRIENDLY_ERROR_MESSAGE = 'Resident information is temporarily unavailable. Please try again.';
type TypeFilter = 'all' | 'OWNER' | 'TENANT' | 'FAMILY';
type StatusFilter = 'all' | 'active' | 'inactive' | 'pending';

const initials = (name: string): string =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

function safeErrorMessage(cause: unknown): string {
  if (!(cause instanceof Error)) return FRIENDLY_ERROR_MESSAGE;
  return /html|doctype|404|not found/i.test(cause.message)
    ? FRIENDLY_ERROR_MESSAGE
    : FRIENDLY_ERROR_MESSAGE;
}

function ResidentStatus({ active }: { active: boolean }) {
  return (
    <span className={`resident-status resident-status--${active ? 'active' : 'inactive'}`}>
      <i aria-hidden="true" />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function ResidentIdentity({ resident }: { resident: Resident }) {
  return (
    <div className="resident-identity">
      <span className="resident-avatar" aria-hidden="true">
        {initials(resident.name)}
      </span>
      <span>
        <strong>{resident.name}</strong>
        <small>{resident.email}</small>
      </span>
    </div>
  );
}

export default function ResidentsPage() {
  const { user } = useAuth();
  const canManageResidents = user?.role === 'ADMIN' || user?.role === 'COMMITTEE';
  const [draftQuery, setDraftQuery] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ name: '', unit: '', email: '', phone: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const firstInvalidRef = useRef<HTMLInputElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const { data, error, loading, reload } = useAsync<Resident[]>(
    () => api.listResidents(query),
    [query]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(draftQuery.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [draftQuery]);

  useEffect(() => {
    setPage(1);
  }, [query, typeFilter, statusFilter]);

  useEffect(() => {
    if (!dialogOpen) {
      addButtonRef.current?.focus();
      return undefined;
    }
    firstInvalidRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDialogOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dialogOpen]);

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !form.name.trim() ||
      !form.unit.trim() ||
      !form.email.trim() ||
      !/^\+?[0-9 ()-]{7,}$/.test(form.phone)
    ) {
      setFormError('Enter a name, unit, valid email and valid mobile number.');
      firstInvalidRef.current?.focus();
      return;
    }
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
      setDialogOpen(false);
      setSuccess('Resident added successfully.');
      reload();
    } catch (cause) {
      setFormError(safeErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const residents = useMemo(
    () =>
      (data ?? []).filter((resident) => {
        const typeMatches =
          typeFilter === 'all' ||
          (typeFilter === 'FAMILY' ? false : resident.ownership === typeFilter);
        const statusMatches =
          statusFilter === 'all' ||
          (statusFilter === 'active'
            ? resident.active
            : statusFilter === 'inactive'
              ? !resident.active
              : false);
        return typeMatches && statusMatches;
      }),
    [data, statusFilter, typeFilter]
  );
  const totalPages = Math.max(1, Math.ceil(residents.length / PAGE_SIZE));
  const visibleResidents = residents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtersActive = Boolean(draftQuery || typeFilter !== 'all' || statusFilter !== 'all');
  const clearFilters = () => {
    setDraftQuery('');
    setQuery('');
    setTypeFilter('all');
    setStatusFilter('all');
  };

  return (
    <div className="residents-page">
      <header className="residents-header">
        <div>
          <h1>Residents</h1>
          <p>Manage owners, tenants and household members in your society.</p>
        </div>
        {canManageResidents ? (
          <button
            ref={addButtonRef}
            className="primary"
            type="button"
            onClick={() => {
              setSuccess('');
              setFormError(null);
              setDialogOpen(true);
            }}
          >
            + Add resident
          </button>
        ) : null}
      </header>
      {success ? (
        <p className="residents-success" role="status" aria-live="polite">
          {success}
        </p>
      ) : null}
      <section className="resident-summary" aria-label="Resident summary">
        <div>
          <span>Total residents</span>
          <strong>{data?.length ?? 0}</strong>
        </div>
        <div>
          <span>Owners</span>
          <strong>{data?.filter((resident) => resident.ownership === 'OWNER').length ?? 0}</strong>
        </div>
        <div>
          <span>Tenants</span>
          <strong>{data?.filter((resident) => resident.ownership === 'TENANT').length ?? 0}</strong>
        </div>
        <div>
          <span>Occupied units</span>
          <strong>{data?.filter((resident) => resident.active).length ?? 0}</strong>
        </div>
      </section>
      <section className="resident-toolbar" aria-label="Resident filters">
        <label className="resident-search">
          <span aria-hidden="true">⌕</span>
          <input
            id="resident-search"
            placeholder="Search by name, unit, email or phone"
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
          />
          <span className="sr-label">Search residents</span>
        </label>
        <select
          aria-label="Occupancy type"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
        >
          <option value="all">All types</option>
          <option value="OWNER">Owner</option>
          <option value="TENANT">Tenant</option>
          <option value="FAMILY">Family member</option>
        </select>
        <select
          aria-label="Resident status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
        {filtersActive ? (
          <button type="button" onClick={clearFilters}>
            Clear filters
          </button>
        ) : null}
        <button
          className="resident-refresh"
          type="button"
          aria-label="Refresh residents"
          disabled={loading}
          onClick={reload}
        >
          ↻
        </button>
      </section>
      {error ? (
        <div className="resident-error" role="alert" aria-live="assertive">
          <span aria-hidden="true">!</span>
          <div>
            <strong>{FRIENDLY_ERROR}</strong>
            <p>{FRIENDLY_ERROR_MESSAGE}</p>
            <button type="button" onClick={reload}>
              Retry
            </button>
            {filtersActive ? (
              <button type="button" onClick={clearFilters}>
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
      ) : loading ? (
        <div className="resident-table-shell" role="status" aria-live="polite">
          <span className="sr-only">Loading residents...</span>
          {[1, 2, 3, 4].map((item) => (
            <div className="resident-skeleton" key={item} />
          ))}
        </div>
      ) : visibleResidents.length === 0 ? (
        <div className="resident-empty" role="status">
          <strong>
            {filtersActive ? 'No residents match your search.' : 'No residents found'}
          </strong>
          <p>
            {filtersActive
              ? 'Try changing your filters.'
              : 'Try changing your filters or add the first resident.'}
          </p>
          {filtersActive ? (
            <button type="button" onClick={clearFilters}>
              Clear filters
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="resident-table-shell">
            <table className="residents-table">
              <caption className="sr-only">Residents in Green Valley Apartments</caption>
              <thead>
                <tr>
                  <th scope="col">Resident</th>
                  <th scope="col">Unit</th>
                  <th scope="col">Membership</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Status</th>
                  <th scope="col">Joined date</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleResidents.map((resident) => (
                  <tr key={resident.id}>
                    <td>
                      <ResidentIdentity resident={resident} />
                    </td>
                    <td>
                      <strong>{resident.unit}</strong>
                    </td>
                    <td>
                      <span className="membership-chip">
                        {resident.ownership === 'OWNER' ? 'Owner' : 'Tenant'}
                      </span>
                    </td>
                    <td>
                      <span className="contact-cell">
                        {resident.email}
                        <small>{resident.phone}</small>
                      </span>
                    </td>
                    <td>
                      <ResidentStatus active={resident.active} />
                    </td>
                    <td>{formatDate(resident.moveInDate)}</td>
                    <td>
                      <Link className="resident-view" to={`/residents#${resident.id}`}>
                        View details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleResidents.map((resident) => (
              <article className="resident-mobile-card" key={`mobile-${resident.id}`}>
                <ResidentIdentity resident={resident} />
                <div>
                  <span>Unit</span>
                  <strong>{resident.unit}</strong>
                </div>
                <div>
                  <span>Membership</span>
                  <strong>{resident.ownership === 'OWNER' ? 'Owner' : 'Tenant'}</strong>
                </div>
                <div>
                  <span>Contact</span>
                  <strong>{resident.phone}</strong>
                </div>
                <ResidentStatus active={resident.active} />
                <Link className="resident-view" to={`/residents#${resident.id}`}>
                  View details
                </Link>
              </article>
            ))}
          </div>
          <footer className="resident-pagination">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, residents.length)} of{' '}
              {residents.length}
            </span>
            <div>
              <button
                type="button"
                aria-label="Previous page"
                disabled={page === 1}
                onClick={() => setPage((value) => value - 1)}
              >
                ←
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                aria-label="Next page"
                disabled={page === totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                →
              </button>
            </div>
          </footer>
        </>
      )}
      {dialogOpen && canManageResidents ? (
        <div
          className="resident-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDialogOpen(false);
          }}
        >
          <section
            className="resident-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-resident-title"
          >
            <div className="resident-dialog__header">
              <div>
                <h2 id="add-resident-title">Add resident</h2>
                <p>Add a new household member to your society.</p>
              </div>
              <button
                type="button"
                aria-label="Close add resident dialog"
                onClick={() => setDialogOpen(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="resident-form-grid">
                <div>
                  <label htmlFor="resident-name">
                    Full name <b>*</b>
                  </label>
                  <input
                    ref={firstInvalidRef}
                    id="resident-name"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="resident-unit">
                    Unit <b>*</b>
                  </label>
                  <input
                    id="resident-unit"
                    value={form.unit}
                    onChange={(event) => setForm({ ...form, unit: event.target.value })}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="resident-email">
                    Email <b>*</b>
                  </label>
                  <input
                    id="resident-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="resident-phone">
                    Mobile number <b>*</b>
                  </label>
                  <input
                    id="resident-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    required
                  />
                </div>
              </div>
              {formError ? (
                <p className="state state--error" role="alert">
                  {formError}
                </p>
              ) : null}
              <div className="resident-dialog__actions">
                <button type="button" onClick={() => setDialogOpen(false)}>
                  Cancel
                </button>
                <button className="primary" type="submit" disabled={saving}>
                  {saving ? 'Adding resident...' : 'Add resident'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
