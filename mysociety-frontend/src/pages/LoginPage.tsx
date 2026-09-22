import { useEffect, useState } from 'react';
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, Checkbox, FormControlLabel, IconButton, InputAdornment, Link, Stack, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';

const schema = z.object({ identifier: z.string().min(1, 'Enter your email or mobile number'), password: z.string().min(1, 'Enter your password'), rememberEmail: z.boolean() });
type LoginForm = z.infer<typeof schema>;
const rememberedEmailKey = 'mysociety.remembered-email';

export default function LoginPage() {
  const { user, status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue } = useForm<LoginForm>({
    resolver: zodResolver(schema), defaultValues: { identifier: '', password: '', rememberEmail: false },
  });
  useEffect(() => {
    const remembered = window.localStorage.getItem(rememberedEmailKey);
    if (remembered) { setValue('identifier', remembered); setValue('rememberEmail', true); }
  }, [setValue]);
  if (status === 'selectingSociety') return <Navigate to="/select-society" replace />;
  if (user) return <Navigate to="/dashboard" replace />;
  const onSubmit = async ({ identifier, password, rememberEmail }: LoginForm) => {
    setServerError(null);
    try {
      const response = await login(identifier, password);
      if (rememberEmail) window.localStorage.setItem(rememberedEmailKey, identifier); else window.localStorage.removeItem(rememberedEmailKey);
      navigate(response.status === 'SOCIETY_SELECTION_REQUIRED' ? '/select-society' : ((location.state as { from?: string } | null)?.from ?? '/dashboard'), { replace: true });
    } catch {
      setServerError('Unable to sign in. Please verify your credentials and try again.');
    }
  };
  return <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { md: '1fr 1fr' }, bgcolor: 'background.default' }}>
    <Box sx={{ display: { xs: 'none', md: 'flex' }, bgcolor: 'primary.main', color: 'common.white', p: 7, flexDirection: 'column', justifyContent: 'center' }}>
      <Typography variant="h4" fontWeight={800}>MySociety</Typography>
      <Typography variant="h2" sx={{ mt: 10, maxWidth: 520, fontWeight: 800 }}>Your community, connected.</Typography>
      <Typography variant="h6" sx={{ mt: 3, maxWidth: 480, opacity: .9 }}>Manage payments, complaints, visitors and community updates in one secure place.</Typography>
      <Box aria-hidden sx={{ mt: 8, border: '2px solid rgba(255,255,255,.35)', borderRadius: 4, height: 160, maxWidth: 480, position: 'relative', '&:before': { content: '""', position: 'absolute', left: '12%', bottom: 0, width: '24%', height: '70%', bgcolor: 'rgba(255,255,255,.18)' }, '&:after': { content: '""', position: 'absolute', right: '12%', bottom: 0, width: '34%', height: '100%', bgcolor: 'rgba(255,255,255,.12)' } }} />
    </Box>
    <Stack justifyContent="center" alignItems="center" p={{ xs: 2, sm: 4 }}>
      <Card component="section" sx={{ maxWidth: 460, width: '100%' }}><CardContent sx={{ p: { xs: 3, sm: 5 } }}>
        <Typography variant="h4">Welcome back</Typography><Typography color="text.secondary" sx={{ mt: 1, mb: 4 }}>Sign in to manage your society.</Typography>
        <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2.5}>
            {serverError && <Alert severity="error" role="alert">{serverError}</Alert>}
            <TextField label="Email or mobile number" autoComplete="username" autoFocus error={Boolean(errors.identifier)} helperText={errors.identifier?.message} inputProps={{ 'aria-describedby': errors.identifier ? 'identifier-error' : undefined }} {...register('identifier')} />
            <TextField label="Password" type={visible ? 'text' : 'password'} autoComplete="current-password" error={Boolean(errors.password)} helperText={errors.password?.message} {...register('password')}
              InputProps={{ endAdornment: <InputAdornment position="end"><IconButton aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)} edge="end">{visible ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }} />
            <Stack direction="row" justifyContent="space-between" alignItems="center"><FormControlLabel control={<Checkbox {...register('rememberEmail')} checked={watch('rememberEmail')} />} label="Remember my email" /><Link component={RouterLink} to="/forgot-password">Forgot password?</Link></Stack>
            <Button type="submit" size="large" variant="contained" disabled={isSubmitting} fullWidth>{isSubmitting ? 'Signing in...' : 'Sign in'}</Button>
          </Stack>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>Need help? Contact your society administrator.</Typography>
      </CardContent></Card>
    </Stack>
  </Box>;
}
