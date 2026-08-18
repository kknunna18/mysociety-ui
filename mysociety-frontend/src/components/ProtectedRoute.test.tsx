import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ADMIN_USER, renderWithProviders, signIn } from '@/test/renderApp';

const tree = (
  <Routes>
    <Route path="/login" element={<h1>Sign in</h1>} />
    <Route
      path="/audit"
      element={
        <ProtectedRoute roles={['ADMIN']}>
          <h1>Audit log</h1>
        </ProtectedRoute>
      }
    />
  </Routes>
);

describe('ProtectedRoute', () => {
  it('redirects anonymous users to the login page', () => {
    renderWithProviders(tree, { route: '/audit' });
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('renders the page for an allowed role', () => {
    signIn();
    renderWithProviders(tree, { route: '/audit' });
    expect(screen.getByRole('heading', { name: 'Audit log' })).toBeInTheDocument();
  });

  it('blocks a role that is not allowed', () => {
    signIn({ ...ADMIN_USER, role: 'RESIDENT' });
    renderWithProviders(tree, { route: '/audit' });
    expect(screen.getByRole('alert')).toHaveTextContent(/cannot access this page/i);
  });
});
