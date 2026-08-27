import { useEffect, useState } from 'react';
import AdminLayout from './AdminLayout';
import { bankService } from '../../api/bank';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-light text-blue',
  held: 'bg-purple-100 text-purple-700',
  scheduled: 'bg-blue-light text-blue',
  completed: 'bg-good-light text-good',
  declined: 'bg-red-100 text-danger',
  cancelled: 'bg-gray-100 text-gray-600',
  failed: 'bg-red-100 text-danger',
  reversed: 'bg-orange-100 text-[#B83A0A]',
  refunded: 'bg-orange-100 text-[#B83A0A]',
};

export default function AdminTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    bankService
      .adminListTransfers(filter || undefined)
      .then((res) => setTransfers(res.data.transfers))
      .catch((err) => setError(err.message || 'Could not load transfers.'));
  };

  useEffect(load, [filter]);

  const act = async (fn, id, needsReason) => {
    let reason;
    if (needsReason) {
      reason = window.prompt('Reason for this action (required, shown in the audit log):');
      if (!reason) return;
    }
    setBusyId(id);
    setError('');
    try {
      await fn(id, reason);
      load();
    } catch (err) {
      setError(err.message || 'Action failed.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Transfers</h1>
          <p className="mt-1 text-sm text-muted">Approve, hold, reject, or reverse member transfers.</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input w-48">
          <option value="">All statuses</option>
          {['pending', 'processing', 'held', 'scheduled', 'completed', 'declined', 'cancelled', 'failed', 'reversed'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="mt-4 rounded-md2 bg-[#FEE2E2] px-4 py-3 text-sm font-semibold text-danger">{error}</div>}

      <div className="mt-6 overflow-hidden rounded-lg2 border border-line bg-surface shadow-sm2">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg text-xs font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">From → To</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={t.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <div className="font-semibold text-ink">{t.customer_name}</div>
                  <div className="text-xs text-muted">{t.member_number}</div>
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {t.from_nickname} → {t.to_nickname || t.external_label || 'External'}
                </td>
                <td className="px-4 py-3 font-bold text-ink">${Number(t.amount).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-600'}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted">{new Date(t.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {['pending', 'processing', 'held', 'scheduled'].includes(t.status) && (
                      <>
                        <ActionBtn disabled={busyId === t.id} onClick={() => act(bankService.adminApproveTransfer, t.id, false)} tone="green">
                          Approve
                        </ActionBtn>
                        <ActionBtn disabled={busyId === t.id} onClick={() => act(bankService.adminRejectTransfer, t.id, true)} tone="red">
                          Reject
                        </ActionBtn>
                        {t.status !== 'held' && (
                          <ActionBtn disabled={busyId === t.id} onClick={() => act(bankService.adminHoldTransfer, t.id, true)} tone="amber">
                            Hold
                          </ActionBtn>
                        )}
                        {t.status === 'held' && (
                          <ActionBtn disabled={busyId === t.id} onClick={() => act(bankService.adminReleaseTransfer, t.id, false)} tone="blue">
                            Release
                          </ActionBtn>
                        )}
                      </>
                    )}
                    {t.status === 'completed' && (
                      <ActionBtn disabled={busyId === t.id} onClick={() => act(bankService.adminReverseTransfer, t.id, true)} tone="orange">
                        Reverse
                      </ActionBtn>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {transfers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                  No transfers found for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

function ActionBtn({ children, tone, ...props }) {
  const tones = {
    green: 'bg-good-light text-good hover:bg-good hover:text-white',
    red: 'bg-red-100 text-danger hover:bg-danger hover:text-white',
    amber: 'bg-amber-100 text-amber-800 hover:bg-amber-500 hover:text-white',
    blue: 'bg-blue-light text-blue hover:bg-blue hover:text-white',
    orange: 'bg-brand-light text-[#B83A0A] hover:bg-brand hover:text-white',
  };
  return (
    <button
      {...props}
      className={`rounded-sm2 px-2.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
