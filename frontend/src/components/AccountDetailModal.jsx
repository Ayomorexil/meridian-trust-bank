import { useEffect, useState } from 'react';
import { bankService } from '../api/bank';

export default function AccountDetailModal({ account, initialTab = 'details', onClose }) {
  const [tab, setTab] = useState(initialTab);
  const [detail, setDetail] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const load =
      tab === 'details'
        ? bankService.getAccountById(account.id).then((res) => setDetail(res.data.account))
        : tab === 'statements'
        ? bankService.getAccountTransactions(account.id, 50).then((res) => setTransactions(res.data.transactions))
        : bankService.getNotifications().then((res) => setNotifications(res.data.notifications));

    load.catch((err) => setError(err.message || 'Could not load this data.')).finally(() => setLoading(false));
  }, [tab, account.id]);

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-black/40 backdrop-blur-sm">
      <div className="mt-auto flex max-h-[90%] flex-col rounded-t-[24px] bg-surface shadow-lg2">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <span className="text-base font-extrabold text-ink">{account.nickname}</span>
          <button onClick={onClose} className="text-xl text-muted">
            ×
          </button>
        </div>

        <div className="flex gap-1 border-b border-line px-5 pt-3">
          <TabBtn active={tab === 'details'} onClick={() => setTab('details')}>
            Details
          </TabBtn>
          <TabBtn active={tab === 'statements'} onClick={() => setTab('statements')}>
            Statements
          </TabBtn>
          <TabBtn active={tab === 'alerts'} onClick={() => setTab('alerts')}>
            Alerts
          </TabBtn>
        </div>

        <div className="no-scrollbar overflow-y-auto p-5">
          {loading && <div className="py-8 text-center text-sm text-muted">Loading…</div>}
          {error && <div className="rounded-md2 bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-danger">{error}</div>}

          {!loading && tab === 'details' && detail && (
            <div className="space-y-3 text-sm">
              <DetailRow label="Account Type" value={detail.account_type} capitalize />
              <DetailRow label="Account Number" value={`•••• •••• •••• ${detail.account_number.slice(-4)}`} mono />
              <DetailRow label="Status" value={detail.status} capitalize />
              <DetailRow label="Current Balance" value={`$${Number(detail.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} bold />
              <DetailRow label="Available Balance" value={`$${Number(detail.available_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
              {detail.credit_limit && (
                <DetailRow label="Credit Limit" value={`$${Number(detail.credit_limit).toLocaleString()}`} />
              )}
              {detail.apy && <DetailRow label="APY" value={`${detail.apy}%`} />}
              <DetailRow label="Opened" value={new Date(detail.created_at).toLocaleDateString()} />
            </div>
          )}

          {!loading && tab === 'statements' && (
            <div className="flex flex-col gap-2">
              {transactions.length === 0 && <div className="py-6 text-center text-sm text-muted">No transactions yet.</div>}
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-md2 border border-line p-3">
                  <div>
                    <div className="text-sm font-semibold text-ink">{t.description}</div>
                    <div className="text-[11px] text-muted">{new Date(t.created_at).toLocaleString()}</div>
                  </div>
                  <div className={`text-sm font-extrabold ${t.direction === 'credit' ? 'text-good' : 'text-danger'}`}>
                    {t.direction === 'credit' ? '+' : '−'}${Number(t.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && tab === 'alerts' && (
            <div className="flex flex-col gap-2">
              {notifications.length === 0 && <div className="py-6 text-center text-sm text-muted">No alerts.</div>}
              {notifications.map((n) => (
                <div key={n.id} className={`rounded-md2 border p-3 ${n.read ? 'border-line' : 'border-blue-light bg-blue-light/40'}`}>
                  <div className="text-sm font-bold text-ink">{n.title}</div>
                  <div className="mt-0.5 text-xs text-muted">{n.body}</div>
                  <div className="mt-1 text-[10px] text-muted">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-3 pb-2.5 text-sm font-bold transition-colors ${
        active ? 'border-navy text-navy' : 'border-transparent text-muted'
      }`}
    >
      {children}
    </button>
  );
}

function DetailRow({ label, value, mono, bold, capitalize }) {
  return (
    <div className="flex items-center justify-between border-b border-line pb-2.5">
      <span className="text-muted">{label}</span>
      <span
        className={`text-right text-ink ${bold ? 'font-extrabold' : 'font-semibold'} ${mono ? 'font-mono text-xs' : ''} ${
          capitalize ? 'capitalize' : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
}
