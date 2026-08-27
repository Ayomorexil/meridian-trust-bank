import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import BottomNav from '../components/BottomNav';
import Shell from '../components/Shell';
import DepositModal from '../components/DepositModal';
import PayBillsModal from '../components/PayBillsModal';
import { useAuthStore } from '../store/useAuthStore';
import { useBankStore } from '../store/useBankStore';

const KYC_LABELS = {
  verified: {
    text: '✓ Verified member',
    className: 'text-good',
  },
  pending: {
    text: '⏳ Verification pending',
    className: 'text-amber-600',
  },
  rejected: {
    text: '⚠ Verification rejected — contact support',
    className: 'text-danger',
  },
  unverified: {
    text: 'Not yet verified',
    className: 'text-muted',
  },
};

export default function More() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const {
    accounts,
    fetchAccounts,
    showToast,
  } = useBankStore();

  const [showDeposit, setShowDeposit] = useState(false);
  const [showPayBills, setShowPayBills] = useState(false);

  useEffect(() => {
    if (accounts.length === 0) {
      fetchAccounts();
    }
  }, [accounts.length, fetchAccounts]);

  const checkingAccount = accounts.find(
    (account) => account.account_type === 'checking'
  );

  const kyc =
    KYC_LABELS[user?.kycStatus] || KYC_LABELS.unverified;

  const notAvailable = (label) => () => {
    showToast(`${label} is currently unavailable.`);
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <Shell>
      <Topbar subtitle="Member Services" />

      <div className="no-scrollbar flex-1 overflow-y-auto p-4">
        <div className="flex items-center gap-3.5 rounded-lg2 border border-line bg-surface p-[18px] shadow-sm2">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy to-blue-mid text-xl font-extrabold text-white">
            {user?.avatarInitials || '••'}
          </div>

          <div>
            <div className="text-base font-extrabold text-ink">
              {user?.fullName || 'Member'}
            </div>

            <div className="mt-0.5 text-xs text-muted">
              {user?.memberNumber || 'MT-0000-0000'}
            </div>

            <div
              className={`mt-1 text-[11px] font-bold ${kyc.className}`}
            >
              {kyc.text}
            </div>
          </div>
        </div>

        <SectionHeader>Banking Services</SectionHeader>

        <MenuCard
          items={[
            {
              label: 'Investment Portfolio',
              onClick: () => navigate('/investments'),
            },
            {
              label: 'Analytics',
              onClick: () => navigate('/analytics'),
            },
            {
              label: 'Pay Bills',
              onClick: () =>
                accounts.length
                  ? setShowPayBills(true)
                  : notAvailable('Pay Bills')(),
            },
            {
              label: 'Mobile Check Deposit',
              onClick: () =>
                checkingAccount
                  ? setShowDeposit(true)
                  : notAvailable('Mobile Check Deposit')(),
            },
            {
              label: 'Statements & Notices',
              onClick: () => navigate('/accounts'),
            },
            {
              label: 'Card Management',
              onClick: notAvailable('Card Management'),
            },
            {
              label: 'Branch Finder',
              onClick: notAvailable('Branch Finder'),
            },
          ]}
        />

        <SectionHeader>Support & Security</SectionHeader>

        <MenuCard
          items={[
            {
              label: 'Live Chat',
              onClick: notAvailable('Live Chat'),
            },
            {
              label: 'Call 1-800-555-0134',
              onClick: notAvailable('Phone support'),
            },
            {
              label: 'Security Settings',
              onClick: notAvailable('Security Settings'),
            },
            {
              label: 'Notification Preferences',
              onClick: notAvailable('Notification Preferences'),
            },
            {
              label: 'Account Settings',
              onClick: notAvailable('Account Settings'),
            },
          ]}
        />

        <div className="mt-2.5 overflow-hidden rounded-lg2 border border-line bg-surface shadow-sm2">
          <div
            onClick={handleSignOut}
            className="flex cursor-pointer items-center justify-between px-[18px] py-[15px] text-[14px] font-semibold text-danger hover:bg-bg"
          >
            🚪 &nbsp;Sign Out
            <span className="text-base text-danger">›</span>
          </div>
        </div>

        <div className="pb-1 pt-4 text-center text-[11px] leading-loose text-muted">
          Meridian Trust Federal Credit Union
        </div>
      </div>

      <BottomNav />

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
    </Shell>
  );
}

function SectionHeader({ children }) {
  return (
    <div className="px-0 pb-2 pt-4 text-[15px] font-bold text-ink">
      {children}
    </div>
  );
}

function MenuCard({ items }) {
  return (
    <div className="overflow-hidden rounded-lg2 border border-line bg-surface shadow-sm2">
      {items.map((item, index) => (
        <div
          key={item.label}
          onClick={item.onClick}
          className={`flex cursor-pointer items-center justify-between px-[18px] py-[15px] text-sm font-semibold text-ink hover:bg-bg ${
            index !== items.length - 1
              ? 'border-b border-line'
              : ''
          }`}
        >
          {item.label}
          <span className="text-base text-muted">›</span>
        </div>
      ))}
    </div>
  );
}
