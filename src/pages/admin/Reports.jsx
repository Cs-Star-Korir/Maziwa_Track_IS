// W5 – Reports (FR5). Shows a preview with logo, cooperative name and date,
// then "Download PDF" opens the browser's print dialog (choose "Save as PDF").
import { useState } from 'react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import DocHeader from '../../components/DocHeader';
import { api } from '../../services/api';
import { litres, ksh, date, todayISO, isMismatch } from '../../utils/format';

const reportTypes = {
  daily: 'Daily collection',
  payments: 'Payments by date range',
  statement: 'Farmer statement',
  mismatch: 'Litre mismatches',
};

export default function Reports() {
  const [form, setForm] = useState({ type: 'daily', from: todayISO(), to: todayISO(), farmer: '' });
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function generate(e) {
    e.preventDefault();
    setError('');
    if (form.from > form.to) { setError('"From" date must be before "To" date.'); return; }
    if (form.type === 'statement' && !form.farmer.trim()) { setError('Enter a farmer name for a farmer statement.'); return; }
    setBusy(true);
    try {
      let rows = await api.listBatches({
        from: form.from, to: form.type === 'daily' ? form.from : form.to, farmer: form.farmer.trim(),
      });
      if (form.type === 'payments') rows = rows.filter((b) => b.payment);
      if (form.type === 'mismatch') rows = rows.filter(isMismatch);
      setReport({ ...form, rows, generatedAt: new Date().toISOString() });
      api.logReport(reportTypes[form.type]).catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const period = report && (report.type === 'daily'
    ? date(report.from)
    : `${date(report.from)} to ${date(report.to)}`);
  const totalLitres = report?.rows.reduce((s, b) => s + Number(b.measured_litres ?? b.declared_litres), 0) || 0;
  const totalPaid = report?.rows.reduce((s, b) => s + (b.payment?.amount || 0), 0) || 0;
  const totalDeclared = report?.rows.reduce((s, b) => s + Number(b.declared_litres), 0) || 0;
  const totalMeasured = report?.rows.reduce((s, b) => s + Number(b.measured_litres || 0), 0) || 0;
  // Difference = measured - declared (negative means less milk arrived than the farmer declared)
  const diff = (n) => (n > 0 ? '+' : '') + litres(n);

  return (
    <Layout title="Reports">
      <div className="row g-4">
        <div className="col-lg-4 no-print">
          <h2 className="mb-3">Choose a report</h2>
          <form onSubmit={generate} noValidate>
            <div className="mb-2">
              <label className="form-label small" htmlFor="type">Report</label>
              <select id="type" name="type" className="form-select" value={form.type} onChange={update}>
                {Object.entries(reportTypes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="row g-2 mb-2">
              <div className="col">
                <label className="form-label small" htmlFor="from">{form.type === 'daily' ? 'Date' : 'From'}</label>
                <input id="from" name="from" type="date" className="form-control" value={form.from} onChange={update} />
              </div>
              {form.type !== 'daily' && (
                <div className="col">
                  <label className="form-label small" htmlFor="to">To</label>
                  <input id="to" name="to" type="date" className="form-control" value={form.to} onChange={update} />
                </div>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label small" htmlFor="farmerR">
                Farmer {form.type === 'statement' ? '' : '(optional)'}
              </label>
              <input id="farmerR" name="farmer" className="form-control" value={form.farmer} onChange={update} />
            </div>
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <button className="btn btn-primary w-100" disabled={busy}>{busy ? 'Generating…' : 'Generate report'}</button>
          </form>
        </div>

        <div className="col-lg-8">
          {!report ? (
            <div className="card no-print"><div className="card-body text-body-secondary">
              Choose a report and dates, then click Generate report to see a preview.
            </div></div>
          ) : (
            <>
              <div className="d-flex justify-content-end mb-2 no-print">
                <button className="btn btn-outline-primary" onClick={() => window.print()}>
                  <i className="fa-solid fa-file-pdf me-1" /> Download PDF
                </button>
              </div>
              <div className="card print-area"><div className="card-body">
                <DocHeader
                  title={`${reportTypes[report.type]} Report, ${period}`}
                  subtitle={`Generated ${date(report.generatedAt)}${report.farmer ? ` · Farmer: ${report.farmer}` : ''}`}
                />
                {report.rows.length === 0 ? (
                  <p className="text-body-secondary mb-0">No records for this period.</p>
                ) : report.type === 'mismatch' ? (
                  <div className="table-responsive"><table className="table table-sm small mb-0">
                    <thead>
                      <tr>
                        <th>Batch no.</th><th>Date</th><th>Farmer</th>
                        <th className="text-end">Declared (L)</th><th className="text-end">Measured (L)</th>
                        <th className="text-end">Difference (L)</th><th>Status</th><th>Grader notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((b) => (
                        <tr key={b.batch_id}>
                          <td className="text-nowrap">{b.batch_number}</td>
                          <td className="text-nowrap">{date(b.delivered_at)}</td>
                          <td>{b.farmer_name}</td>
                          <td className="text-end">{litres(b.declared_litres)}</td>
                          <td className="text-end">{litres(b.measured_litres)}</td>
                          <td className="text-end text-nowrap">{diff(b.measured_litres - b.declared_litres)}</td>
                          <td><StatusBadge status={b.status} /></td>
                          <td>{b.grader_notes || '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="fw-bold">
                        <td colSpan={3}>Total ({report.rows.length} {report.rows.length === 1 ? 'batch' : 'batches'})</td>
                        <td className="text-end">{litres(totalDeclared)}</td>
                        <td className="text-end">{litres(totalMeasured)}</td>
                        <td className="text-end text-nowrap">{diff(totalMeasured - totalDeclared)}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table></div>
                ) : (
                  <div className="table-responsive"><table className="table table-sm small mb-0">
                    <thead>
                      <tr>
                        <th>Batch no.</th>{report.type !== 'daily' && <th>Date</th>}<th>Farmer</th>
                        <th className="text-end">Litres</th><th>Status</th>
                        {report.type !== 'daily' && <><th>Payment ref</th><th className="text-end">Amount</th></>}
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((b) => (
                        <tr key={b.batch_id}>
                          <td className="text-nowrap">{b.batch_number}</td>
                          {report.type !== 'daily' && <td className="text-nowrap">{date(b.delivered_at)}</td>}
                          <td>{b.farmer_name}</td>
                          <td className="text-end">{litres(b.measured_litres ?? b.declared_litres)}</td>
                          <td><StatusBadge status={b.status} /></td>
                          {report.type !== 'daily' && <>
                            <td className="text-nowrap">{b.payment?.payment_reference || '–'}</td>
                            <td className="text-end text-nowrap">{b.payment ? ksh(b.payment.amount) : '–'}</td>
                          </>}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="fw-bold">
                        <td colSpan={report.type === 'daily' ? 2 : 3}>Total</td>
                        <td className="text-end">{litres(totalLitres)}</td>
                        <td />
                        {report.type !== 'daily' && <><td /><td className="text-end text-nowrap">{ksh(totalPaid)}</td></>}
                      </tr>
                    </tfoot>
                  </table></div>
                )}
                <p className="small text-body-secondary mt-2 mb-0">
                  {report.type === 'mismatch'
                    ? 'Batches where the litres measured by the grader differ from what the farmer declared. Difference = measured minus declared.'
                    : 'Litres are measured litres where the batch has been tested, otherwise declared litres.'}
                </p>
              </div></div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
