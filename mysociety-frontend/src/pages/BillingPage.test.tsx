import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BillingPage from '@/pages/BillingPage';
import { renderWithProviders, signIn } from '@/test/renderApp';

describe('BillingPage', () => {
  it('records a payment and flips the invoice to Paid', async () => {
    signIn();
    const user = userEvent.setup();
    renderWithProviders(<BillingPage />);

    const row = (await screen.findByText('inv-2402')).closest('tr');
    expect(row).not.toBeNull();
    expect(within(row!).getByText('Due')).toBeInTheDocument();

    await user.click(within(row!).getByRole('button', { name: /record upi payment/i }));

    await waitFor(() => {
      const updated = screen.getByText('inv-2402').closest('tr');
      expect(within(updated!).getByText('Paid')).toBeInTheDocument();
    });
  });
});
