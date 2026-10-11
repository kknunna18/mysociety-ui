import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  LinearProgress,
  MenuItem,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Refresh } from '@mui/icons-material';
import { api } from '@/api/client';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format';
import type { BillingRun, ChargeHead, FinanceInvoice, FinancePayment, PaymentMethod } from '@/types';

const TABS = ['invoices', 'payments', 'billing-runs', 'charge-heads'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  invoices: 'Invoices',
  payments: 'Payments',
  'billing-runs': 'Billing runs',
  'charge-heads': 'Charge heads',
};
const MANAGER_ROLES = ['ADMIN', 'COMMITTEE', 'ACCOUNTANT', 'PLATFORM_ADMIN'];
const METHODS: PaymentMethod[] = ['UPI', 'CARD', 'NETBANKING', 'CASH'];

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  PAID: 'success',
  CONFIRMED: 'success',
  PUBLISHED: 'info',
  PARTIALLY_PAID: 'warning',
  CREATED: 'warning',
  DRAFT: 'default',
  OVERDUE: 'error',
  CANCELLED: 'default',
};

const label = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');
const shortId = (id: string) => id.slice(0, 8).toUpperCase();

function StatusChip({ status }: { status: string }) {
  return <Chip size="small" color={STATUS_COLOR[status] ?? 'default'} label={label(status)} />;
}

