import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import BottomNav from '../components/BottomNav';
import Toast from '../components/Toast';
import AccountCard from '../components/AccountCard';
import TxnItem from '../components/TxnItem';
import Shell from '../components/Shell';
import DepositModal from '../components/DepositModal';
import PayBillsModal from '../components/PayBillsModal';
import NotificationsModal from '../components/NotificationsModal';
import { useAuthStore } from '../store/useAuthStore';
import { useBankStore } from '../store/useBankStore';
import { bankService } from '../api/bank';

export default function Home() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const {
    accounts,
    transactions,
    fetchAccounts,
    fetchRecentActivity,
    creditScore,
    fetchCreditScore,
    showToast,
  } = useBankStore();

  const [showDeposit, setShowDeposit] = useState(false);
  const [showPayBills, setShowPayBills] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [nextBill, setNextBill] = useState(null);

  useEffect(() => {
    fetchAccounts();
    fetchRecentActivity();
    fetchCreditScore();

    bankService
      .getBills()
      .then((res) => setNextBill(res.data.bills[0] || null))
      .catch(() => {});
  }, [fetchAccounts, fetchRecentActivity, fetchCreditScore]);

  const totalBalance = useMemo(
    () =>
      accounts.reduce(
        (sum, account) =>
          sum +
          (account.account_type === 'credit'
            ? 0
            : Number(account.available_balance || 0)),
        0
      ),
    [accounts]
  );

  const monthlySpend = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.direction === 'debit')
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
    [transactions]
  );

  const checkingAccount = accounts.find(
    (account) => account.account_type === 'checking'
  );

  const daysUntil = (dateStr) => {
    if (!dateStr) return '';

    const days = Math.ceil(
      (new Date(dateStr) - new Date()) / 86400000
    );

    if (days <= 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';

    return `Due in ${days} days`;
  };

  return (
    <Shell>
      <Topbar />

      <div className="relative flex-shrink-0 overflow-hidden bg-gradient-to-br from-navy-dark via-navy to-blue px-[22px] pb-[30px] pt-[18px]">
        <div className="absolute -right-[60px] -top-[60px] h-[220px] w-[220px] rounded-full bg-white/[0.04]" />
        <div className="absolute -right-5 bottom-[-80px] h-[280px] w-[280px] rounded-full bg-brand/[0.08]" />

        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="text-[12px] font-medium text-white/60">
              Good morning 👋
            </div>

            <div className="text-[17px] font-extrabold text-white">
              {user?.fullName || 'Member'}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            aria-label="Open notifications"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-base text-white"
          >
            🔔
          </button>
        </div>

        <div className="relative z-10 mt-5">
          <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-white/50">
            Total Balance
          </div>

          <div className="my-1 text-[42px] font-extrabold tracking-tighter text-white">
            $
            {totalBalance.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>

          <div className="inline-block rounded-full border border-[#5FD989]/25 bg-[#1A7A3A]/35 px-2.5 py-[3px] text-[12px] font-bold text-[#5FD989]">
            ↑ Available across all accounts
          </div>
        </div>

        <div className="relative z-10 mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={() =>
              checkingAccount
                ? setShowDeposit(true)
                : showToast('No checking account found.')
            }
            className="flex-1 rounded-full bg-white py-3 text-center text-[13px] font-extrabold text-navy shadow-md2 transition-transform active:scale-95"
          >
            📷 &nbsp;Deposit
          </button>

          <button
            type="button"
            onClick={() => navigate('/transfer')}
            className="flex-1 rounded-full border border-white/25 bg-white/15 py-3 text-center text-[13px] font-extrabold text-white transition-colors hover:bg-white/25 active:scale-95"
          >
            ⇅ &nbsp;Transfer
          </button>

          <button
            type="button"
            onClick={() =>
              accounts.length ? setShowPayBills(true) : null
            }
            className="flex-1 rounded-full border border-white/25 bg-white/15 py-3 text-center text-[13px] font-extrabold text-white transition-colors hover:bg-white/25 active:scale-95"
          >
            💳 &nbsp;Pay Bills
          </button>
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto pb-4">
        <div className="mt-4 grid grid-cols-2 gap-2.5 px-[18px]">
          <div className="rounded-md2 border border-line bg-surface p-3.5 shadow-sm2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Credit Score
            </div>

            <div className="mt-1 text-2xl font-extrabold text-good">
              {creditScore?.value ?? '—'}
            </div>

            <div className="mt-[3px] text-[11px] font-bold text-good">
              ↑ +12 this month
            </div>
          </div>

          <div className="rounded-md2 border border-line bg-surface p-3.5 shadow-sm2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Monthly Spend
            </div>

            <div className="mt-1 text-2xl font-extrabold text-ink">
              $
              {monthlySpend.toLocaleString('en-US', {
                maximumFractionDigits: 0,
              })}
            </div>

            <div className="mt-[3px] text-[11px] font-bold text-brand">
              ↑ +8% vs last
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-[18px] pb-2.5 pt-4">
          <span className="text-[15px] font-bold text-ink">
            My Cards
          </span>

          <span
            onClick={() => navigate('/accounts')}
            className="cursor-pointer text-xs font-bold text-blue-mid"
          >
            + Add
          </span>
        </div>

        <div className="no-scrollbar flex gap-3 overflow-x-auto px-[18px] pb-1">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onClick={() => navigate('/accounts')}
            />
          ))}
        </div>

        {nextBill && (
          <div className="mx-[18px] mt-4 flex items-center justify-between rounded-md2 border border-[#FFD4B5] bg-brand-light p-3.5">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-[#A83800]">
                Upcoming Payment
              </div>

              <div className="text-sm font-extrabold text-[#6B2200]">
                {nextBill.payee} · $
                {Number(nextBill.amount).toFixed(2)}
              </div>

              <div className="text-[11px] text-[#A83800]">
                {daysUntil(nextBill.next_run_date)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPayBills(true)}
              className="rounded-full bg-brand px-4 py-2 text-xs font-extrabold text-white"
            >
              Pay Now
            </button>
          </div>
        )}

        <div className="flex items-center justify-between px-[18px] pb-2.5 pt-4">
          <span className="text-[15px] font-bold text-ink">
            Recent Transactions
          </span>

          <span className="cursor-pointer text-xs font-bold text-blue-mid">
            See More →
          </span>
        </div>

        <div className="flex flex-col gap-[3px] px-[18px]">
          {transactions.slice(0, 6).map((transaction) => (
            <TxnItem
              key={transaction.id}
              txn={transaction}
              accountLabel={transaction.account_nickname}
            />
          ))}

          {transactions.length === 0 && (
            <div className="py-6 text-center text-sm text-muted">
              No transactions yet.
            </div>
          )}
        </div>
      </div>

      <BottomNav />
      <Toast />

      {showDeposit && checkingAccount && (
        <DepositModal
          account={checkingAccount}
          onClose={() => setShowDeposit(false)}
        />
      )}

      {showPayBills && (
        <PayBillsModal
          accounts={accounts}
          onClose={() => setShowPayBills(false)}
        />
      )}

      {showNotifications && (
        <NotificationsModal
          onClose={() => setShowNotifications(false)}
        />
      )}
    </Shell>
  );
}
