import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material';
import { AuthProvider } from '@/context/AuthProvider';
import { theme } from '@/theme';
import type { User } from '@/types';

export const ADMIN_USER: User = {
  id: 'usr-admin',
  name: 'Asha Rao',
  email: 'admin@mysociety.test',
  role: 'ADMIN',
  societyId: 'green-valley',
};

/** Seeds localStorage so <AuthProvider> starts already signed in. */
export function signIn(user: User = ADMIN_USER): void {
  window.localStorage.setItem('mysociety.token', 'test-token');
  window.localStorage.setItem('mysociety.user', JSON.stringify(user));
}

export function renderWithProviders(ui: ReactElement, { route = '/' } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <AuthProvider>{ui}</AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}