function Stat({ title, value, hint, color }: { title: string; value: string; hint: string; color: string }) {
  return (
    <Card variant="outlined" sx={{ borderLeft: `4px solid ${color}`, height: '100%' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h5" fontWeight={700}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      </CardContent>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
      <Typography>{text}</Typography>
    </Box>
  );
}

const errorText = (cause: unknown) => (cause instanceof Error ? cause.message : 'Something went wrong');

export default function FinancePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const canManage = MANAGER_ROLES.includes(user?.role ?? '');
  const tab: Tab = TABS.find((t) => pathname.endsWith(`/${t}`)) ?? 'invoices';

  const invoices = useAsync<FinanceInvoice[]>(() => api.listFinanceInvoices());
  const payments = useAsync<FinancePayment[]>(() => api.listFinancePayments());
  const runs = useAsync<BillingRun[]>(() => api.listBillingRuns());
  const heads = useAsync<ChargeHead[]>(() => api.listChargeHeads());

  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [payTarget, setPayTarget] = useState<FinanceInvoice | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [runOpen, setRunOpen] = useState(false);
  const [headOpen, setHeadOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState({ runNumber: '', billingPeriod: '', periodStart: '', periodEnd: '', dueDate: '' });
  const [head, setHead] = useState({ code: '', name: '', defaultAmount: '' });

  const stats = useMemo(() => {
    const list = invoices.data ?? [];
    const now = Date.now();
    const open = list.filter((i) => i.outstandingAmount > 0 && i.status !== 'CANCELLED');
    return {
      billed: list.reduce((s, i) => s + i.totalAmount, 0),
      collected: list.reduce((s, i) => s + i.paidAmount, 0),
      outstanding: open.reduce((s, i) => s + i.outstandingAmount, 0),
      overdue: open.filter((i) => new Date(i.dueDate).getTime() < now).length,
    };
  }, [invoices.data]);

  const act = async (work: () => Promise<unknown>, success: string, done: () => void) => {
    setBusy(true);
    try {
      await work();
      setToast({ message: success, severity: 'success' });
      done();
    } catch (cause) {
      setToast({ message: errorText(cause), severity: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const refreshAll = () => {
    invoices.reload();
    payments.reload();
    runs.reload();
    heads.reload();
  };

  const submitPayment = () =>
    payTarget &&
    act(
      () => api.payFinanceInvoice(payTarget.id, method),
      `Payment recorded for ${payTarget.invoiceNumber}`,
      () => {
        setPayTarget(null);
        invoices.reload();
        payments.reload();
      }
    );

  const submitRun = () =>
    act(() => api.createBillingRun(run), 'Billing run created', () => {
      setRunOpen(false);
      setRun({ runNumber: '', billingPeriod: '', periodStart: '', periodEnd: '', dueDate: '' });
      runs.reload();
    });

  const submitHead = () =>
    act(
      () =>
        api.createChargeHead({
          code: head.code.trim().toUpperCase(),
          name: head.name.trim(),
          defaultAmount: head.defaultAmount === '' ? null : Number(head.defaultAmount),
        }),
      'Charge head created',
      () => {
        setHeadOpen(false);
        setHead({ code: '', name: '', defaultAmount: '' });
        heads.reload();
      }
    );

  const runValid = Object.values(run).every((v) => v.trim() !== '');
  const headValid = head.code.trim() !== '' && head.name.trim() !== '' && (head.defaultAmount === '' || Number(head.defaultAmount) >= 0);
  const active = { invoices, payments, 'billing-runs': runs, 'charge-heads': heads }[tab];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={2}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Finance
          </Typography>
          <Typography color="text.secondary">Invoices, payments, billing runs and charge heads for your society.</Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button startIcon={<Refresh />} onClick={refreshAll}>
            Refresh
          </Button>
          {canManage && tab === 'billing-runs' ? (
            <Button variant="contained" startIcon={<Add />} onClick={() => setRunOpen(true)}>
              New billing run
            </Button>
          ) : null}
          {canManage && tab === 'charge-heads' ? (
            <Button variant="contained" startIcon={<Add />} onClick={() => setHeadOpen(true)}>
              New charge head
            </Button>
          ) : null}
        </Stack>
      </Stack>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Stat title="Total billed" value={formatCurrency(stats.billed)} hint={`${invoices.data?.length ?? 0} invoices`} color="#1565c0" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Stat title="Collected" value={formatCurrency(stats.collected)} hint="Allocated payments" color="#2e7d32" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Stat title="Outstanding" value={formatCurrency(stats.outstanding)} hint="Awaiting payment" color="#ef6c00" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Stat title="Overdue invoices" value={String(stats.overdue)} hint="Past due date" color="#c62828" />
        </Grid>
      </Grid>

      <Card variant="outlined">
        <Tabs value={tab} onChange={(_, value: Tab) => navigate(`/${value}`)} variant="scrollable" sx={{ borderBottom: 1, borderColor: 'divider' }}>
          {TABS.map((t) => (
            <Tab key={t} value={t} label={TAB_LABEL[t]} />
          ))}
        </Tabs>
        {active.loading ? <LinearProgress /> : null}
        {active.error ? (
          <Alert severity="error" action={<Button onClick={active.reload}>Retry</Button>} sx={{ m: 2 }}>
            Could not load {TAB_LABEL[tab].toLowerCase()}. {errorText(active.error)}
          </Alert>
        ) : null}

        {tab === 'invoices' ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Invoice</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Period</TableCell>
                  <TableCell>Due</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Paid</TableCell>
                  <TableCell align="right">Outstanding</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {(invoices.data ?? []).map((i) => (
                  <TableRow key={i.id} hover>
                    <TableCell>
                      <b>{i.invoiceNumber}</b>
                    </TableCell>
                    <TableCell>{shortId(i.unitId)}</TableCell>
                    <TableCell>{i.billingPeriod}</TableCell>
                    <TableCell>{formatDate(i.dueDate)}</TableCell>
                    <TableCell align="right">{formatCurrency(i.totalAmount)}</TableCell>
                    <TableCell align="right">{formatCurrency(i.paidAmount)}</TableCell>
                    <TableCell align="right">{formatCurrency(i.outstandingAmount)}</TableCell>
                    <TableCell>
                      <StatusChip status={i.status} />
                    </TableCell>
                    <TableCell align="right">
                      {canManage && i.outstandingAmount > 0 && i.status !== 'CANCELLED' && i.status !== 'DRAFT' ? (
                        <Button size="small" variant="outlined" onClick={() => setPayTarget(i)}>
                          Record payment
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!invoices.loading && !(invoices.data ?? []).length ? <Empty text="No invoices yet." /> : null}
          </TableContainer>
        ) : null}

        {tab === 'payments' ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Reference</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Provider</TableCell>
                  <TableCell align="right">Requested</TableCell>
                  <TableCell align="right">Confirmed</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(payments.data ?? []).map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      <b>{p.paymentReference.slice(0, 12)}</b>
                    </TableCell>
                    <TableCell>{shortId(p.unitId)}</TableCell>
                    <TableCell>{p.provider}</TableCell>
                    <TableCell align="right">{formatCurrency(p.requestedAmount)}</TableCell>
                    <TableCell align="right">{formatCurrency(p.confirmedAmount)}</TableCell>
                    <TableCell>{formatDateTime(p.confirmedAt ?? p.createdAt)}</TableCell>
                    <TableCell>
                      <StatusChip status={p.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!payments.loading && !(payments.data ?? []).length ? <Empty text="No payments recorded yet." /> : null}
          </TableContainer>
        ) : null}

        {tab === 'billing-runs' ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Run</TableCell>
                  <TableCell>Period</TableCell>
                  <TableCell>Range</TableCell>
                  <TableCell>Due</TableCell>
                  <TableCell align="right">Units</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {(runs.data ?? []).map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <b>{r.runNumber}</b>
                    </TableCell>
                    <TableCell>{r.billingPeriod}</TableCell>
                    <TableCell>
                      {formatDate(r.periodStart)} – {formatDate(r.periodEnd)}
                    </TableCell>
                    <TableCell>{formatDate(r.dueDate)}</TableCell>
                    <TableCell align="right">{r.totalUnits}</TableCell>
                    <TableCell align="right">{formatCurrency(r.totalAmount)}</TableCell>
                    <TableCell>
                      <StatusChip status={r.status} />
                    </TableCell>
                    <TableCell align="right">
                      {canManage && r.status === 'DRAFT' ? (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={busy}
                          onClick={() => act(() => api.publishBillingRun(r.id), `${r.runNumber} published`, runs.reload)}
                        >
                          Publish
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!runs.loading && !(runs.data ?? []).length ? <Empty text="No billing runs yet." /> : null}
          </TableContainer>
        ) : null}

        {tab === 'charge-heads' ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Calculation</TableCell>
                  <TableCell align="right">Default amount</TableCell>
                  <TableCell align="right">Tax %</TableCell>
                  <TableCell>Recurring</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(heads.data ?? []).map((h) => (
                  <TableRow key={h.id} hover>
                    <TableCell>
                      <b>{h.code}</b>
                    </TableCell>
                    <TableCell>{h.name}</TableCell>
                    <TableCell>{label(h.calculationType)}</TableCell>
                    <TableCell align="right">{h.defaultAmount == null ? '—' : formatCurrency(Number(h.defaultAmount))}</TableCell>
                    <TableCell align="right">{h.taxPercentage}</TableCell>
                    <TableCell>{h.recurring ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <Chip size="small" color={h.active ? 'success' : 'default'} label={h.active ? 'Active' : 'Inactive'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!heads.loading && !(heads.data ?? []).length ? <Empty text="No charge heads yet." /> : null}
          </TableContainer>
        ) : null}
      </Card>

      <Dialog open={Boolean(payTarget)} onClose={() => setPayTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Record payment</DialogTitle>
        <DialogContent>
          <Stack gap={2} mt={1}>
            <Typography>
              {payTarget?.invoiceNumber} · outstanding <b>{formatCurrency(payTarget?.outstandingAmount ?? 0)}</b>
            </Typography>
            <TextField select label="Payment method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {METHODS.map((m) => (
                <MenuItem key={m} value={m}>
                  {label(m)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayTarget(null)}>Cancel</Button>
          <Button variant="contained" disabled={busy} onClick={submitPayment}>
            Record full amount
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={runOpen} onClose={() => setRunOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New billing run</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={0}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Run number" value={run.runNumber} onChange={(e) => setRun({ ...run, runNumber: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Billing period" placeholder="2026-10" value={run.billingPeriod} onChange={(e) => setRun({ ...run, billingPeriod: e.target.value })} />
            </Grid>
            {(['periodStart', 'periodEnd', 'dueDate'] as const).map((key) => (
              <Grid item xs={12} sm={4} key={key}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  label={{ periodStart: 'Period start', periodEnd: 'Period end', dueDate: 'Due date' }[key]}
                  InputLabelProps={{ shrink: true }}
                  value={run[key]}
                  onChange={(e) => setRun({ ...run, [key]: e.target.value })}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRunOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={busy || !runValid} onClick={submitRun}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={headOpen} onClose={() => setHeadOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New charge head</DialogTitle>
        <DialogContent>
          <Stack gap={2} mt={1}>
            <TextField required label="Code" value={head.code} onChange={(e) => setHead({ ...head, code: e.target.value })} />
            <TextField required label="Name" value={head.name} onChange={(e) => setHead({ ...head, name: e.target.value })} />
            <TextField type="number" label="Default amount (₹)" value={head.defaultAmount} onChange={(e) => setHead({ ...head, defaultAmount: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHeadOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={busy || !headValid} onClick={submitHead}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)}>
        {toast ? <Alert severity={toast.severity}>{toast.message}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
