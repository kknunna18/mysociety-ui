import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthProvider';
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
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}
