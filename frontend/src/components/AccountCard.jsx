const STYLES = {
  checking: { bg: 'bg-gradient-to-br from-navy-dark to-blue-mid', icon: '🏦', network: 'MERIDIAN' },
  savings: { bg: 'bg-gradient-to-br from-[#B83A0A] to-brand-mid', icon: '💰', network: 'SAVINGS' },
  credit: { bg: 'bg-gradient-to-br from-ink to-[#1a2942]', icon: '💳', network: 'VISA' },
};

const fmt = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AccountCard({ account, onClick }) {
  const style = STYLES[account.account_type] || STYLES.checking;
  const last4 = account.account_number?.slice(-4) || '0000';

  return (
    <div
      onClick={onClick}
      className={`relative min-w-[200px] flex-shrink-0 cursor-pointer overflow-hidden rounded-lg2 p-4 text-white shadow-md2 transition-transform hover:-translate-y-[3px] ${style.bg}`}
    >
      <div className="absolute -right-[30px] -top-[30px] h-[110px] w-[110px] rounded-full bg-white/[0.08]" />

      <div className="flex items-start justify-between">
        <div className="h-6 w-8 rounded-[4px] bg-gradient-to-br from-amber-200 to-amber-400 opacity-90" />
        <div className="text-[10px] font-extrabold uppercase tracking-[1.5px] opacity-70">{style.network}</div>
      </div>

      <div className="mb-3.5 mt-3.5 font-mono text-[12px] tracking-wider opacity-70">•••• •••• •••• {last4}</div>

      <div className="text-[10px] font-bold uppercase tracking-[1.2px] opacity-60">{account.nickname}</div>
      <div className="text-[24px] font-extrabold tracking-tight">
        ${fmt(account.account_type === 'credit' ? account.balance : account.available_balance)}
      </div>
      {account.account_type === 'savings' && account.apy && (
        <div className="mt-[3px] text-[10px] opacity-70">{account.apy}% APY</div>
      )}
    </div>
  );
}
