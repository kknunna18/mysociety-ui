import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import DashboardPage from '@/pages/DashboardPage';
import { renderWithProviders, signIn } from '@/test/renderApp';

describe('DashboardPage', () => {
  it('renders society KPIs from the mock API', async () => {
    signIn();
    renderWithProviders(<DashboardPage />);

    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);

    expect(await screen.findByText('Active residents')).toBeInTheDocument();
    expect(screen.getByText('Open complaints').nextSibling).toHaveTextContent('2');
    expect(screen.getByText('Outstanding dues').nextSibling).toHaveTextContent('11,500');
  });
});
