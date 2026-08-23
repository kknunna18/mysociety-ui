import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import { renderWithProviders } from '@/test/renderApp';

const routes = (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/" element={<h1>Dashboard</h1>} />
  </Routes>
);

describe('LoginPage', () => {
  it('signs in with the seeded admin account and redirects', async () => {
    const user = userEvent.setup();
    renderWithProviders(routes, { route: '/login' });

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    });
    expect(window.localStorage.getItem('mysociety.token')).toBeNull();
  });

  it('shows an error for invalid credentials', async () => {
    const user = userEvent.setup();
    renderWithProviders(routes, { route: '/login' });

    await user.clear(screen.getByLabelText(/password/i));
    await user.type(screen.getByLabelText(/password/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/unable to sign in/i);
  });
});
