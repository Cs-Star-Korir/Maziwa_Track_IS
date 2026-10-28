// W3 – Grader screen: batches to test, test batch (FR3).
import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { litres } from '../../utils/format';

const emptyResult = { measured: '', quality: 'pass', notes: '' };

export default function GraderHome() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(emptyResult);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.batchesToTest()
      .then(setBatches)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function select(b) {
    setSelected(b);
    setResult(emptyResult);
    setError('');
    setMessage('');
  }

  const q = search.trim().toLowerCase();
  const shown = batches.filter((b) =>
    !q || b.batch_number.toLowerCase().includes(q) || b.farmer_name.toLowerCase().includes(q));

  const measured = Number(result.measured);
  const mismatch = selected && result.measured !== '' && measured > 0 && measured !== Number(selected.declared_litres);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    if (!result.measured || Number.isNaN(measured) || measured <= 0) {
      setError('Measured litres must be a number greater than 0');
      return;
    }
    setBusy(true);
    try {
      const b = await api.verifyBatch(selected.batch_number, {
        measured_litres: +measured.toFixed(2),
        quality_result: result.quality,
        grader_notes: result.notes.trim(),
      });
      setMessage(`Saved. Batch ${b.batch_number} marked as ${b.status === 'passed' ? 'Passed' : 'Rejected'}.`);
      setSelected(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout title="Batches to test">
      <div className="row g-4">
        {/* Batches to test */}
        <div className="col-lg-6">
          <h2 className="mb-3">Waiting for testing</h2>
          <input type="search" className="form-control mb-3" placeholder="Search batch number or farmer"
            value={search} onChange={(e) => setSearch(e.target.value)} />
          {message && <div className="alert alert-success py-2">{message}</div>}
          {loading ? (
            <div className="spinner-border" />
          ) : shown.length === 0 ? (
            <p className="text-body-secondary">
              {batches.length === 0 ? 'No batches waiting to be tested.' : 'No batch matches your search.'}
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead><tr><th>Batch no.</th><th>Farmer</th><th className="text-end">Declared (L)</th></tr></thead>
                <tbody>
                  {shown.map((b) => (
                    <tr key={b.batch_id} role="button" onClick={() => select(b)}
                      className={selected?.batch_id === b.batch_id ? 'table-active' : ''}>
                      <td>{b.batch_number}</td>
                      <td>{b.farmer_name}</td>
                      <td className="text-end">{litres(b.declared_litres)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Test batch */}
        <div className="col-lg-6">
          {!selected ? (
            <div className="card"><div className="card-body text-body-secondary">
              Select a batch from the list to test it.
            </div></div>
          ) : (
            <div className="card">
              <div className="card-body">
                <h2 className="mb-2">Test batch {selected.batch_number}</h2>
                <p className="mb-3">Farmer: {selected.farmer_name}</p>
                <form onSubmit={handleSave} noValidate>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="declaredRO">Declared litres (read only)</label>
                    <input id="declaredRO" className="form-control" value={litres(selected.declared_litres)} readOnly disabled />
                  </div>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="measured">Measured litres</label>
                    <input id="measured" type="number" min="0" step="0.01" className="form-control"
                      value={result.measured} onChange={(e) => setResult({ ...result, measured: e.target.value })} autoFocus />
                  </div>
                  <div className="mb-3">
                    <div className="form-label">Quality</div>
                    {['pass', 'reject'].map((q) => (
                      <div className="form-check form-check-inline" key={q}>
                        <input className="form-check-input" type="radio" name="quality" id={q} value={q}
                          checked={result.quality === q} onChange={() => setResult({ ...result, quality: q })} />
                        <label className="form-check-label" htmlFor={q}>{q === 'pass' ? 'Pass' : 'Reject'}</label>
                      </div>
                    ))}
                  </div>
                  <div className="mb-3">
                    <label className="form-label" htmlFor="notes">Notes</label>
                    <textarea id="notes" rows="3" className="form-control" placeholder="Optional notes about quality"
                      value={result.notes} onChange={(e) => setResult({ ...result, notes: e.target.value })} />
                  </div>

                  {mismatch && (
                    <div className="alert alert-warning py-2">
                      <i className="fa-solid fa-triangle-exclamation me-1" />
                      Measured litres ({litres(measured)} L) differ from declared litres ({litres(selected.declared_litres)} L).
                      The admin will see this batch flagged.
                    </div>
                  )}
                  {error && <div className="alert alert-danger py-2">{error}</div>}

                  <div className="d-flex gap-2">
                    <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save result'}</button>
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setSelected(null)}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
