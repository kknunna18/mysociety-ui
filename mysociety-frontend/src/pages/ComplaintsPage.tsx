import { useMemo, useState } from 'react';
import {
  Add,
  AccessTime,
  Bolt,
  CheckCircleOutline,
  ErrorOutline,
  Refresh,
  Search,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { api } from '@/api/client';
import { useAsync } from '@/hooks/useAsync';
import { formatDateTime, titleCase } from '@/utils/format';
import type { Complaint, ComplaintPriority, ComplaintStatus } from '@/types';

const CATEGORIES = ['PLUMBING', 'ELECTRICAL', 'HOUSEKEEPING', 'SECURITY', 'LIFT', 'PARKING', 'OTHER'];
const PRIORITIES: ComplaintPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// Mirrors the allowed transitions enforced by the operations service.
const NEXT_STATUSES: Record<ComplaintStatus, ComplaintStatus[]> = {
  OPEN: ['UNDER_REVIEW', 'ASSIGNED', 'REJECTED'],
  UNDER_REVIEW: ['ASSIGNED', 'REJECTED'],
  ASSIGNED: ['IN_PROGRESS', 'OPEN'],
  IN_PROGRESS: ['WAITING_FOR_RESIDENT', 'RESOLVED'],
  WAITING_FOR_RESIDENT: ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  REOPENED: ['ASSIGNED', 'IN_PROGRESS'],
  CLOSED: [],
  REJECTED: [],
};

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

const PRIORITY_COLOR: Record<ComplaintPriority, ChipColor> = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'error',
};

const STATUS_COLOR: Record<ComplaintStatus, ChipColor> = {
  OPEN: 'error',
  UNDER_REVIEW: 'warning',
  ASSIGNED: 'info',
  IN_PROGRESS: 'primary',
  WAITING_FOR_RESIDENT: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
  REOPENED: 'error',
  REJECTED: 'default',
};

const CLOSED_STATES: ComplaintStatus[] = ['RESOLVED', 'CLOSED', 'REJECTED'];

type Filter = 'ALL' | 'ACTIVE' | 'RESOLVED';

const isActive = (c: Complaint) => !CLOSED_STATES.includes(c.status);
const isBreached = (c: Complaint) =>
  isActive(c) && !!c.slaDueAt && new Date(c.slaDueAt).getTime() < Date.now();

