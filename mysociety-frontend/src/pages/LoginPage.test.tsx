import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import { renderWithProviders } from '@/test/renderApp';

const routes = <Routes><Route path="/login" element={<LoginPage />} /><Route path="/dashboard" element={<h1>Dashboard</h1>} /></Routes>;
describe('LoginPage', () => {
  it('validates required credentials and toggles password visibility', async () => {
    const user = userEvent.setup();
    renderWithProviders(routes, { route: '/login' });
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(await screen.findByText('Enter your email or mobile number')).toBeInTheDocument();
    const password = screen.getByLabelText(/^password$/i);
    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
  });
  it('signs in with the seeded account without persisting a token', async () => {
    const user = userEvent.setup();
    renderWithProviders(routes, { route: '/login' });
    await user.type(screen.getByLabelText(/email or mobile/i), 'admin@mysociety.test');
    await user.type(screen.getByLabelText(/^password$/i), 'admin123');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument());
    expect(window.localStorage.getItem('mysociety.token')).toBeNull();
  });
  it('shows a friendly invalid-credential error', async () => {
    const user = userEvent.setup();
    renderWithProviders(routes, { route: '/login' });
    await user.type(screen.getByLabelText(/email or mobile/i), 'admin@mysociety.test');
    await user.type(screen.getByLabelText(/^password$/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/unable to sign in/i);
  });
});
