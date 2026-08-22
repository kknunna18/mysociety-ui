import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDateTime, titleCase } from '@/utils/format';
import type { Invoice, Payment, PaymentMethod } from '@/types';

const PAGE_SIZE = 8;
const FRIENDLY_ERROR = "We couldn't load payments";
const FRIENDLY_ERROR_MESSAGE = 'Payment information is temporarily unavailable. Please try again.';
type StatusFilter = 'all' | 'paid';
type DateFilter = 'all' | '30' | '90';

const paymentMethods: PaymentMethod[] = ['UPI', 'CARD', 'NETBANKING', 'CASH'];

const initials = (value: string): string =>
  value
    .split('-')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

function PaymentStatus() {
  return (
    <span className="payment-status payment-status--paid">
      <i aria-hidden="true" />
      Paid
    </span>
  );
}

function safeErrorMessage(_cause: unknown): string {
  return FRIENDLY_ERROR_MESSAGE;
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const canRecordPayment = user?.role === 'ADMIN' || user?.role === 'COMMITTEE';
  const { data: payments, error, loading, reload } = useAsync<Payment[]>(() => api.listPayments());
  const { data: invoices } = useAsync<Invoice[]>(() => api.listInvoices());
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [method, setMethod] = useState<'all' | PaymentMethod>('all');
  const [dateRange, setDateRange] = useState<DateFilter>('all');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const invoiceRef = useRef<HTMLSelectElement>(null);

  useEffect(() => setPage(1), [query, status, method, dateRange]);
  useEffect(() => {
    if (dialogOpen) invoiceRef.current?.focus();
  }, [dialogOpen]);

  const clearFilters = () => {
    setQuery('');
    setStatus('all');
    setMethod('all');
    setDateRange('all');
  };

  const filteredPayments = useMemo(() => {
    const search = query.trim().toLowerCase();
    const cutoff = dateRange === 'all' ? 0 : Date.now() - Number(dateRange) * 86400000;
    return (payments ?? []).filter((payment) => {
      const matchesSearch =
        !search ||
        [payment.id, payment.invoiceId, payment.reference, payment.residentId].some((field) =>
          field.toLowerCase().includes(search)
        );
      const matchesMethod = method === 'all' || payment.method === method;
      const matchesStatus = status === 'all';
      const matchesDate = dateRange === 'all' || new Date(payment.paidAt).getTime() >= cutoff;
      return matchesSearch && matchesMethod && matchesStatus && matchesDate;
    });
  }, [dateRange, method, payments, query, status]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const visiblePayments = filteredPayments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const collected = (payments ?? []).reduce((total, payment) => total + payment.amount, 0);
  const pending = (invoices ?? [])
    .filter((invoice) => invoice.status !== 'PAID')
    .reduce((total, invoice) => total + invoice.amount, 0);
  const filtersActive = Boolean(
    query || status !== 'all' || method !== 'all' || dateRange !== 'all'
  );

  const handleRecordPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!invoiceId) {
      setFormError('Select a bill before recording the payment.');
      invoiceRef.current?.focus();
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await api.recordPayment(invoiceId, paymentMethod);
      setDialogOpen(false);
      setInvoiceId('');
      setPaymentMethod('UPI');
      setSuccess('Payment recorded successfully.');
      reload();
    } catch (cause) {
      console.error('Payment recording failed', cause);
      setFormError(safeErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="payments-page">
      <header className="payments-header">
        <div>
          <h1>Payments</h1>
          <p>Track maintenance collections and resident payments.</p>
        </div>
        {canRecordPayment ? (
          <button
            className="primary"
            type="button"
            onClick={() => {
              setSuccess('');
              setFormError(null);
              setDialogOpen(true);
            }}
          >
            + Record payment
          </button>
        ) : null}
      </header>
      {success ? (
        <p className="payments-success" role="status" aria-live="polite">
          {success}
        </p>
      ) : null}
      {loading ? (
        <section className="payment-summary" aria-label="Payment summary">
          {[1, 2, 3, 4].map((item) => (
            <div className="payment-summary__skeleton" key={item} />
          ))}
        </section>
      ) : (
        <section className="payment-summary" aria-label="Payment summary">
          <div>
            <span>Total collected</span>
            <strong>{formatCurrency(collected)}</strong>
            <small>All recorded payments</small>
          </div>
          <div>
            <span>Pending amount</span>
            <strong>{formatCurrency(pending)}</strong>
            <small>Outstanding invoices</small>
          </div>
          <div>
            <span>Payments received</span>
            <strong>{payments?.length ?? 0}</strong>
            <small>Recorded transactions</small>
          </div>
          <div>
            <span>Collection rate</span>
            <strong>
              {collected + pending
                ? `${Math.round((collected / (collected + pending)) * 100)}%`
                : '0%'}
            </strong>
            <small>Collected vs pending</small>
          </div>
        </section>
      )}
      <section className="payment-toolbar" aria-label="Payment filters">
        <label className="payment-search">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Search payments"
            placeholder="Search by resident, unit or receipt number"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select
          aria-label="Payment status"
          value={status}
          onChange={(event) => setStatus(event.target.value as StatusFilter)}
        >
          <option value="all">All statuses</option>
          <option value="paid">Paid</option>
        </select>
        <select
          aria-label="Payment method"
          value={method}
          onChange={(event) => setMethod(event.target.value as 'all' | PaymentMethod)}
        >
          <option value="all">All methods</option>
          {paymentMethods.map((value) => (
            <option key={value} value={value}>
              {titleCase(value)}
            </option>
          ))}
        </select>
        <select
          aria-label="Payment date range"
          value={dateRange}
          onChange={(event) => setDateRange(event.target.value as DateFilter)}
        >
          <option value="all">All dates</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        {filtersActive ? (
          <button type="button" onClick={clearFilters}>
            Clear filters
          </button>
        ) : null}
        <button
          className="payment-refresh"
          type="button"
          aria-label="Refresh payments"
          disabled={loading}
          onClick={reload}
        >
          ↻
        </button>
      </section>
      {error ? (
        <div className="payment-error" role="alert" aria-live="assertive">
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
        <div className="payment-table-shell payment-loading" role="status" aria-live="polite">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} />
          ))}
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="payment-empty" role="status">
          <strong>
            {payments?.length ? 'No payments match your filters' : 'No payments recorded yet'}
          </strong>
          <p>
            {payments?.length
              ? 'Try changing your filters.'
              : 'Payments will appear here after they are recorded.'}
          </p>
          {filtersActive ? (
            <button type="button" onClick={clearFilters}>
              Clear filters
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="payment-table-shell">
            <table className="payments-table">
              <caption className="sr-only">Recorded payments</caption>
              <thead>
                <tr>
                  <th>Receipt number</th>
                  <th>Resident</th>
                  <th>Unit</th>
                  <th>Billing period</th>
                  <th className="amount-column">Amount</th>
                  <th>Payment method</th>
                  <th>Payment date</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visiblePayments.map((payment) => {
                  const invoice = invoices?.find((item) => item.id === payment.invoiceId);
                  return (
                    <tr key={payment.id}>
                      <td>
                        <strong>{payment.reference}</strong>
                        <small>{payment.id}</small>
                      </td>
                      <td>
                        <span className="payment-person">
                          <i aria-hidden="true">{initials(payment.residentId)}</i>
                          {payment.residentId}
                        </span>
                      </td>
                      <td>{invoice?.unit ?? '—'}</td>
                      <td>{invoice?.period ?? '—'}</td>
                      <td className="amount-column">
                        <strong>{formatCurrency(payment.amount)}</strong>
                      </td>
                      <td>{titleCase(payment.method)}</td>
                      <td>{formatDateTime(payment.paidAt)}</td>
                      <td>
                        <PaymentStatus />
                      </td>
                      <td>
                        <Link className="payment-view" to={`/payments#${payment.id}`}>
                          View details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {visiblePayments.map((payment) => {
              const invoice = invoices?.find((item) => item.id === payment.invoiceId);
              return (
                <article className="payment-mobile-card" key={`mobile-${payment.id}`}>
                  <div>
                    <span>Receipt</span>
                    <strong>{payment.reference}</strong>
                  </div>
                  <div>
                    <span>Resident</span>
                    <strong>{payment.residentId}</strong>
                  </div>
                  <div>
                    <span>Unit</span>
                    <strong>{invoice?.unit ?? '—'}</strong>
                  </div>
                  <div>
                    <span>Amount</span>
                    <strong>{formatCurrency(payment.amount)}</strong>
                  </div>
                  <div>
                    <span>Date</span>
                    <strong>{formatDateTime(payment.paidAt)}</strong>
                  </div>
                  <PaymentStatus />
                  <Link className="payment-view" to={`/payments#${payment.id}`}>
                    View details
                  </Link>
                </article>
              );
            })}
          </div>
          <footer className="payment-pagination">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}-
              {Math.min(page * PAGE_SIZE, filteredPayments.length)} of {filteredPayments.length}
            </span>
            <div>
              <button
                type="button"
                aria-label="Previous payments page"
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
                aria-label="Next payments page"
                disabled={page === totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                →
              </button>
            </div>
          </footer>
        </>
      )}
      {dialogOpen && canRecordPayment ? (
        <div
          className="payment-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDialogOpen(false);
          }}
        >
          <section
            className="payment-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-payment-title"
          >
            <header>
              <div>
                <h2 id="record-payment-title">Record payment</h2>
                <p>Record a payment against an outstanding bill.</p>
              </div>
              <button
                type="button"
                aria-label="Close record payment dialog"
                onClick={() => setDialogOpen(false)}
              >
                ×
              </button>
            </header>
            <form onSubmit={handleRecordPayment}>
              <label htmlFor="payment-invoice">
                Bill or billing period <b>*</b>
              </label>
              <select
                ref={invoiceRef}
                id="payment-invoice"
                value={invoiceId}
                onChange={(event) => setInvoiceId(event.target.value)}
                required
              >
                <option value="">Select an outstanding bill</option>
                {(invoices ?? [])
                  .filter((invoice) => invoice.status !== 'PAID')
                  .map((invoice) => (
                    <option value={invoice.id} key={invoice.id}>
                      {invoice.id} · {invoice.unit} · {formatCurrency(invoice.amount)}
                    </option>
                  ))}
              </select>
              <label htmlFor="payment-method">
                Payment method <b>*</b>
              </label>
              <select
                id="payment-method"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
              >
                {paymentMethods.map((value) => (
                  <option key={value} value={value}>
                    {titleCase(value)}
                  </option>
                ))}
              </select>
              {formError ? (
                <p className="state state--error" role="alert">
                  {formError}
                </p>
              ) : null}
              <div className="payment-dialog__actions">
                <button type="button" onClick={() => setDialogOpen(false)}>
                  Cancel
                </button>
                <button className="primary" type="submit" disabled={saving}>
                  {saving ? 'Recording payment...' : 'Record payment'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
