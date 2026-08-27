import { useEffect, useMemo } from 'react';
import Topbar from '../components/Topbar';
import BottomNav from '../components/BottomNav';
import Shell from '../components/Shell';
import { useBankStore } from '../store/useBankStore';

const CATEGORY_COLORS = {
  income: '#1A7A3A',
  shopping: '#E84E0F',
  food: '#F59E0B',
  transfer: '#0062CC',
  bills: '#7C3AED',
  gas: '#0EA5E9',
  taxes: '#DC2626',
  investment: '#059669',
  deposit: '#0EA5E9',
  subscription: '#EC4899',
  admin_adjustment: '#64748B',
  reversal: '#F97316',
  other: '#64748B',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Analytics() {
  const { transactions, fetchRecentActivity } = useBankStore();

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  const totalEarning = useMemo(
    () => transactions.filter((t) => t.direction === 'credit').reduce((sum, t) => sum + Number(t.amount), 0),
    [transactions]
  );
  const totalSpending = useMemo(
    () => transactions.filter((t) => t.direction === 'debit').reduce((sum, t) => sum + Number(t.amount), 0),
    [transactions]
  );

  // Bucket net activity into the last 7 days for the bar chart.
  const weeklyBars = useMemo(() => {
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { date: d, label: DAY_LABELS[d.getDay()], total: 0 };
    });
    transactions.forEach((t) => {
      const txnDate = new Date(t.created_at);
      const bucket = buckets.find((b) => b.date.toDateString() === txnDate.toDateString());
      if (bucket) bucket.total += Number(t.amount) * (t.direction === 'credit' ? 1 : 0.4);
    });
    const max = Math.max(1, ...buckets.map((b) => b.total));
    return buckets.map((b) => ({ ...b, pct: Math.round((b.total / max) * 100) }));
  }, [transactions]);

  const spendingByCategory = useMemo(() => {
    const map = {};
    transactions
      .filter((t) => t.direction === 'debit')
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + Number(t.amount);
      });
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
    return entries.map(([category, amount]) => ({
      category,
      amount,
      pct: Math.round((amount / total) * 100),
      color: CATEGORY_COLORS[category] || CATEGORY_COLORS.other,
    }));
  }, [transactions]);

  return (
    <Shell>
      <Topbar subtitle="Analytics" />
      <div className="no-scrollbar flex-1 overflow-y-auto p-4">
        <div className="rounded-lg2 border border-line bg-surface p-5 shadow-sm2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Total Earning</div>
          <div className="mt-1 text-[32px] font-extrabold tracking-tight text-ink">
            ${totalEarning.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>

          <div className="mt-5 flex items-end justify-between gap-2" style={{ height: 140 }}>
            {weeklyBars.map((b) => (
              <div key={b.label} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-1 items-end justify-center">
                  <div
                    className="w-full max-w-[26px] rounded-full bg-gradient-to-t from-navy to-blue-mid transition-all"
                    style={{ height: `${Math.max(6, b.pct)}%` }}
                  />
                </div>
                <div className="text-[10px] font-semibold text-muted">{b.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-lg2 border border-line bg-surface p-5 shadow-sm2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Total Spending</div>
            <span className="rounded-full bg-blue-light px-2.5 py-1 text-[10px] font-bold text-blue">Monthly</span>
          </div>
          <div className="mt-1 text-2xl font-extrabold text-ink">
            ${totalSpending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>

          {spendingByCategory.length > 0 && (
            <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full">
              {spendingByCategory.map((c) => (
                <div key={c.category} style={{ width: `${c.pct}%`, backgroundColor: c.color }} />
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2.5">
            {spendingByCategory.map((c) => (
              <div key={c.category} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-sm font-semibold capitalize text-ink">{c.category.replace('_', ' ')}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-ink">${c.amount.toFixed(2)}</div>
                  <div className="text-[10px] text-muted">{c.pct}%</div>
                </div>
              </div>
            ))}
            {spendingByCategory.length === 0 && (
              <div className="py-4 text-center text-sm text-muted">No spending yet.</div>
            )}
          </div>
        </div>
      </div>
      <BottomNav />
    </Shell>
  );
}
