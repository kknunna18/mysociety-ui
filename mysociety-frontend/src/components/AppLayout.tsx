import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  AccountCircle, Apartment, Assessment, Campaign, ChevronLeft, ChevronRight, Dashboard,
  Description, Group, Menu, NotificationsOutlined, Payments, Person, Security, Settings,
  Build, CalendarMonth,
} from '@mui/icons-material';
import {
  AppBar, Avatar, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon,
  ListItemText, Menu as MuiMenu, MenuItem, Stack, Toolbar, Tooltip, Typography, Snackbar, Alert,
  CircularProgress, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '@/hooks/useAuth';
import { useUiStore } from '@/store/uiStore';
import type { Role } from '@/types';

const drawerWidth = 250;
const NAV: Array<{ to: string; label: string; icon: JSX.Element; roles?: Role[] }> = [
  { to: '/dashboard', label: 'Dashboard', icon: <Dashboard /> },
  { to: '/societies', label: 'Society administration', icon: <Apartment />, roles: ['ADMIN', 'COMMITTEE', 'PLATFORM_ADMIN'] },
  { to: '/residents', label: 'Residents & households', icon: <Group />, roles: ['ADMIN', 'COMMITTEE', 'RESIDENT'] },
  { to: '/invoices', label: 'Finance', icon: <Payments />, roles: ['ADMIN', 'COMMITTEE', 'ACCOUNTANT', 'RESIDENT'] },
  { to: '/complaints', label: 'Operations', icon: <Build /> },
  { to: '/visitors', label: 'Visitors & facilities', icon: <Security /> },
  { to: '/bookings', label: 'Bookings', icon: <CalendarMonth /> },
  { to: '/notices', label: 'Communication', icon: <Campaign /> },
  { to: '/reports', label: 'Reports & audit', icon: <Assessment />, roles: ['ADMIN', 'COMMITTEE', 'ACCOUNTANT', 'PLATFORM_ADMIN'] },
  { to: '/documents', label: 'Documents', icon: <Description /> },
  { to: '/settings', label: 'Settings', icon: <Settings />, roles: ['ADMIN', 'PLATFORM_ADMIN'] },
];

export function AppLayout() {
  const { user, activeSociety, logout, availableSocieties, switchSociety } = useAuth();
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [societyAnchor, setSocietyAnchor] = useState<HTMLElement | null>(null);
  const [switching, setSwitching] = useState(false);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState<string | null>(null);
  const [snackSeverity, setSnackSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const location = useLocation();
  const visibleNav = useMemo(() => NAV.filter((item) => !item.roles || (user && item.roles.includes(user.role))), [user]);
  const title = NAV.find((item) => location.pathname.startsWith(item.to))?.label ?? 'MySociety';
  const initials = (user?.name ?? 'Member').split(' ').map((word) => word[0]).join('').slice(0, 2);
  const navigation = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: 2, height: 72 }}>
        <Avatar variant="rounded" sx={{ bgcolor: 'primary.main', fontWeight: 800 }}>MS</Avatar>
        {(!collapsed || compact) && <Typography variant="h6" fontWeight={800}>MySociety</Typography>}
      </Stack>
      <Divider />
      <List sx={{ px: 1, py: 1 }}>
        {visibleNav.map((item) => (
          <ListItemButton key={item.to} component={NavLink} to={item.to} selected={location.pathname.startsWith(item.to)}
            onClick={() => setMobileOpen(false)} sx={{ borderRadius: 2, mb: 0.5, minHeight: 46 }}>
            <ListItemIcon sx={{ minWidth: 42, color: 'inherit' }}>{item.icon}</ListItemIcon>
            {(!collapsed || compact) && <ListItemText primary={item.label} />}
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ mt: 'auto', p: 1 }}>
        {!compact && <ListItemButton onClick={toggleSidebar} sx={{ borderRadius: 2 }}>
          <ListItemIcon sx={{ minWidth: 42 }}>{collapsed ? <ChevronRight /> : <ChevronLeft />}</ListItemIcon>
          {!collapsed && <ListItemText primary="Collapse sidebar" />}
        </ListItemButton>}
      </Box>
    </Box>
  );
  const actualWidth = collapsed && !compact ? 76 : drawerWidth;
  try { console.debug('[AppLayout] rendering activeSociety:', activeSociety, 'origin:', window.location.origin); } catch {}
  const displaySociety = useMemo(() => {
    if (activeSociety) return activeSociety;
    try {
      const raw = window.localStorage.getItem('mysociety.activeSociety');
      // Debug: show raw stored value when falling back
      try { console.debug('[AppLayout] fallback localStorage mysociety.activeSociety:', raw); } catch {}
      if (raw) return JSON.parse(raw) as any;
    } catch (e) {
      try { console.debug('[AppLayout] failed parsing mysociety.activeSociety', e); } catch {}
    }
    return null;
  }, [activeSociety]);
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" elevation={0} color="inherit" sx={{ borderBottom: '1px solid #E2E8F0', zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 1 }}>
          {compact && <IconButton aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu /></IconButton>}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" color="text.secondary">MySociety / {title}</Typography>
            <Typography variant="h6" component="h1">{title}</Typography>
          </Box>

          {/* Society switcher */}
          <Box>
            <IconButton aria-label="Active society" onClick={(e) => setSocietyAnchor(e.currentTarget)} size="small">
              <Stack direction="row" alignItems="center" spacing={1}>
                <Avatar sx={{ width: 28, height: 28 }}>{(displaySociety?.name ?? 'S').slice(0,1)}</Avatar>
                <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'inline' } }}>{displaySociety?.name ?? 'Select society'}</Typography>
              </Stack>
            </IconButton>
            <MuiMenu anchorEl={societyAnchor} open={Boolean(societyAnchor)} onClose={() => setSocietyAnchor(null)}>
              {availableSocieties && availableSocieties.length > 0 ? (
                availableSocieties.map((s) => (
                  <MenuItem key={s.id} disabled={switching || s.id === displaySociety?.id} onClick={async () => {
                    setSwitching(true);
                    setSocietyAnchor(null);
                    // optimistic UI: set active immediately
                    const prevActive = activeSociety;
                    try {
                      // try switching on server
                      await switchSociety(s.id);
                      setSnackSeverity('success'); setSnackMessage(`Switched to ${s.name}`); setSnackOpen(true);
                      // Debug: log token and active society id before reload so console shows values
                      try {
                        // Delay briefly to allow localStorage to settle, then dispatch a targeted refresh event (no full reload)
                        // eslint-disable-next-line no-console
                        const { getToken, getActiveSocietyId } = await import('@/api/tokenStorage');
                        // eslint-disable-next-line no-console
                        console.debug('[AppLayout] switch successful — token length:', getToken()?.length, 'activeSocietyId:', getActiveSocietyId());
                      } catch (e) {
                        // ignore
                      }
                        try {
                          // Dispatch an in-app event so pages can refresh data without a full reload
                          window.dispatchEvent(new CustomEvent('mysociety:societyChanged', { detail: { now: Date.now() } }));
                          console.debug('[AppLayout] dispatched mysociety:societyChanged');
                        } catch (e) {
                          // Fallback to full reload if dispatch fails for some reason
                          setTimeout(() => window.location.reload(), 600);
                        }
                    } catch (err: any) {
                      console.error('Failed to switch society', err);
                      setSnackSeverity('error'); setSnackMessage(err?.message ?? 'Failed to switch society'); setSnackOpen(true);
                      // restore previous active (AuthProvider remains unchanged on failure)
                    } finally {
                      setSwitching(false);
                    }
                  }}>
                    {s.name}{s.id === displaySociety?.id ? ' (current)' : ''}
                    {switching && <CircularProgress size={16} sx={{ ml: 1 }} />}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>No other societies</MenuItem>
              )}
              <MenuItem component={NavLink} to="/select-society">Choose society...</MenuItem>
              <MenuItem component={NavLink} to="/societies">Manage societies</MenuItem>
            </MuiMenu>
          </Box>
          <Tooltip title="Notifications"><IconButton aria-label="Notifications"><NotificationsOutlined /></IconButton></Tooltip>
          <IconButton aria-label="Open profile menu" onClick={(event) => setAnchor(event.currentTarget)}><Avatar sx={{ width: 34, height: 34 }}>{initials}</Avatar></IconButton>
          <MuiMenu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
            <MenuItem component={NavLink} to="/profile"><Person sx={{ mr: 1 }} />Profile</MenuItem>
            <MenuItem onClick={logout}><AccountCircle sx={{ mr: 1 }} />Sign out</MenuItem>
          </MuiMenu>
          <Snackbar open={snackOpen} autoHideDuration={6000} onClose={() => setSnackOpen(false)}>
            <Alert onClose={() => setSnackOpen(false)} severity={snackSeverity} sx={{ width: '100%' }}>{snackMessage}</Alert>
          </Snackbar>
        </Toolbar>
      </AppBar>
      <Drawer variant={compact ? 'temporary' : 'permanent'} open={compact ? mobileOpen : true} onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }} sx={{ '& .MuiDrawer-paper': { width: actualWidth, boxSizing: 'border-box', borderRight: '1px solid #E2E8F0' } }}>
        {navigation}
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, mt: 9, p: { xs: 2, sm: 3 }, ml: compact ? 0 : `${actualWidth}px`, transition: 'margin 150ms ease' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
