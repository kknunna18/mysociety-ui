import { useQuery } from '@tanstack/react-query';
import { AccountBalanceWallet, AssignmentLate, Groups, PersonSearch, Security, Today } from '@mui/icons-material';
import { Alert, Box, Card, CardContent, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';

const analytics = [{ month: 'Apr', billed: 82000, collected: 73000 }, { month: 'May', billed: 84000, collected: 80500 }, { month: 'Jun', billed: 86000, collected: 84200 }, { month: 'Jul', billed: 88000, collected: 86500 }];
const paymentMix = [{ name: 'Online', value: 65 }, { name: 'UPI', value: 25 }, { name: 'Cash', value: 10 }];
const labels = { ADMIN: 'Administrator', COMMITTEE: 'Committee member', RESIDENT: 'Resident', SECURITY: 'Security guard', ACCOUNTANT: 'Accountant', FACILITY_MANAGER: 'Facility manager', VENDOR: 'Vendor / Technician', PLATFORM_ADMIN: 'Platform administrator' };
export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({ queryKey: ['dashboard-summary'], queryFn: () => api.getSummary() });
  if (isLoading) return <Box textAlign="center" p={8}><CircularProgress aria-label="Loading dashboard" /></Box>;
  if (isError || !data) return <Alert severity="error">We could not load the dashboard. Please try again.</Alert>;
  const resident = user?.role === 'RESIDENT';
  const security = user?.role === 'SECURITY';
  const cards = security ? [
    ['Expected visitors', data.visitorsToday, <PersonSearch />], ['Visitors inside', data.visitorsToday, <Security />], ['Completed check-outs', 18, <Today />], ['Rejected / expired', 2, <AssignmentLate />],
  ] : resident ? [
    ['Outstanding amount', `₹${data.duesAmount.toLocaleString()}`, <AccountBalanceWallet />], ['Open complaints', data.openComplaints, <AssignmentLate />], ['Upcoming bookings', data.upcomingBookings, <Today />], ['Latest notices', 3, <Groups />],
  ] : [
    ['Occupied units', `${data.residents} / 120`, <Groups />], ['Residents', data.residents, <Groups />], ['Collection rate', '96%', <AccountBalanceWallet />], ['Open complaints', data.openComplaints, <AssignmentLate />], ['Visitors inside', data.visitorsToday, <Security />], ['Today’s bookings', data.upcomingBookings, <Today />],
  ];
  return <Stack spacing={3}>
    <Box><Typography variant="h4">Good day, {user?.name?.split(' ')[0] ?? 'Member'}</Typography><Typography color="text.secondary">{labels[user?.role ?? 'RESIDENT']} overview for your active society.</Typography></Box>
    <Grid container spacing={2}>{cards.map(([label, value, icon]) => <Grid item xs={12} sm={6} lg={4} key={String(label)}><Card><CardContent><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography color="text.secondary" variant="body2">{label}</Typography><Typography variant="h4">{value}</Typography></Box><Box color="primary.main">{icon}</Box></Stack></CardContent></Card></Grid>)}</Grid>
    {!resident && !security && <Grid container spacing={2}><Grid item xs={12} lg={8}><Card><CardContent><Typography variant="h6" mb={2}>Monthly billed vs. collected</Typography><ResponsiveContainer width="100%" height={280}><BarChart data={analytics}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Bar dataKey="billed" fill="#1F4E78" /><Bar dataKey="collected" fill="#2E7D32" /></BarChart></ResponsiveContainer></CardContent></Card></Grid><Grid item xs={12} lg={4}><Card><CardContent><Typography variant="h6" mb={2}>Payment methods</Typography><ResponsiveContainer width="100%" height={280}><PieChart><Pie data={paymentMix} dataKey="value" nameKey="name" fill="#2E74B5" label /><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card></Grid></Grid>}
    <Card><CardContent><Typography variant="h6">Quick actions</Typography><Typography color="text.secondary">Create a complaint, review collections, approve visitors, or publish a community notice from the navigation.</Typography></CardContent></Card>
  </Stack>;
}
