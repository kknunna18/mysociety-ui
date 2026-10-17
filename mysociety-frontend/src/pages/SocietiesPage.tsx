import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Add,
  EditOutlined,
  EmailOutlined,
  LocationOnOutlined,
  PhoneOutlined,
  Refresh,
  Search,
  VisibilityOutlined,
  VerifiedOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Grid,
  InputAdornment,
  LinearProgress,
  Pagination,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { api } from '@/api/client';
import { SocietyFormDialog } from '@/components/SocietyFormDialog';
import { SocietyAvatar, SocietyStatusChip, formatLocation } from '@/components/SocietyBits';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import type { SocietyProfile, SocietyStatus } from '@/types';

const PAGE_SIZE = 9;
type StatusFilter = SocietyStatus | '';

function InfoLine({ icon, text }: { icon: React.ReactNode; text?: string | null }) {
  if (!text) return null;
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary', minWidth: 0 }}>
      {icon}
      <Typography variant="body2" noWrap title={text}>
        {text}
      </Typography>
    </Stack>
  );
}

function SocietyCard({
  society,
  current,
  onView,
  onEdit,
}: {
  society: SocietyProfile;
  current: boolean;
  onView: () => void;
  onEdit: () => void;
}) {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderTop: 4,
        borderColor: current ? 'primary.main' : 'transparent',
        transition: 'box-shadow .2s, transform .2s',
        '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <SocietyAvatar society={society} />
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="h6" fontWeight={700} noWrap title={society.name}>
              {society.name}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip size="small" variant="outlined" label={society.code} />
              <SocietyStatusChip status={society.status} />
              {current ? <Chip size="small" color="primary" icon={<VerifiedOutlined />} label="Current" /> : null}
            </Stack>
          </Box>
        </Stack>

        <Stack spacing={0.75} sx={{ mt: 2 }}>
          <InfoLine icon={<LocationOnOutlined fontSize="small" />} text={formatLocation(society)} />
          <InfoLine icon={<EmailOutlined fontSize="small" />} text={society.email} />
          <InfoLine icon={<PhoneOutlined fontSize="small" />} text={society.phone} />
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
          <Chip size="small" label={society.currencyCode} />
          <Chip size="small" label={society.timezone} />
          {society.registrationNumber ? <Chip size="small" label={`Reg: ${society.registrationNumber}`} /> : null}
        </Stack>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button size="small" startIcon={<VisibilityOutlined />} onClick={onView}>
          View
        </Button>
        <Button size="small" startIcon={<EditOutlined />} onClick={onEdit}>
          Edit
        </Button>
      </CardActions>
    </Card>
  );
}

export default function SocietiesPage() {
  const navigate = useNavigate();
  const { activeSociety } = useAuth();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SocietyProfile | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(search);
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data, error, loading, reload } = useAsync(
    () => api.listSocieties({ q: debounced, status, page, size: PAGE_SIZE }),
    [debounced, status, page]
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (society: SocietyProfile) => {
    setEditing(society);
    setFormOpen(true);
  };
  const handleSaved = (saved: SocietyProfile) => {
    setFormOpen(false);
    setToast(editing ? `${saved.name} updated` : `${saved.name} created`);
    reload();
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
          <Typography variant="h4">Societies</Typography>
          <Typography color="text.secondary">
            {data ? `${data.total} societ${data.total === 1 ? 'y' : 'ies'} you can manage` : 'Manage society profiles and settings.'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={reload} disabled={loading}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
            Add society
          </Button>
        </Stack>
      </Stack>

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
            <TextField
              size="small"
              placeholder="Search by name, code or city"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
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
              value={status}
              onChange={(_, value: StatusFilter | null) => {
                if (value !== null) {
                  setStatus(value);
                  setPage(0);
                }
              }}
            >
              <ToggleButton value="">All</ToggleButton>
              <ToggleButton value="ACTIVE">Active</ToggleButton>
              <ToggleButton value="TRIAL">Trial</ToggleButton>
              <ToggleButton value="SUSPENDED">Suspended</ToggleButton>
              <ToggleButton value="INACTIVE">Inactive</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </CardContent>
      </Card>

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
          {error}
        </Alert>
      ) : null}

      {!loading && !error && data && data.items.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6">No societies found</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {debounced || status ? 'Try a different search or filter.' : 'Add your first society to get started.'}
            </Typography>
            {!debounced && !status ? (
              <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
                Add society
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Grid container spacing={2}>
        {(data?.items ?? []).map((society) => (
          <Grid item xs={12} sm={6} lg={4} key={society.id}>
            <SocietyCard
              society={society}
              current={society.id === activeSociety?.id}
              onView={() => navigate(`/societies/${society.id}`)}
              onEdit={() => openEdit(society)}
            />
          </Grid>
        ))}
      </Grid>

      {totalPages > 1 ? (
        <Stack alignItems="center">
          <Pagination count={totalPages} page={page + 1} onChange={(_, value) => setPage(value - 1)} color="primary" />
        </Stack>
      ) : null}

      <SocietyFormDialog open={formOpen} society={editing} onClose={() => setFormOpen(false)} onSaved={handleSaved} />
      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </Stack>
  );
}
