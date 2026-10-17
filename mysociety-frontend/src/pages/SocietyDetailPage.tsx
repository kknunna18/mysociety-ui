import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowBack, EditOutlined, Refresh } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { api } from '@/api/client';
import { SocietyFormDialog } from '@/components/SocietyFormDialog';
import { SocietyAvatar, SocietyStatusChip, formatLocation } from '@/components/SocietyBits';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTime } from '@/utils/format';
import type { SocietyProfile } from '@/types';

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {title}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack spacing={2}>{children}</Stack>
      </CardContent>
    </Card>
  );
}

export default function SocietyDetailPage() {
  const { societyId = '' } = useParams();
  const navigate = useNavigate();
  const { activeSociety } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { data, error, loading, reload } = useAsync<SocietyProfile>(() => api.getSociety(societyId), [societyId]);

  return (
    <Stack spacing={3}>
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/societies')}>
          All societies
        </Button>
      </Box>

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

      {data ? (
        <>
          <Card
            sx={{
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette.primary.main}14, ${theme.palette.primary.main}05)`,
            }}
          >
            <CardContent>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
                <SocietyAvatar society={data} size={80} />
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="h4" fontWeight={700}>
                    {data.name}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                    <Chip variant="outlined" label={data.code} />
                    <SocietyStatusChip status={data.status} size="medium" />
                    {data.id === activeSociety?.id ? <Chip color="primary" label="Current society" /> : null}
                    {formatLocation(data) ? <Chip label={formatLocation(data)} /> : null}
                  </Stack>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" startIcon={<Refresh />} onClick={reload}>
                    Refresh
                  </Button>
                  <Button variant="contained" startIcon={<EditOutlined />} onClick={() => setEditOpen(true)}>
                    Edit
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Panel title="Contact">
                <Detail label="Email" value={data.email} />
                <Detail label="Phone" value={data.phone} />
                <Detail label="Registration number" value={data.registrationNumber} />
              </Panel>
            </Grid>
            <Grid item xs={12} md={6}>
              <Panel title="Address">
                <Detail label="Address line 1" value={data.addressLine1} />
                <Detail label="Address line 2" value={data.addressLine2} />
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Detail label="City" value={data.city} />
                  </Grid>
                  <Grid item xs={4}>
                    <Detail label="State" value={data.stateName} />
                  </Grid>
                  <Grid item xs={4}>
                    <Detail label="Postal code" value={data.postalCode} />
                  </Grid>
                </Grid>
              </Panel>
            </Grid>
            <Grid item xs={12} md={6}>
              <Panel title="Regional settings">
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Detail label="Country" value={data.countryCode} />
                  </Grid>
                  <Grid item xs={4}>
                    <Detail label="Currency" value={data.currencyCode} />
                  </Grid>
                  <Grid item xs={4}>
                    <Detail label="Timezone" value={data.timezone} />
                  </Grid>
                </Grid>
                <Detail label="Logo URL" value={data.logoUrl} />
              </Panel>
            </Grid>
            <Grid item xs={12} md={6}>
              <Panel title="Record">
                <Detail label="Society ID" value={data.id} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={5}>
                    <Detail label="Created" value={formatDateTime(data.createdAt)} />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <Detail label="Last updated" value={formatDateTime(data.updatedAt)} />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Detail label="Version" value={String(data.version)} />
                  </Grid>
                </Grid>
              </Panel>
            </Grid>
          </Grid>

          <SocietyFormDialog
            open={editOpen}
            society={data}
            onClose={() => setEditOpen(false)}
            onSaved={(saved) => {
              setEditOpen(false);
              setToast(`${saved.name} updated`);
              reload();
            }}
          />
        </>
      ) : null}
      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </Stack>
  );
}
