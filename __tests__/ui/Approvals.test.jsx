// Admin approvals screen (FR4): mismatches highlighted, approve with the amount shown, resend receipt.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Approvals from '../../src/pages/admin/Approvals';
import { batch, fakeApi, renderAt, USERS } from '../helpers/ui.jsx';

const api = vi.hoisted(() => ({}));
vi.mock('../../src/services/api', () => ({ api, USE_MOCK: false }));

const mismatched = batch({ batch_id: 3, batch_number: 'MT-20261109-0003', status: 'passed', declared_litres: 20, measured_litres: 19.5, quality_result: 'pass' });
const exact = batch({ batch_id: 4, batch_number: 'MT-20261109-0004', farmer_name: 'Kamau Njoroge', status: 'passed', declared_litres: 10, measured_litres: 10, quality_result: 'pass' });
const paidNoEmail = batch({
  batch_id: 2, batch_number: 'MT-20261109-0002', status: 'paid', measured_litres: 8, quality_result: 'pass',
  payment: { payment_reference: 'PAY-20261109-0001', price_per_litre: 50, amount: 400, email_sent: false, approved_at: '2026-11-09T10:00:00Z' },
});

const rowOf = async (number) => (await screen.findByText(number)).closest('tr');

describe('Approvals', () => {
  beforeEach(() => {
    fakeApi(api, USERS.admin);
    api.listBatches.mockResolvedValue([mismatched, exact]);
  });

  it('P1: shows passed batches by default, with mismatches highlighted', async () => {
    renderAt(<Approvals />, { route: '/admin' });
    const row = await rowOf('MT-20261109-0003');
    expect(api.listBatches).toHaveBeenCalledWith({ status: 'passed', from: '', to: '', farmer: '' });
    expect(row).toHaveClass('table-warning');
    expect(within(row).getByText('Mismatch')).toBeInTheDocument();
    expect(await rowOf('MT-20261109-0004')).not.toHaveClass('table-warning');
  });

  it('P2: the pop-up shows the amount (measured litres × price) before approving', async () => {
    api.approvePayment.mockResolvedValue({ ...mismatched, status: 'paid', payment: { payment_reference: 'PAY-20261109-0002', email_sent: true } });
    renderAt(<Approvals />, { route: '/admin' });
    await userEvent.click(within(await rowOf('MT-20261109-0003')).getByRole('button', { name: 'Approve' }));

    const popup = screen.getByRole('dialog');
    expect(popup).toHaveTextContent('Approve payment');
    expect(popup).toHaveTextContent('KSh 50.00');
    expect(popup).toHaveTextContent('KSh 975.00');
    expect(popup).toHaveTextContent('Litres differ from the declared amount (20.00 L)');

    await userEvent.click(within(popup).getByRole('button', { name: 'Approve' }));
    expect(api.approvePayment).toHaveBeenCalledWith('MT-20261109-0003');
    expect(await screen.findByText('Payment approved. Ref PAY-20261109-0002. Email sent to farmer.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('P4: tells the admin when the receipt email could not be sent', async () => {
    api.approvePayment.mockResolvedValue({ ...exact, status: 'paid', payment: { payment_reference: 'PAY-20261109-0003', email_sent: false } });
    renderAt(<Approvals />, { route: '/admin' });
    await userEvent.click(within(await rowOf('MT-20261109-0004')).getByRole('button', { name: 'Approve' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Approve' }));
    expect(await screen.findByText(/Email could not be sent; please inform the farmer\./)).toBeInTheDocument();
  });

  it('Cancel closes the pop-up without paying', async () => {
    renderAt(<Approvals />, { route: '/admin' });
    await userEvent.click(within(await rowOf('MT-20261109-0004')).getByRole('button', { name: 'Approve' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.approvePayment).not.toHaveBeenCalled();
  });

  it('P5: offers "Resend receipt" only for paid batches whose email failed', async () => {
    api.listBatches.mockResolvedValue([paidNoEmail]);
    api.resendReceipt.mockResolvedValue({ ...paidNoEmail, payment: { ...paidNoEmail.payment, email_sent: true } });
    renderAt(<Approvals />, { route: '/admin' });
    const row = await rowOf('MT-20261109-0002');
    expect(within(row).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    await userEvent.click(within(row).getByRole('button', { name: 'Resend receipt' }));
    expect(api.resendReceipt).toHaveBeenCalledWith('PAY-20261109-0001');
    expect(await screen.findByText('Receipt for MT-20261109-0002 sent to the farmer.')).toBeInTheDocument();
  });

  it('P6: filters by status and farmer name', async () => {
    renderAt(<Approvals />, { route: '/admin' });
    await screen.findByText('MT-20261109-0003');
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'paid');
    await userEvent.type(screen.getByLabelText('Farmer name'), ' Kamau ');
    await userEvent.click(screen.getByRole('button', { name: /Filter/ }));
    expect(api.listBatches).toHaveBeenLastCalledWith({ status: 'paid', from: '', to: '', farmer: 'Kamau' });
  });
});
