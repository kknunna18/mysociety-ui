import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: { main: '#1F4E78' },
    secondary: { main: '#2E74B5' },
    success: { main: '#2E7D32' },
    warning: { main: '#ED6C02' },
    error: { main: '#D32F2F' },
    background: { default: '#F5F7FA', paper: '#FFFFFF' },
  },
  shape: { borderRadius: 10 },
  typography: { fontFamily: '"Inter", "Segoe UI", Arial, sans-serif', h4: { fontWeight: 700 } },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 700 } } },
    MuiCard: { styleOverrides: { root: { border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)' } } },
    MuiCssBaseline: { styleOverrides: { ':focus-visible': { outline: '3px solid #2E74B5', outlineOffset: 2 } } },
  },
});
