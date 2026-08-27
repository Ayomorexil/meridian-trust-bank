import { useEffect, useState } from 'react';
import AdminLayout from './AdminLayout';
import { bankService } from '../../api/bank';
import api from '../../api/client';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [creditScore, setCreditScore] = useState(null);
  const [scoreInput, setScoreInput] = useState('');
  const [scoreReason, setScoreReason] = useState('');
  const [savingScore, setSavingScore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    bankService
      .adminListCustomers(search ? { search } : {})
      .then((res) => setCustomers(res.data.customers))
      .catch((err) => setError(err.message || 'Could not load customers.'));
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search]);

  const openCustomer = async (c) => {
    setSelected(c);
    setError('');
    try {
      const res = await api.get(`/admin/customers/${c.id}`).then((r) => r.data);
      setAccounts(res.data.accounts);
      const scoreRes = await bankService.adminGetCreditScore(c.id);
      setCreditScore(scoreRes.data.current);
      setScoreInput(scoreRes.data.current?.score ?? '');
      setScoreReason('');
    } catch (err) {
      setError(err.message || 'Could not load customer detail.');
    }
  };

  const toggleStatus = async (c) => {
    try {
      if (c.status === 'active') {
        const reason = window.prompt('Reason for suspending this member:');
        if (!reason) return;
        await bankService.adminSuspendCustomer(c.id, reason);
      } else {
        await bankService.adminReactivateCustomer(c.id);
      }
      load();
      if (selected?.id === c.id) openCustomer(c);
    } catch (err) {
      setError(err.message || 'Action failed.');
    }
  };

  const adjustBalance = async (account, direction) => {
    const amount = window.prompt(`Amount to ${direction} on ${account.nickname}:`);
    if (!amount || isNaN(parseFloat(amount))) return;
    const reason = window.prompt('Reason for this adjustment (required for the audit log):');
    if (!reason) return;
    try {
      await bankService.adminAdjustBalance(account.id, { amount: parseFloat(amount), direction, reason });
      openCustomer(selected);
    } catch (err) {
      setError(err.message || 'Adjustment failed.');
    }
  };

  const toggleFreeze = async (account) => {
    const reason = window.prompt(`Reason to ${account.status === 'frozen' ? 'unfreeze' : 'freeze'} ${account.nickname}:`);
    if (!reason) return;
    try {
      if (account.status === 'frozen') {
        await bankService.adminUnfreezeAccount(account.id, reason);
      } else {
        await bankService.adminFreezeAccount(account.id, reason);
      }
      openCustomer(selected);
    } catch (err) {
      setError(err.message || 'Action failed.');
    }
  };

  const setKyc = async (status) => {
    const reason = window.prompt(`Reason for setting KYC to "${status}":`);
    if (!reason) return;
    try {
      await bankService.adminSetKyc(selected.id, status, reason);
      load();
      setSelected({ ...selected, kyc_status: status });
    } catch (err) {
      setError(err.message || 'Action failed.');
    }
  };

  const saveCreditScore = async (e) => {
    e.preventDefault();
    const score = parseInt(scoreInput, 10);
    if (!score || score < 300 || score > 850) {
      setError('Credit score must be a whole number between 300 and 850.');
      return;
    }
    if (!scoreReason.trim()) {
      setError('A reason is required to change a credit score.');
      return;
    }
    setSavingScore(true);
    setError('');
    try {
      const res = await bankService.adminSetCreditScore(selected.id, { score, reason: scoreReason });
      setCreditScore(res.data.creditScore);
      setScoreReason('');
    } catch (err) {
      setError(err.message || 'Could not update credit score.');
    } finally {
      setSavingScore(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Customers</h1>
          <p className="mt-1 text-sm text-muted">Search members, manage status, and adjust account balances.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md2 bg-navy px-4 py-2.5 text-xs font-bold text-white hover:bg-blue"
        >
          + New Customer
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email, or member number…"
        className="input mt-4 max-w-md"
      />

      {error && <div className="mt-4 rounded-md2 bg-[#FEE2E2] px-4 py-3 text-sm font-semibold text-danger">{error}</div>}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="overflow-hidden rounded-lg2 border border-line bg-surface shadow-sm2">
          {customers.map((c) => (
            <div
              key={c.id}
              onClick={() => openCustomer(c)}
              className={`flex cursor-pointer items-center justify-between border-b border-line px-4 py-3 last:border-b-0 hover:bg-bg ${
                selected?.id === c.id ? 'bg-blue-light' : ''
              }`}
            >
              <div>
                <div className="text-sm font-bold text-ink">{c.full_name}</div>
                <div className="text-xs text-muted">
                  {c.member_number} · {c.email}
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  c.status === 'active' ? 'bg-good-light text-good' : 'bg-red-100 text-danger'
                }`}
              >
                {c.status}
              </span>
            </div>
          ))}
          {customers.length === 0 && <div className="p-6 text-center text-sm text-muted">No members found.</div>}
        </div>

        <div className="rounded-lg2 border border-line bg-surface p-5 shadow-sm2">
          {!selected ? (
            <div className="py-10 text-center text-sm text-muted">Select a member to view details.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-lg font-extrabold text-ink">{selected.full_name}</div>
                  <div className="text-xs text-muted">{selected.email}</div>
                </div>
                <button
                  onClick={() => toggleStatus(selected)}
                  className={`rounded-sm2 px-3 py-2 text-xs font-bold ${
                    selected.status === 'active' ? 'bg-red-100 text-danger hover:bg-danger hover:text-white' : 'bg-good-light text-good hover:bg-good hover:text-white'
                  }`}
                >
                  {selected.status === 'active' ? 'Suspend Member' : 'Reactivate Member'}
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-md2 bg-bg p-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-muted">KYC Status</div>
                  <div className="text-sm font-bold capitalize text-ink">{selected.kyc_status}</div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => setKyc('verified')} className="rounded-sm2 bg-good-light px-2.5 py-1.5 text-xs font-bold text-good hover:bg-good hover:text-white">
                    Verify
                  </button>
                  <button onClick={() => setKyc('rejected')} className="rounded-sm2 bg-red-100 px-2.5 py-1.5 text-xs font-bold text-danger hover:bg-danger hover:text-white">
                    Reject
                  </button>
                </div>
              </div>

              <form onSubmit={saveCreditScore} className="mt-3 rounded-md2 border border-line p-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Simulated Credit Score</div>
                  {creditScore && (
                    <div className="text-[10px] text-muted">
                      Last set {new Date(creditScore.recorded_at).toLocaleDateString()}
                      {creditScore.set_by_name ? ` by ${creditScore.set_by_name}` : ''}
                    </div>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[100px]">
                    <label className="mb-1 block text-[10px] font-semibold text-muted">Score (300–850)</label>
                    <input
                      type="number"
                      min="300"
                      max="850"
                      value={scoreInput}
                      onChange={(e) => setScoreInput(e.target.value)}
                      className="input py-2"
                    />
                  </div>
                  <div className="flex-[2] min-w-[160px]">
                    <label className="mb-1 block text-[10px] font-semibold text-muted">Reason</label>
                    <input
                      type="text"
                      value={scoreReason}
                      onChange={(e) => setScoreReason(e.target.value)}
                      placeholder="e.g. Manual recalculation after dispute"
                      className="input py-2"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingScore}
                    className="rounded-sm2 bg-navy px-3 py-2.5 text-xs font-bold text-white hover:bg-blue disabled:opacity-50"
                  >
                    {savingScore ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </form>

              <div className="mt-5 space-y-3">
                {accounts.map((a) => (
                  <div key={a.id} className="rounded-md2 border border-line p-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-ink">{a.nickname}</div>
                        <div className="text-xs text-muted">•••• {a.account_number.slice(-4)} · {a.status}</div>
                      </div>
                      <div className="text-lg font-extrabold text-navy">${Number(a.balance).toFixed(2)}</div>
                    </div>
                    <div className="mt-2.5 flex gap-2">
                      <button
                        onClick={() => adjustBalance(a, 'credit')}
                        className="flex-1 rounded-sm2 bg-good-light py-1.5 text-xs font-bold text-good hover:bg-good hover:text-white"
                      >
                        + Credit
                      </button>
                      <button
                        onClick={() => adjustBalance(a, 'debit')}
                        className="flex-1 rounded-sm2 bg-red-100 py-1.5 text-xs font-bold text-danger hover:bg-danger hover:text-white"
                      >
                        − Debit
                      </button>
                      <button
                        onClick={() => toggleFreeze(a)}
                        className="flex-1 rounded-sm2 bg-blue-light py-1.5 text-xs font-bold text-blue hover:bg-blue hover:text-white"
                      >
                        {a.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateCustomerModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </AdminLayout>
  );
}

function CreateCustomerModal({ onClose, onCreated }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [kycStatus, setKycStatus] = useState('pending');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim() || !email.trim() || password.length < 8) {
      setError('Full name, email, and a password of at least 8 characters are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await bankService.adminCreateCustomer({ fullName, email, phone, password, kycStatus });
      setCreated(res.data);
    } catch (err) {
      setError(err.message || 'Could not create customer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg2 bg-surface p-6 shadow-lg2">
        <div className="flex items-center justify-between">
          <span className="text-base font-extrabold text-ink">New Customer</span>
          <button onClick={onClose} className="text-xl text-muted">
            ×
          </button>
        </div>

        {!created ? (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <FormField label="Full Name">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" />
            </FormField>
            <FormField label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
            </FormField>
            <FormField label="Phone (optional)">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
            </FormField>
            <FormField label="Initial Password">
              <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="Min. 8 characters — share with the customer securely" />
            </FormField>
            <FormField label="Initial KYC Status">
              <select value={kycStatus} onChange={(e) => setKycStatus(e.target.value)} className="input">
                <option value="pending">Pending review</option>
                <option value="verified">Verified (skip review)</option>
                <option value="unverified">Unverified</option>
              </select>
            </FormField>
            {error && <div className="rounded-md2 bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-danger">{error}</div>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md2 bg-gradient-to-br from-navy to-blue py-3 text-sm font-extrabold text-white disabled:opacity-60"
            >
              {submitting ? 'Creating…' : 'Create Customer & Accounts'}
            </button>
          </form>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="rounded-md2 bg-good-light p-3.5 text-sm font-semibold text-good">
              ✓ Customer created — checking and savings accounts opened automatically.
            </div>
            <div className="rounded-md2 bg-bg p-3.5 text-xs">
              <div><b>Member #:</b> {created.user.member_number}</div>
              <div className="mt-1"><b>Checking Acct #:</b> {created.accounts[0].account_number}</div>
              <div className="mt-1"><b>Savings Acct #:</b> {created.accounts[1].account_number}</div>
              <div className="mt-2 text-muted">
                Find this customer any time under Customers → search by name, email, or member number.
              </div>
            </div>
            <button onClick={onCreated} className="w-full rounded-md2 bg-navy py-2.5 text-sm font-bold text-white">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">{label}</label>
      {children}
    </div>
  );
}
