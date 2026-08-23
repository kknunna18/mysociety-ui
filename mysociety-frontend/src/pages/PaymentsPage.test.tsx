import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaymentsPage from '@/pages/PaymentsPage';
import { renderWithProviders, signIn } from '@/test/renderApp';
import type { User } from '@/types';

describe('PaymentsPage', () => {
  it('renders payment data with Indian currency and opens the recording dialog', async () => {
    const user = userEvent.setup();
    signIn();
    renderWithProviders(<PaymentsPage />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect((await screen.findAllByText('UPI-4471209'))[0]).toBeInTheDocument();
    expect(screen.getByText('₹6,200')).toBeInTheDocument();
    expect(screen.getByText('Total collected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /record payment/i }));
    expect(screen.getByRole('dialog', { name: /record payment/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/bill or billing period/i)).toBeInTheDocument();
  });

  it('hides record payment for residents', async () => {
    const resident: User = {
      id: 'usr-resident',
      name: 'Kiran Kumar',
      email: 'resident@mysociety.test',
      role: 'RESIDENT',
      societyId: 'green-valley',
    };
    signIn(resident);
    renderWithProviders(<PaymentsPage />);

    await waitFor(() => expect(screen.getAllByText('UPI-4471209')[0]).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /record payment/i })).not.toBeInTheDocument();
  });
});
