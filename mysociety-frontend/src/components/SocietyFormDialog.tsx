import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { api } from '@/api/client';
import { SOCIETY_STATUSES } from '@/components/SocietyBits';
import type { SocietyInput, SocietyProfile, SocietyStatus } from '@/types';

const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'UTC'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

interface FormState {
  code: string;
  name: string;
  registrationNumber: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateName: string;
  postalCode: string;
  countryCode: string;
  timezone: string;
  currencyCode: string;
  logoUrl: string;
  status: SocietyStatus;
}

const EMPTY: FormState = {
  code: '',
  name: '',
  registrationNumber: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  stateName: '',
  postalCode: '',
  countryCode: 'IN',
  timezone: 'Asia/Kolkata',
  currencyCode: 'INR',
  logoUrl: '',
  status: 'ACTIVE',
};

const fromSociety = (s: SocietyProfile): FormState => ({
  code: s.code,
  name: s.name,
  registrationNumber: s.registrationNumber ?? '',
  email: s.email ?? '',
  phone: s.phone ?? '',
  addressLine1: s.addressLine1 ?? '',
  addressLine2: s.addressLine2 ?? '',
  city: s.city ?? '',
  stateName: s.stateName ?? '',
  postalCode: s.postalCode ?? '',
  countryCode: s.countryCode,
  timezone: s.timezone,
  currencyCode: s.currencyCode,
  logoUrl: s.logoUrl ?? '',
  status: s.status,
});

type Errors = Partial<Record<keyof FormState, string>>;

const validate = (f: FormState): Errors => {
  const errors: Errors = {};
  if (!f.code.trim()) errors.code = 'Code is required';
  else if (!/^[A-Za-z0-9_-]{2,30}$/.test(f.code.trim())) errors.code = '2-30 letters, digits, "_" or "-"';
  if (!f.name.trim()) errors.name = 'Name is required';
  else if (f.name.length > 150) errors.name = 'Max 150 characters';
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) errors.email = 'Enter a valid email';
  if (!/^[A-Za-z]{2}$/.test(f.countryCode)) errors.countryCode = '2-letter country code';
  if (!/^[A-Za-z]{3}$/.test(f.currencyCode)) errors.currencyCode = '3-letter currency code';
  if (f.logoUrl && !/^https?:\/\//i.test(f.logoUrl)) errors.logoUrl = 'Must start with http(s)://';
  return errors;
};

const toInput = (f: FormState): SocietyInput => ({
  code: f.code.trim().toUpperCase(),
  name: f.name.trim(),
  registrationNumber: f.registrationNumber.trim(),
  email: f.email.trim(),
  phone: f.phone.trim(),
  addressLine1: f.addressLine1.trim(),
  addressLine2: f.addressLine2.trim(),
  city: f.city.trim(),
  stateName: f.stateName.trim(),
  postalCode: f.postalCode.trim(),
  countryCode: f.countryCode.trim().toUpperCase(),
  timezone: f.timezone,
  currencyCode: f.currencyCode.trim().toUpperCase(),
  logoUrl: f.logoUrl.trim(),
  status: f.status,
});

function Section({ title }: { title: string }) {
  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="overline" color="primary" fontWeight={700}>
        {title}
      </Typography>
      <Divider sx={{ mb: 1.5 }} />
    </Box>
  );
}

interface Props {
  open: boolean;
  /** When provided the dialog edits this society, otherwise it creates one. */
  society?: SocietyProfile | null;
  onClose: () => void;
  onSaved: (society: SocietyProfile) => void;
}

export function SocietyFormDialog({ open, society, onClose, onSaved }: Props) {
  const editing = Boolean(society);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(society ? fromSociety(society) : EMPTY);
      setErrors({});
      setSubmitError(null);
    }
  }, [open, society]);

  const set = <K extends keyof FormState>(key: K) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value as FormState[K] }));

  const field = (key: keyof FormState, label: string, extra: Record<string, unknown> = {}) => (
    <TextField
      fullWidth
      size="small"
      label={label}
      value={form[key]}
      onChange={set(key)}
      error={Boolean(errors[key])}
      helperText={errors[key]}
      {...extra}
    />
  );

  const submit = async () => {
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    setSubmitError(null);
    try {
      const saved = society
        ? await api.updateSociety(society.id, toInput(form))
        : await api.createSociety(toInput(form));
      onSaved(saved);
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'Could not save society');
    } finally {
      setSaving(false);
    }
  };

  const timezones = TIMEZONES.includes(form.timezone) ? TIMEZONES : [form.timezone, ...TIMEZONES];
  const currencies = CURRENCIES.includes(form.currencyCode) ? CURRENCIES : [form.currencyCode, ...CURRENCIES];

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Typography variant="h6" fontWeight={700}>
          {editing ? `Edit ${society?.name}` : 'Add society'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {editing ? 'Update the society profile and settings.' : 'Register a new society on the platform.'}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {submitError ? <Alert severity="error">{submitError}</Alert> : null}

          <Section title="Basic details" />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              {field('code', 'Society code *', {
                disabled: editing,
                helperText: errors.code ?? (editing ? 'Code cannot be changed' : 'Unique, e.g. GREEN_HOMES'),
                inputProps: { maxLength: 30, style: { textTransform: 'uppercase' } },
              })}
            </Grid>
            <Grid item xs={12} sm={8}>
              {field('name', 'Society name *', { inputProps: { maxLength: 150 } })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {field('registrationNumber', 'Registration number', { inputProps: { maxLength: 80 } })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {field('status', 'Status', {
                select: true,
                children: SOCIETY_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </MenuItem>
                )),
              })}
            </Grid>
          </Grid>

          <Section title="Contact" />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              {field('email', 'Email', { type: 'email', inputProps: { maxLength: 254 } })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {field('phone', 'Phone', { inputProps: { maxLength: 30 } })}
            </Grid>
          </Grid>

          <Section title="Address" />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              {field('addressLine1', 'Address line 1', { inputProps: { maxLength: 200 } })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {field('addressLine2', 'Address line 2', { inputProps: { maxLength: 200 } })}
            </Grid>
            <Grid item xs={12} sm={4}>
              {field('city', 'City', { inputProps: { maxLength: 100 } })}
            </Grid>
            <Grid item xs={12} sm={4}>
              {field('stateName', 'State', { inputProps: { maxLength: 100 } })}
            </Grid>
            <Grid item xs={12} sm={4}>
              {field('postalCode', 'Postal code', { inputProps: { maxLength: 20 } })}
            </Grid>
          </Grid>

          <Section title="Regional settings & branding" />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              {field('countryCode', 'Country code', { inputProps: { maxLength: 2 } })}
            </Grid>
            <Grid item xs={12} sm={5}>
              {field('timezone', 'Timezone', {
                select: true,
                children: timezones.map((tz) => (
                  <MenuItem key={tz} value={tz}>
                    {tz}
                  </MenuItem>
                )),
              })}
            </Grid>
            <Grid item xs={12} sm={4}>
              {field('currencyCode', 'Currency', {
                select: true,
                children: currencies.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                )),
              })}
            </Grid>
            <Grid item xs={12}>
              {field('logoUrl', 'Logo URL', { placeholder: 'https://…', inputProps: { maxLength: 500 } })}
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {editing ? 'Save changes' : 'Create society'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
