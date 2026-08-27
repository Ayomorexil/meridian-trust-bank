import { useEffect } from 'react';
import Topbar from '../components/Topbar';
import BottomNav from '../components/BottomNav';
import Shell from '../components/Shell';
import { useBankStore } from '../store/useBankStore';

export default function Investments() {
  const { investments, portfolioValue, fetchInvestments } = useBankStore();

  useEffect(() => {
    fetchInvestments();
  }, []);

  const totalGainLoss = investments.reduce((sum, i) => sum + Number(i.totalGainLoss || 0), 0);
  const totalCost = investments.reduce((sum, i) => sum + Number(i.shares) * Number(i.avg_cost), 0);
  const totalGainLossPct = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

  return (
    <Shell>
      <Topbar subtitle="Investment Portfolio" />
      <div className="no-scrollbar flex-1 overflow-y-auto p-4">
        <div className="rounded-lg2 bg-gradient-to-br from-navy-dark to-blue p-5 text-white shadow-md2">
          <div className="text-[11px] font-semibold uppercase tracking-[1.5px] opacity-60">Portfolio Value</div>
          <div className="mt-1 text-[32px] font-extrabold tracking-tight">
            ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`mt-1.5 inline-block rounded-full px-2.5 py-[3px] text-[12px] font-bold ${
            totalGainLoss >= 0 ? 'bg-[#1A7A3A]/35 text-[#5FD989]' : 'bg-danger/25 text-red-200'
          }`}>
            {totalGainLoss >= 0 ? '↑' : '↓'} ${Math.abs(totalGainLoss).toLocaleString('en-US', { minimumFractionDigits: 2 })} (
            {totalGainLossPct.toFixed(2)}%) all time
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[15px] font-bold text-ink">Holdings</span>
          <span className="text-[11px] text-muted">Prices update on the daily settlement cycle</span>
        </div>

        <div className="mt-2 flex flex-col gap-2">
          {investments.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between rounded-md2 border border-line bg-surface p-3.5 shadow-sm2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-blue-light text-xs font-extrabold text-blue">
                  {inv.symbol}
                </div>
                <div>
                  <div className="text-[13px] font-bold text-ink">{inv.company_name}</div>
                  <div className="text-[11px] text-muted">
                    {Number(inv.shares).toLocaleString()} shares @ ${Number(inv.current_price).toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-extrabold text-ink">
                  ${Number(inv.marketValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className={`text-[11px] font-bold ${inv.totalGainLoss >= 0 ? 'text-good' : 'text-danger'}`}>
                  {inv.totalGainLoss >= 0 ? '+' : ''}
                  {Number(inv.totalGainLossPct).toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
          {investments.length === 0 && (
            <div className="py-8 text-center text-sm text-muted">No holdings yet.</div>
          )}
        </div>

        <div className="mt-4 rounded-md2 bg-blue-light p-3.5 text-[12px] leading-relaxed text-blue">
          ℹ️ Holdings and prices are simulated for demonstration purposes and don't reflect real market data. Daily
          gains/losses post automatically into your linked brokerage account balance.
        </div>
      </div>
      <BottomNav />
    </Shell>
  );
}
