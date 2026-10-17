import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';

export function SimpleAuthPage({ title, description, action }: { title: string; description: string; action: string }) {
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  return <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" p={2} bgcolor="background.default"><Card sx={{ width: '100%', maxWidth: 440 }}><CardContent sx={{ p: 4 }}><Stack spacing={2.5}><Typography variant="h4">{title}</Typography><Typography color="text.secondary">{description}</Typography>{sent && <Alert severity="success">If the details match an account, you will receive the next step shortly.</Alert>}<TextField label="Email address" type="email" autoComplete="email" fullWidth /><Button variant="contained" onClick={() => action === 'Continue' ? navigate('/dashboard') : setSent(true)}>{action}</Button><Button component={RouterLink} to="/login">Back to sign in</Button></Stack></CardContent></Card></Box>;
}

export function UnauthorizedPage() { return <SimpleAuthPage title="Access unavailable" description="Your account does not have permission to view this page. Contact your society administrator if you believe this is an error." action="Back to dashboard" />; }
export function SessionExpiredPage() { return <SimpleAuthPage title="Your session has expired" description="For your protection, please sign in again to continue." action="Continue" />; }
