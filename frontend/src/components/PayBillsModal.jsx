import { useEffect, useState } from 'react';
import { bankService } from '../api/bank';
import { useBankStore } from '../store/useBankStore';

export default function PayBillsModal({ accounts, onClose }) {
  const { fetchAccounts, fetchRecentActivity, showToast } = useBankStore();
  const [tab, setTab] = useState('scheduled');
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);
  const [error, setError] = useState('');

  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [submitting, setSubmitting] = useState(false);

  const loadBills = () => {
    setLoading(true);
    bankService
      .getBills()
      .then((res) => setBills(res.data.bills))
      .catch((err) => setError(err.message || 'Could not load bills.'))
      .finally(() => setLoading(false));
  };

  useEffect(loadBills, []);

  const payNow = async (bill) => {
    setPayingId(bill.id);
    setError('');
    try {
      await bankService.payBillNow(bill.id);
      await fetchAccounts();
      await fetchRecentActivity();
      showToast(`✓  Paid ${bill.payee} — $${Number(bill.amount).toFixed(2)}`);
      loadBills();
    } catch (err) {
      setError(err.message || 'Payment failed.');
    } finally {
      setPayingId(null);
    }
  };

  const submitAdHoc = async (e) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(amount);
    if (!payee.trim()) {
      setError('Enter who you\u2019re paying.');
      return;
    }
    if (!amt || amt <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setSubmitting(true);
    try {
      await bankService.payAdHocBill({ accountId, payee, amount: amt, category: 'bills' });
      await fetchAccounts();
      await fetchRecentActivity();
      showToast(`✓  $${amt.toFixed(2)} paid to ${payee}`);
      setPayee('');
      setAmount('');
    } catch (err) {
      setError(err.message || 'Payment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const daysUntil = (dateStr) => {
    const days = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
    if (days <= 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days} days`;
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-black/40 backdrop-blur-sm">
      <div className="mt-auto flex max-h-[92%] flex-col rounded-t-[24px] bg-surface shadow-lg2">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <span className="text-base font-extrabold text-ink">Pay Bills</span>
          <button onClick={onClose} className="text-xl text-muted">
            ×
          </button>
        </div>

        <div className="flex gap-1 border-b border-line px-5 pt-3">
          <TabBtn active={tab === 'scheduled'} onClick={() => setTab('scheduled')}>
            Scheduled
          </TabBtn>
          <TabBtn active={tab === 'adhoc'} onClick={() => setTab('adhoc')}>
            Pay Someone New
          </TabBtn>
        </div>

        <div className="no-scrollbar overflow-y-auto p-5">
          {error && <div className="mb-3 rounded-md2 bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-danger">{error}</div>}

          {tab === 'scheduled' &&
            (loading ? (
              <div className="py-8 text-center text-sm text-muted">Loading…</div>
            ) : bills.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted">No scheduled bills.</div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {bills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between rounded-md2 border border-line p-3.5">
                    <div>
                      <div className="text-sm font-bold text-ink">{bill.payee}</div>
                      <div className="text-[11px] text-muted">
                        {daysUntil(bill.next_run_date)} · from {bill.account_nickname}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-extrabold text-ink">${Number(bill.amount).toFixed(2)}</span>
                      <button
                        onClick={() => payNow(bill)}
                        disabled={payingId === bill.id}
                        className="rounded-sm2 bg-navy px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                      >
                        {payingId === bill.id ? '…' : 'Pay Now'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {tab === 'adhoc' && (
            <form onSubmit={submitAdHoc} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">Pay From</label>
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input">
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nickname} — ${Number(a.available_balance ?? a.balance).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">Payee</label>
                <input
                  type="text"
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                  placeholder="e.g. City Water Department"
                  className="input"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">Amount</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-[15px] top-1/2 -translate-y-1/2 text-lg font-extrabold text-navy">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="input pl-8"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md2 bg-gradient-to-br from-navy to-blue py-3.5 text-sm font-extrabold text-white disabled:opacity-60"
              >
                {submitting ? 'Paying…' : 'Pay Bill'}
              </button>
            </form>
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
