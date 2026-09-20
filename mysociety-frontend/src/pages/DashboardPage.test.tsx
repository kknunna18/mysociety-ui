import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import DashboardPage from '@/pages/DashboardPage';
import { renderWithProviders, signIn } from '@/test/renderApp';

describe('DashboardPage', () => {
  it('renders administrator summary cards from the typed service', async () => {
    signIn();
    renderWithProviders(<DashboardPage />);
    expect(await screen.findByText('Occupied units')).toBeInTheDocument();
    expect(screen.getByText('Monthly billed vs. collected')).toBeInTheDocument();
  });
});
