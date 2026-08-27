import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import BottomNav from '../components/BottomNav';
import Shell from '../components/Shell';
import AccountDetailModal from '../components/AccountDetailModal';
import { useBankStore } from '../store/useBankStore';

const HEADER_BG = {
  checking: 'bg-gradient-to-br from-navy-dark to-blue-mid',
  savings: 'bg-gradient-to-br from-[#B83A0A] to-brand-mid',
  credit: 'bg-gradient-to-br from-[#0A5A3A] to-good',
};

export default function Accounts() {
  const navigate = useNavigate();
  const { accounts, fetchAccounts } = useBankStore();
  const [modal, setModal] = useState(null); // { account, tab }

  useEffect(() => {
    fetchAccounts();
  }, []);

  return (
    <Shell>
      <Topbar subtitle="My Accounts" />
      <div className="no-scrollbar flex-1 overflow-y-auto p-4">
        {accounts.map((a) => (
          <div key={a.id} className="mb-3 overflow-hidden rounded-lg2 border border-line bg-surface shadow-sm2">
            <div className={`flex items-start justify-between px-[18px] py-4 text-white ${HEADER_BG[a.account_type]}`}>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide opacity-75">
                  {a.nickname}
                  {a.account_type === 'savings' ? ` · ${a.apy}% APY` : ''}
                </div>
                <div className="mt-1 text-[27px] font-extrabold tracking-tight">
                  ${Number(a.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-[38px] opacity-30">
                {a.account_type === 'checking' ? '🏦' : a.account_type === 'savings' ? '💰' : '💳'}
              </div>
            </div>

            <div className="grid grid-cols-3 border-b border-line">
              {a.account_type === 'checking' && (
                <>
                  <Stat label="Available" value={`$${Number(a.available_balance).toFixed(2)}`} />
                  <Stat label="Pending" value="$0.00" color="text-brand" />
                  <Stat label="Acct #" value={`••${a.account_number.slice(-4)}`} mono />
                </>
              )}
              {a.account_type === 'savings' && (
                <>
                  <Stat label="Balance" value={`$${Number(a.balance).toLocaleString()}`} color="text-good" />
                  <Stat label="Goal" value={a.savings_goal ? `$${Number(a.savings_goal).toLocaleString()}` : '—'} />
                  <Stat label="Acct #" value={`••${a.account_number.slice(-4)}`} mono />
                </>
              )}
              {a.account_type === 'credit' && (
                <>
                  <Stat label="Credit Limit" value={`$${Number(a.credit_limit).toLocaleString()}`} />
                  <Stat label="Available" value={`$${Number(a.available_balance).toLocaleString()}`} color="text-good" />
                  <Stat label="Acct #" value={`••${a.account_number.slice(-4)}`} mono />
                </>
              )}
            </div>

            {a.account_type === 'savings' && a.savings_goal && (
              <ProgressBar
                label="Savings goal"
                pct={Math.min(100, Math.round((a.balance / a.savings_goal) * 100))}
                color="from-[#B83A0A] to-brand-mid"
              />
            )}
            {a.account_type === 'credit' && (
              <ProgressBar
                label={`Credit usage (${Math.round((a.balance / a.credit_limit) * 100)}%)`}
                pct={Math.round((a.balance / a.credit_limit) * 100)}
                color="bg-good"
                solid
                right={a.balance / a.credit_limit < 0.3 ? 'Excellent' : 'Good'}
              />
            )}

            <div className="flex gap-2 p-3.5">
              {a.account_type === 'credit' && (
                <ActionBtn label="Pay Now" tone="green" onClick={() => navigate('/transfer')} />
              )}
              <ActionBtn
                label="Statements"
                tone={a.account_type === 'savings' ? 'orange' : a.account_type === 'credit' ? 'green' : 'blue'}
                onClick={() => setModal({ account: a, tab: 'statements' })}
              />
              <ActionBtn
                label="Details"
                tone={a.account_type === 'savings' ? 'orange' : a.account_type === 'credit' ? 'green' : 'blue'}
                onClick={() => setModal({ account: a, tab: 'details' })}
              />
              {a.account_type !== 'credit' && (
                <ActionBtn
                  label="Alerts"
                  tone={a.account_type === 'savings' ? 'orange' : 'blue'}
                  onClick={() => setModal({ account: a, tab: 'alerts' })}
                />
              )}
            </div>
          </div>
        ))}
      </div>
      <BottomNav />

      {modal && (
        <AccountDetailModal account={modal.account} initialTab={modal.tab} onClose={() => setModal(null)} />
      )}
    </Shell>
  );
}

function Stat({ label, value, color = 'text-ink', mono }) {
  return (
    <div className="border-l border-line px-3.5 py-3 text-center first:border-l-0">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-[3px] text-sm font-extrabold ${color} ${mono ? 'font-mono text-xs' : ''}`}>{value}</div>
    </div>
  );
}

function ProgressBar({ label, pct, color, solid, right }) {
  return (
    <div className="px-4 pb-1 pt-2.5">
      <div className="mb-1.5 flex justify-between text-[11px] text-muted">
        <span>{label}</span>
        <span>{right ?? `${pct}%`}</span>
      </div>
      <div className="h-[7px] rounded bg-line">
        <div
          className={`h-full rounded ${solid ? color : `bg-gradient-to-r ${color}`}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ActionBtn({ label, tone, onClick }) {
  const tones = {
    blue: 'bg-blue-light text-blue',
    orange: 'bg-brand-light text-[#B83A0A]',
    green: 'bg-good-light text-good',
  };
  return (
    <button onClick={onClick} className={`flex-1 rounded-sm2 py-2.5 text-xs font-bold hover:opacity-80 ${tones[tone]}`}>
      {label}
    </button>
  );
}
