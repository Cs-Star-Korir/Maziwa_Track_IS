// Farmer screen (FR2): record a delivery, see the history, open a receipt.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FarmerHome from '../../src/pages/farmer/FarmerHome';
import { batch, fakeApi, renderAt, USERS } from '../helpers/ui.jsx';

const api = vi.hoisted(() => ({}));
vi.mock('../../src/services/api', () => ({ api, USE_MOCK: false }));

const paid = batch({
  batch_id: 2, batch_number: 'MT-20261017-0003', status: 'paid', declared_litres: 22, measured_litres: 21.5,
  quality_result: 'pass', payment: {
    payment_reference: 'PAY-20261018-0009', price_per_litre: 50, amount: 1075, email_sent: true, approved_at: '2026-10-18T11:05:00Z',
  },
});
const rejected = batch({ batch_id: 1, batch_number: 'MT-20261016-0002', status: 'rejected', measured_litres: 15, quality_result: 'reject' });

describe('FarmerHome', () => {
  beforeEach(() => {
    fakeApi(api, USERS.farmer);
    api.myBatches.mockResolvedValue([paid, rejected]);
  });

  it('F1: lists the farmer\'s deliveries with their status', async () => {
    renderAt(<FarmerHome />, { route: '/farmer' });
    const row = (await screen.findByText('MT-20261017-0003')).closest('tr');
    expect(within(row).getByText('Paid')).toBeInTheDocument();
    expect(within(row).getByText('21.50')).toBeInTheDocument();
    expect(within(screen.getByText('MT-20261016-0002').closest('tr')).getByText('Rejected')).toBeInTheDocument();
  });

  it('F1: says so when there are no deliveries yet', async () => {
    api.myBatches.mockResolvedValue([]);
    renderAt(<FarmerHome />, { route: '/farmer' });
    expect(await screen.findByText('No deliveries yet. Record your first delivery.')).toBeInTheDocument();
  });

  it('F3: refuses 0 or empty litres without calling the server', async () => {
    renderAt(<FarmerHome />, { route: '/farmer' });
    await userEvent.click(await screen.findByRole('button', { name: 'Save delivery' }));
    expect(screen.getByText('Litres must be a number greater than 0')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Declared litres'), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Save delivery' }));
    expect(api.createBatch).not.toHaveBeenCalled();
  });

  it('F2: saves the delivery and shows the batch number to give the grader', async () => {
    api.createBatch.mockResolvedValue(batch({ batch_number: 'MT-20261111-0031', declared_litres: 20.5 }));
    renderAt(<FarmerHome />, { route: '/farmer' });
    await userEvent.type(await screen.findByLabelText('Declared litres'), '20.5');
    await userEvent.click(screen.getByRole('button', { name: 'Save delivery' }));
    expect(api.createBatch).toHaveBeenCalledWith(20.5);
    const ticket = await screen.findByRole('status');
    expect(ticket).toHaveTextContent('Saved. Your batch number is');
    expect(ticket).toHaveTextContent('MT-20261111-0031');
    expect(api.myBatches).toHaveBeenCalledTimes(2); // the list is reloaded
  });

  it('F4: opens the receipt of a paid batch with the amount and reference', async () => {
    renderAt(<FarmerHome />, { route: '/farmer' });
    await userEvent.click(await screen.findByRole('button', { name: 'View receipt' }));
    const receipt = screen.getByRole('dialog');
    expect(receipt).toHaveTextContent('Payment receipt');
    expect(receipt).toHaveTextContent('KSh 1,075.00');
    expect(receipt).toHaveTextContent('PAY-20261018-0009');
    expect(within(receipt).getByRole('button', { name: /Print/ })).toBeInTheDocument();
  });

  it('only paid batches have a receipt button', async () => {
    renderAt(<FarmerHome />, { route: '/farmer' });
    await screen.findByText('MT-20261016-0002');
    expect(screen.getAllByRole('button', { name: 'View receipt' })).toHaveLength(1);
  });
});
