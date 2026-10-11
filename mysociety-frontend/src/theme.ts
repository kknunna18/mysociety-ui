import { createTheme, alpha, lighten, darken } from '@mui/material/styles';

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

// Polyfill theme color helpers when using @mui/x-data-grid versions that expect them to exist
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = theme as any;
  if (!t.alpha) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t.alpha = (color: string, amount: number) => alpha(color, amount);
  }
  if (!t.lighten) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t.lighten = (color: string, amount: number) => lighten(color, amount);
  }
  if (!t.darken) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t.darken = (color: string, amount: number) => darken(color, amount);
  }
} catch (e) {
  // ignore
}
