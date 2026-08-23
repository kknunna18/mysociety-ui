import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import DashboardPage from '@/pages/DashboardPage';
import { renderWithProviders, signIn } from '@/test/renderApp';

describe('DashboardPage', () => {
  it('renders society KPIs from the mock API', async () => {
    signIn();
    renderWithProviders(<DashboardPage />);

    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);

    expect(await screen.findByText('Visitors today')).toBeInTheDocument();
    expect(screen.getAllByText('2', { selector: '.summary-card__value' })[0]).toBeInTheDocument();
    expect(screen.getByText('₹11,500', { selector: '.summary-card__value' })).toBeInTheDocument();
    expect(screen.getByText(/No announcements have been published/)).toBeInTheDocument();
  });
});
