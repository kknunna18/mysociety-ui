import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResidentsPage from '@/pages/ResidentsPage';
import { renderWithProviders, signIn } from '@/test/renderApp';
import type { User } from '@/types';

describe('ResidentsPage', () => {
  it('shows residents and opens the add dialog for managers', async () => {
    const user = userEvent.setup();
    signIn();
    renderWithProviders(<ResidentsPage />);

    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    expect((await screen.findAllByText('Kiran Kumar'))[0]).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add resident/i }));
    expect(screen.getByRole('dialog', { name: /add resident/i })).toBeInTheDocument();
  });

  it('hides management actions for residents', async () => {
    const resident: User = {
      id: 'usr-resident',
      name: 'Kiran Kumar',
      email: 'resident@mysociety.test',
      role: 'RESIDENT',
      societyId: 'green-valley',
    };
    signIn(resident);
    renderWithProviders(<ResidentsPage />);

    await waitFor(() => expect(screen.getAllByText('Kiran Kumar')[0]).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /add resident/i })).not.toBeInTheDocument();
  });
});
