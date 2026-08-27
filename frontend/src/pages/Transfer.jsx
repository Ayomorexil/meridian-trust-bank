import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import BottomNav from '../components/BottomNav';
import Toast from '../components/Toast';
import Shell from '../components/Shell';
import { useAuthStore } from '../store/useAuthStore';
import { useBankStore } from '../store/useBankStore';

export default function Transfer() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { accounts, fetchAccounts, submitTransfer, showToast } = useBankStore();

  const [mode, setMode] = useState('internal'); // 'internal' | 'external'
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [externalKind, setExternalKind] = useState('external_ach'); // 'external_ach' | 'wire' | 'zelle'
  const [recipientName, setRecipientName] = useState('');
  const [externalBankName, setExternalBankName] = useState('');
  const [externalAccountNumber, setExternalAccountNumber] = useState('');
  const [externalRoutingNumber, setExternalRoutingNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (accounts.length && !fromId) setFromId(accounts[0].id);
    if (accounts.length > 1 && !toId) setToId(accounts[1].id);
  }, [accounts]);

  const swap = () => {
    if (mode !== 'internal') return;
    setFromId(toId);
    setToId(fromId);
  };

  const kycPending = user?.kycStatus && user.kycStatus !== 'verified';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('Enter a valid transfer amount.');
      return;
    }
    if (mode === 'external') {
      if (!recipientName.trim() || !externalBankName.trim() || !externalAccountNumber.trim()) {
        setError('Recipient name, bank name, and account number are required.');
        return;
      }
      if (externalKind !== 'zelle' && !/^\d{9}$/.test(externalRoutingNumber)) {
        setError('Routing number must be exactly 9 digits.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload =
        mode === 'internal'
          ? { fromAccountId: fromId, toAccountId: toId, kind: 'internal', amount: amt, memo, scheduledDate: date }
          : {
              fromAccountId: fromId,
              kind: externalKind,
              externalLabel: externalKind === 'zelle' ? 'Zelle® Contact' : 'External Account (ACH/Wire)',
              recipientName,
              externalBankName,
              externalAccountNumber,
              externalRoutingNumber: externalKind === 'zelle' ? undefined : externalRoutingNumber,
              amount: amt,
              memo,
              scheduledDate: date,
            };

      const transfer = await submitTransfer(payload);
      showToast(
        transfer?.status === 'completed'
          ? `✓  $${amt.toFixed(2)} transfer submitted!`
          : `✓  $${amt.toFixed(2)} transfer submitted — pending review.`
      );
      setAmount('');
      setMemo('');
      setRecipientName('');
      setExternalBankName('');
      setExternalAccountNumber('');
      setExternalRoutingNumber('');
      if (transfer?.status === 'completed') {
        navigate(`/receipt/${transfer.id}`);
      }
    } catch (err) {
      setError(err.message || 'Transfer failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      <Topbar subtitle="Transfer Funds" />
      <div className="no-scrollbar flex-1 overflow-y-auto p-4">
        {kycPending && (
          <div className="mb-4 rounded-md2 border border-amber-200 bg-amber-50 p-3.5 text-[12px] font-medium leading-relaxed text-amber-800">
            ⚠️ Your identity verification (KYC) is still <b>{user.kycStatus}</b>. Transfers are blocked until a staff
            member verifies your account — this is enforced by the server, not just this screen.
          </div>
        )}

        <div className="mb-4 flex rounded-md2 border border-line bg-bg p-1">
          <button
            type="button"
            onClick={() => setMode('internal')}
            className={`flex-1 rounded-sm2 py-2 text-sm font-bold transition-colors ${
              mode === 'internal' ? 'bg-surface text-navy shadow-sm2' : 'text-muted'
            }`}
          >
            Between My Accounts
          </button>
          <button
            type="button"
            onClick={() => setMode('external')}
            className={`flex-1 rounded-sm2 py-2 text-sm font-bold transition-colors ${
              mode === 'external' ? 'bg-surface text-navy shadow-sm2' : 'text-muted'
            }`}
          >
            External / Someone Else
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg2 border border-line bg-surface p-5 shadow-sm2">
          <Field label="From Account">
            <select value={fromId} onChange={(e) => setFromId(e.target.value)} className="input">
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nickname} — ${Number(a.available_balance ?? a.balance).toFixed(2)}
                </option>
              ))}
            </select>
          </Field>

          {mode === 'internal' ? (
            <>
              <div className="relative z-10 -my-1.5 text-center">
                <button
                  type="button"
                  onClick={swap}
                  className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-full bg-blue text-base text-white shadow-sm2 transition-transform hover:rotate-180"
                >
                  ⇅
                </button>
              </div>
              <Field label="To Account" className="mt-2.5">
                <select value={toId} onChange={(e) => setToId(e.target.value)} className="input">
                  {accounts
                    .filter((a) => a.id !== fromId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nickname} — ${Number(a.available_balance ?? a.balance).toFixed(2)}
                      </option>
                    ))}
                </select>
              </Field>
            </>
          ) : (
            <>
              <Field label="Transfer Method">
                <select value={externalKind} onChange={(e) => setExternalKind(e.target.value)} className="input">
                  <option value="external_ach">External Bank Account (ACH)</option>
                  <option value="wire">Wire Transfer</option>
                  <option value="zelle">Zelle® Contact</option>
                </select>
              </Field>
              <Field label="Recipient Name">
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Full name on the receiving account"
                  className="input"
                />
              </Field>
              <Field label="Recipient Bank Name">
                <input
                  type="text"
                  value={externalBankName}
                  onChange={(e) => setExternalBankName(e.target.value)}
                  placeholder="e.g. Chase, Bank of America"
                  className="input"
                />
              </Field>
              <Field label="Account Number">
                <input
                  type="text"
                  inputMode="numeric"
                  value={externalAccountNumber}
                  onChange={(e) => setExternalAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="4–17 digits"
                  className="input font-mono"
                  maxLength={17}
                />
              </Field>
              {externalKind !== 'zelle' && (
                <Field label="Routing Number">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={externalRoutingNumber}
                    onChange={(e) => setExternalRoutingNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="9-digit ABA routing number"
                    className="input font-mono"
                    maxLength={9}
                  />
                </Field>
              )}
            </>
          )}

          <Field label="Amount">
            <div className="relative">
              <span className="pointer-events-none absolute left-[15px] top-1/2 -translate-y-1/2 text-[22px] font-extrabold text-navy">
                $
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="input pl-8 text-[30px] font-extrabold tracking-tight text-navy"
              />
            </div>
          </Field>

          <Field label="Transfer Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </Field>

          <Field label="Memo (optional)">
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="e.g. Monthly savings goal"
              className="input"
            />
          </Field>

          {error && <div className="mb-4 rounded-md2 bg-[#FEE2E2] px-3 py-2 text-[12px] font-semibold text-danger">{error}</div>}

          <div className="mb-4 flex gap-2 rounded-md2 bg-blue-light p-3 text-[12px] font-medium leading-relaxed text-blue">
            <span>ℹ️</span>
            <span>
              {mode === 'internal'
                ? 'Transfers between your own Meridian Trust accounts are instant and free.'
                : 'External transfers are routed through the admin approval queue before funds move — simulated, no real payment network involved.'}
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting || kycPending}
            className="w-full rounded-md2 bg-gradient-to-br from-navy to-blue py-[15px] text-base font-extrabold tracking-wide text-white shadow-md2 disabled:opacity-60"
          >
            {submitting ? 'Processing…' : kycPending ? 'Verification Required' : 'Review Transfer →'}
          </button>
        </form>
      </div>
      <BottomNav />
      <Toast />
    </Shell>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <div className={`mb-4 ${className}`}>
      <label className="mb-[7px] block text-[11px] font-bold uppercase tracking-wide text-muted">{label}</label>
      {children}
    </div>
  );
}
