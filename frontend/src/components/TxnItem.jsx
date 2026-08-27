const ICONS = {
  income: { emoji: '💵', bg: 'bg-good-light' },
  shopping: { emoji: '🛍️', bg: 'bg-brand-light' },
  food: { emoji: '🍔', bg: 'bg-[#FEF3E2]' },
  transfer: { emoji: '⇅', bg: 'bg-blue-light' },
  bills: { emoji: '📱', bg: 'bg-[#F3F0FE]' },
  gas: { emoji: '⛽', bg: 'bg-[#FFF7E6]' },
  admin_adjustment: { emoji: '🛠️', bg: 'bg-[#F3F0FE]' },
  reversal: { emoji: '↩️', bg: 'bg-[#FFF7E6]' },
  other: { emoji: '💠', bg: 'bg-blue-light' },
};

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
  ' · ' +
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export default function TxnItem({ txn, accountLabel }) {
  const icon = ICONS[txn.category] || ICONS.other;
  const isCredit = txn.direction === 'credit';

  return (
    <div className="flex items-center gap-3 rounded-md2 border border-line bg-surface p-3.5 transition-all hover:translate-x-0.5 hover:bg-[#F8FAFC]">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[11px] text-[19px] ${icon.bg}`}>
        {icon.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-bold text-ink">{txn.description}</div>
        <div className="mt-px text-[11px] text-muted">
          {fmtDate(txn.created_at)}
          {accountLabel ? ` · ${accountLabel}` : ''}
        </div>
      </div>
      <div
        className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${
          isCredit ? 'bg-good-light text-good' : 'bg-red-50 text-danger'
        }`}
      >
        {isCredit ? '+' : '−'}${Number(txn.amount).toFixed(2)}
      </div>
    </div>
  );
}
