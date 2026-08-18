import { describe, expect, it } from 'vitest';
import { mockApi } from '@/mocks/mockApi';
import { ApiError } from '@/types';

describe('mockApi', () => {
  it('authenticates a seeded user and rejects a bad password', async () => {
    const session = await mockApi.login('admin@mysociety.test', 'admin123');
    expect(session.user.role).toBe('ADMIN');
    expect(session.token).toContain('usr-admin');

    await expect(mockApi.login('admin@mysociety.test', 'nope')).rejects.toBeInstanceOf(ApiError);
  });

  it('filters residents by name, unit or email', async () => {
    const byUnit = await mockApi.listResidents('b-201');
    expect(byUnit).toHaveLength(1);
    expect(byUnit[0].name).toBe('Meera Nair');

    const all = await mockApi.listResidents();
    expect(all.length).toBeGreaterThan(byUnit.length);
  });

  it('rejects a second active resident for the same unit', async () => {
    await expect(
      mockApi.createResident({
        name: 'Duplicate',
        email: 'dup@example.com',
        phone: '+91 90000 00000',
        unit: 'A-402',
        ownership: 'TENANT',
        moveInDate: '2024-05-01',
        active: true,
      })
    ).rejects.toThrow(/already has an active resident/);
  });

  it('marks an invoice paid, records the payment and writes an audit entry', async () => {
    const payment = await mockApi.recordPayment('inv-2402', 'UPI');
    expect(payment.amount).toBe(3800);

    const invoices = await mockApi.listInvoices();
    expect(invoices.find((invoice) => invoice.id === 'inv-2402')?.status).toBe('PAID');

    const audit = await mockApi.listAudit();
    expect(audit[0].action).toBe('PAYMENT_RECORDED');

    await expect(mockApi.recordPayment('inv-2402', 'CARD')).rejects.toThrow(/already paid/);
  });

  it('advances complaint status', async () => {
    const complaint = await mockApi.updateComplaintStatus('cmp-501', 'IN_PROGRESS');
    expect(complaint.status).toBe('IN_PROGRESS');
    await expect(mockApi.updateComplaintStatus('cmp-nope', 'CLOSED')).rejects.toThrow(/not found/);
  });

  it('checks visitors in and out', async () => {
    const checkedIn = await mockApi.checkInVisitor('vis-302');
    expect(checkedIn.status).toBe('CHECKED_IN');
    expect(checkedIn.checkedInAt).toBeDefined();

    const checkedOut = await mockApi.checkOutVisitor('vis-302');
    expect(checkedOut.status).toBe('CHECKED_OUT');
  });

  it('prevents double-booking a facility slot', async () => {
    const booking = await mockApi.createBooking({
      facilityId: 'fac-gym',
      residentId: 'res-001',
      unit: 'A-402',
      date: '2024-06-01',
      slot: '07:00-08:00',
    });
    expect(booking.status).toBe('REQUESTED');

    await expect(
      mockApi.createBooking({
        facilityId: 'fac-gym',
        residentId: 'res-002',
        unit: 'B-201',
        date: '2024-06-01',
        slot: '07:00-08:00',
      })
    ).rejects.toThrow(/already booked/);
  });

  it('summarises dues and open complaints', async () => {
    const summary = await mockApi.getSummary();
    expect(summary.residents).toBe(3);
    expect(summary.openComplaints).toBe(2);
    expect(summary.duesAmount).toBe(3800 + 4100 + 3600);
  });
});