function slaLabel(c: Complaint): { text: string; color: ChipColor } | null {
  if (!c.slaDueAt || !isActive(c)) return null;
  const hours = (new Date(c.slaDueAt).getTime() - Date.now()) / 36e5;
  if (hours < 0) return { text: `Overdue by ${Math.ceil(-hours)}h`, color: 'error' };
  if (hours < 12) return { text: `Due in ${Math.ceil(hours)}h`, color: 'warning' };
  return { text: `Due in ${Math.ceil(hours / 24)}d`, color: 'success' };
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              color,
              bgcolor: `${color}1f`,
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ComplaintCard({
  complaint,
  onMove,
  moving,
}: {
  complaint: Complaint;
  onMove: (c: Complaint, next: ComplaintStatus) => void;
  moving: boolean;
}) {
  const sla = slaLabel(complaint);
  const options = NEXT_STATUSES[complaint.status] ?? [];
  const accent = complaint.priority === 'CRITICAL' ? '#d32f2f' : complaint.priority === 'HIGH' ? '#ed6c02' : '#1976d2';

  return (
    <Card sx={{ height: '100%', borderLeft: `5px solid ${accent}`, transition: 'box-shadow .2s', '&:hover': { boxShadow: 6 } }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {complaint.complaintNumber}
              </Typography>
              <Typography variant="h6" sx={{ lineHeight: 1.25, wordBreak: 'break-word' }}>
                {complaint.subject}
              </Typography>
            </Box>
            <Chip size="small" label={titleCase(complaint.status)} color={STATUS_COLOR[complaint.status]} />
          </Stack>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {complaint.description}
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" variant="outlined" label={titleCase(complaint.category)} />
            <Chip
              size="small"
              variant="outlined"
              color={PRIORITY_COLOR[complaint.priority]}
              icon={<Bolt />}
              label={titleCase(complaint.priority)}
            />
            {sla ? (
              <Chip size="small" color={sla.color} icon={<AccessTime />} label={sla.text} />
            ) : null}
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Tooltip title={`Updated ${formatDateTime(complaint.updatedAt)}`}>
              <Typography variant="caption" color="text.secondary">
                Raised {formatDateTime(complaint.createdAt)}
              </Typography>
            </Tooltip>
            {options.length ? (
              <TextField
                select
                size="small"
                value=""
                disabled={moving}
                label="Move to"
                onChange={(event) => onMove(complaint, event.target.value as ComplaintStatus)}
                sx={{ minWidth: 150 }}
              >
                {options.map((status) => (
                  <MenuItem key={status} value={status}>
                    {titleCase(status)}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <Chip size="small" variant="outlined" label="Completed" />
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

const emptyForm = {
  category: 'OTHER',
  subcategory: '',
  subject: '',
  description: '',
  locationDetails: '',
  priority: 'MEDIUM' as ComplaintPriority,
  preferredVisitAt: '',
  entryPermission: false,
};

export default function ComplaintsPage() {
  const { data, error, loading, reload } = useAsync<Complaint[]>(() => api.listComplaints());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const complaints = useMemo(() => data ?? [], [data]);

  const stats = useMemo(
    () => ({
      total: complaints.length,
      active: complaints.filter(isActive).length,
      resolved: complaints.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length,
      breached: complaints.filter(isBreached).length,
    }),
    [complaints]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return complaints.filter((c) => {
      if (filter === 'ACTIVE' && !isActive(c)) return false;
      if (filter === 'RESOLVED' && isActive(c)) return false;
      if (!q) return true;
      return [c.complaintNumber, c.subject, c.description, c.category].some((v) =>
        v.toLowerCase().includes(q)
      );
    });
  }, [complaints, query, filter]);

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setActionError(null);
    try {
      await api.createComplaint({
        category: form.category,
        subcategory: form.subcategory || undefined,
        subject: form.subject,
        description: form.description,
        locationDetails: form.locationDetails || undefined,
        priority: form.priority,
        preferredVisitAt: form.preferredVisitAt
          ? new Date(form.preferredVisitAt).toISOString()
          : undefined,
        entryPermission: form.entryPermission,
      });
      setForm(emptyForm);
      setOpen(false);
      reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not raise complaint');
    } finally {
      setBusy(false);
    }
  };

  const move = async (complaint: Complaint, next: ComplaintStatus) => {
    setMovingId(complaint.id);
    setActionError(null);
    try {
      await api.updateComplaintStatus(complaint.id, next);
      reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not update complaint');
    } finally {
      setMovingId(null);
    }
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        spacing={2}
      >
        <Box>
          <Typography variant="h4">Complaints</Typography>
          <Typography color="text.secondary">Track, assign and resolve resident complaints.</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={reload} disabled={loading}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
            Raise complaint
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={6} md={3}>
          <StatCard label="Total complaints" value={stats.total} icon={<Bolt />} color="#1976d2" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="In progress" value={stats.active} icon={<AccessTime />} color="#ed6c02" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircleOutline />} color="#2e7d32" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="SLA breached" value={stats.breached} icon={<ErrorOutline />} color="#d32f2f" />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
            <TextField
              size="small"
              placeholder="Search by number, subject or category"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: { md: 360 } }}
            />
            <ToggleButtonGroup
              size="small"
              exclusive
              value={filter}
              onChange={(_, value: Filter | null) => value && setFilter(value)}
            >
              <ToggleButton value="ALL">All</ToggleButton>
              <ToggleButton value="ACTIVE">Active</ToggleButton>
              <ToggleButton value="RESOLVED">Resolved</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </CardContent>
      </Card>

      {actionError ? (
        <Alert severity="error" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      ) : null}

      {loading ? <LinearProgress /> : null}

      {error ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={reload}>
              Retry
            </Button>
          }
        >
          Could not load complaints: {error}
        </Alert>
      ) : null}

      {!loading && !error && visible.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6">
              {complaints.length ? 'No complaints match your filters' : 'No complaints yet'}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {complaints.length
                ? 'Try a different search or filter.'
                : 'Raise a complaint to get things moving.'}
            </Typography>
            {!complaints.length ? (
              <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
                Raise complaint
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Grid container spacing={2}>
        {visible.map((complaint) => (
          <Grid item xs={12} md={6} xl={4} key={complaint.id}>
            <ComplaintCard complaint={complaint} onMove={move} moving={movingId === complaint.id} />
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={() => !busy && setOpen(false)} fullWidth maxWidth="sm" component="form" onSubmit={submit}>
        <DialogTitle>Raise a complaint</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="Category" value={form.category} onChange={(e) => set('category', e.target.value)}>
                {CATEGORIES.map((value) => (
                  <MenuItem key={value} value={value}>
                    {titleCase(value)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Subcategory"
                value={form.subcategory}
                inputProps={{ maxLength: 80 }}
                onChange={(e) => set('subcategory', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Subject"
                value={form.subject}
                inputProps={{ maxLength: 200 }}
                onChange={(e) => set('subject', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                multiline
                minRows={3}
                label="Description"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Location details"
                value={form.locationDetails}
                inputProps={{ maxLength: 300 }}
                onChange={(e) => set('locationDetails', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="Priority" value={form.priority} onChange={(e) => set('priority', e.target.value as ComplaintPriority)}>
                {PRIORITIES.map((value) => (
                  <MenuItem key={value} value={value}>
                    {titleCase(value)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Preferred visit"
                InputLabelProps={{ shrink: true }}
                value={form.preferredVisitAt}
                onChange={(e) => set('preferredVisitAt', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox checked={form.entryPermission} onChange={(e) => set('entryPermission', e.target.checked)} />
                }
                label="Allow entry when I am away"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={busy} startIcon={busy ? <CircularProgress size={16} /> : undefined}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
