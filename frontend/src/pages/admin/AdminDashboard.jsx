import { useEffect, useState } from 'react';
import AdminLayout from './AdminLayout';
import { bankService } from '../../api/bank';

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [cycleResult, setCycleResult] = useState(null);
  const [running, setRunning] = useState(false);

  const loadSummary = () => {
    bankService
      .adminSummary()
      .then((res) => setSummary(res.data))
      .catch((err) => setError(err.message || 'Could not load dashboard.'));
  };

  useEffect(loadSummary, []);

  const runCycle = async () => {
    setRunning(true);
    setError('');
    try {
      const res = await bankService.adminRunDailyCycle();
      setCycleResult(res.data);
      loadSummary();
    } catch (err) {
      setError(err.message || 'Could not run the daily cycle.');
    } finally {
      setRunning(false);
    }
  };

  const cards = summary
    ? [
        { label: 'Total Members', value: summary.customerCount },
        { label: 'Pending Transfers', value: summary.pendingTransfersCount, highlight: true },
        { label: 'Total Deposits On Book', value: `$${summary.totalDeposits.toLocaleString('en-US', { maximumFractionDigits: 0 })}` },
        { label: '24h Approved Volume', value: `$${summary.last24hVolume.toLocaleString('en-US', { maximumFractionDigits: 0 })}` },
      ]
    : [];

  return (
    <AdminLayout>
      <h1 className="text-2xl font-extrabold text-ink">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">Overview of Meridian Trust's simulated banking activity.</p>

      {error && <div className="mt-4 rounded-md2 bg-[#FEE2E2] px-4 py-3 text-sm font-semibold text-danger">{error}</div>}

      <div className="mt-6 grid grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg2 border border-line bg-surface p-5 shadow-sm2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">{c.label}</div>
            <div className={`mt-2 text-3xl font-extrabold ${c.highlight ? 'text-brand' : 'text-navy'}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg2 border border-line bg-surface p-6 shadow-sm2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-ink">Daily Settlement Cycle</div>
            <p className="mt-1 text-xs text-muted">
              Runs automatically every night. Trigger it manually here to show investment gains/losses and recurring
              bill/tax debits posting live, for a demo.
            </p>
          </div>
          <button
            onClick={runCycle}
            disabled={running}
            className="rounded-md2 bg-navy px-4 py-2.5 text-xs font-bold text-white hover:bg-blue disabled:opacity-50"
          >
            {running ? 'Running…' : 'Run Cycle Now'}
          </button>
        </div>
        {cycleResult && (
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-md2 bg-bg p-3">
              <div className="font-bold text-ink">Investments accrued: {cycleResult.investments.length}</div>
              <ul className="mt-1 space-y-0.5 text-muted">
                {cycleResult.investments.map((i) => (
                  <li key={i.symbol}>
                    {i.symbol}: {i.pct >= 0 ? '+' : ''}
                    {i.pct}% ({i.delta >= 0 ? '+' : ''}${i.delta})
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-md2 bg-bg p-3">
              <div className="font-bold text-ink">Charges processed: {cycleResult.charges.length}</div>
              <ul className="mt-1 space-y-0.5 text-muted">
                {cycleResult.charges.map((c, i) => (
                  <li key={i}>
                    {c.payee}: ${c.amount} {c.paid ? '✓ paid' : '✗ declined'}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg2 border border-line bg-surface p-6 shadow-sm2">
        <div className="text-sm font-bold text-ink">Quick actions</div>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted">
          <li>Review the transfer approval queue under <b>Transfers</b> — approve, hold, reject, or reverse.</li>
          <li>Suspend, reactivate, or adjust balances for individual members under <b>Customers</b>.</li>
          <li>Every balance-affecting action is written to the immutable <b>Audit Logs</b> trail.</li>
        </ul>
      </div>
    </AdminLayout>
  );
}
