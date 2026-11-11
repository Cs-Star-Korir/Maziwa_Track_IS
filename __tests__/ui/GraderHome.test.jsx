// Grader screen (FR3): the testing queue, search, entering a result, the mismatch warning.
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GraderHome from '../../src/pages/grader/GraderHome';
import { batch, fakeApi, renderAt, USERS } from '../helpers/ui.jsx';

const api = vi.hoisted(() => ({}));
vi.mock('../../src/services/api', () => ({ api, USE_MOCK: false }));

const queue = [
  batch({ batch_id: 5, batch_number: 'MT-20261109-0005', farmer_name: 'Kamau Njoroge', declared_litres: 12.5 }),
  batch({ batch_id: 6, batch_number: 'MT-20261109-0006', farmer_name: 'Wanjiku Mwangi', declared_litres: 20 }),
];

describe('GraderHome', () => {
  beforeEach(() => {
    fakeApi(api, USERS.grader);
    api.batchesToTest.mockResolvedValue(queue);
  });

  it('G1: lists the batches waiting to be tested', async () => {
    renderAt(<GraderHome />, { route: '/grader' });
    expect(await screen.findByText('MT-20261109-0005')).toBeInTheDocument();
    expect(screen.getByText('MT-20261109-0006')).toBeInTheDocument();
    expect(screen.getByText('Select a batch from the list to test it.')).toBeInTheDocument();
  });

  it('search filters by batch number or farmer name', async () => {
    renderAt(<GraderHome />, { route: '/grader' });
    await userEvent.type(await screen.findByPlaceholderText('Search batch number or farmer'), 'kamau');
    expect(screen.getByText('MT-20261109-0005')).toBeInTheDocument();
    expect(screen.queryByText('MT-20261109-0006')).not.toBeInTheDocument();
    await userEvent.clear(screen.getByPlaceholderText('Search batch number or farmer'));
    await userEvent.type(screen.getByPlaceholderText('Search batch number or farmer'), 'zzz');
    expect(screen.getByText('No batch matches your search.')).toBeInTheDocument();
  });

  it('G2: warns when the measured litres differ from the declared litres', async () => {
    renderAt(<GraderHome />, { route: '/grader' });
    await userEvent.click(await screen.findByText('MT-20261109-0006'));
    expect(screen.getByRole('heading', { name: 'Test batch MT-20261109-0006' })).toBeInTheDocument();
    expect(screen.getByLabelText('Declared litres (read only)')).toHaveValue('20.00');

    await userEvent.type(screen.getByLabelText('Measured litres'), '20');
    expect(screen.queryByText(/differ from declared litres/)).not.toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Measured litres'));
    await userEvent.type(screen.getByLabelText('Measured litres'), '19.5');
    expect(screen.getByText(/Measured litres \(19\.50 L\) differ from declared litres \(20\.00 L\)/)).toBeInTheDocument();
  });

  it('G4: refuses an empty measurement without calling the server', async () => {
    renderAt(<GraderHome />, { route: '/grader' });
    await userEvent.click(await screen.findByText('MT-20261109-0005'));
    await userEvent.click(screen.getByRole('button', { name: 'Save result' }));
    expect(screen.getByText('Measured litres must be a number greater than 0')).toBeInTheDocument();
    expect(api.verifyBatch).not.toHaveBeenCalled();
  });

  it('G3: saves a Reject result with notes and confirms it', async () => {
    api.verifyBatch.mockResolvedValue(batch({ batch_number: 'MT-20261109-0005', status: 'rejected' }));
    renderAt(<GraderHome />, { route: '/grader' });
    await userEvent.click(await screen.findByText('MT-20261109-0005'));
    await userEvent.type(screen.getByLabelText('Measured litres'), '12.5');
    await userEvent.click(screen.getByLabelText('Reject'));
    await userEvent.type(screen.getByLabelText('Notes'), ' Failed alcohol test ');
    await userEvent.click(screen.getByRole('button', { name: 'Save result' }));

    expect(api.verifyBatch).toHaveBeenCalledWith('MT-20261109-0005',
      { measured_litres: 12.5, quality_result: 'reject', grader_notes: 'Failed alcohol test' });
    expect(await screen.findByText('Saved. Batch MT-20261109-0005 marked as Rejected.')).toBeInTheDocument();
  });

  it('says so when no batches are waiting', async () => {
    api.batchesToTest.mockResolvedValue([]);
    renderAt(<GraderHome />, { route: '/grader' });
    expect(await screen.findByText('No batches waiting to be tested.')).toBeInTheDocument();
  });
});
