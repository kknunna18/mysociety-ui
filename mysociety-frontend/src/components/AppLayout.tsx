import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  AccountCircle, Apartment, Assessment, Campaign, ChevronLeft, ChevronRight, Dashboard,
  Description, Group, Menu, NotificationsOutlined, Payments, Person, Security, Settings,
  Build, CalendarMonth,
} from '@mui/icons-material';
import {
  AppBar, Avatar, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon,
  ListItemText, Menu as MuiMenu, MenuItem, Select, Stack, Toolbar, Tooltip, Typography,
  useMediaQuery,
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
  const { user, activeSociety, logout } = useAuth();
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
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
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" elevation={0} color="inherit" sx={{ borderBottom: '1px solid #E2E8F0', zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 1 }}>
          {compact && <IconButton aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu /></IconButton>}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" color="text.secondary">MySociety / {title}</Typography>
            <Typography variant="h6" component="h1">{title}</Typography>
          </Box>
          <Select size="small" value={activeSociety?.id ?? ''} inputProps={{ 'aria-label': 'Active society' }} sx={{ minWidth: 150 }}>
            <MenuItem value={activeSociety?.id ?? ''}>{activeSociety?.name ?? 'Select society'}</MenuItem>
          </Select>
          <Tooltip title="Notifications"><IconButton aria-label="Notifications"><NotificationsOutlined /></IconButton></Tooltip>
          <IconButton aria-label="Open profile menu" onClick={(event) => setAnchor(event.currentTarget)}><Avatar sx={{ width: 34, height: 34 }}>{initials}</Avatar></IconButton>
          <MuiMenu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
            <MenuItem component={NavLink} to="/profile"><Person sx={{ mr: 1 }} />Profile</MenuItem>
            <MenuItem onClick={logout}><AccountCircle sx={{ mr: 1 }} />Sign out</MenuItem>
          </MuiMenu>
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
