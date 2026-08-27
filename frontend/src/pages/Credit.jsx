import { useEffect, useState } from 'react';
import Topbar from '../components/Topbar';
import BottomNav from '../components/BottomNav';
import Shell from '../components/Shell';
import { useBankStore } from '../store/useBankStore';
import { bankService } from '../api/bank';

export default function Credit() {
  const { creditScore, fetchCreditScore } = useBankStore();
  const [sim, setSim] = useState(null);

  useEffect(() => {
    fetchCreditScore();
  }, []);

  useEffect(() => {
    if (creditScore) {
      bankService.simulateCredit('payoff_credit_card').then((res) => setSim(res.data));
    }
  }, [creditScore?.value]);

  const score = creditScore?.value ?? 0;
  const pct = Math.max(0, Math.min(1, (score - 300) / (850 - 300)));
  const circumference = 2 * Math.PI * 72;
  const dash = pct * circumference * (350 / 402);

  return (
    <Shell>
      <Topbar subtitle="Credit Health" />
      <div className="no-scrollbar flex-1 overflow-y-auto p-4">
        <div className="rounded-lg2 border border-line bg-surface p-5 shadow-sm2">
          <div className="pb-3.5 pt-2 text-center">
            <svg width="170" height="170" viewBox="0 0 170 170" className="mx-auto">
              <circle cx="85" cy="85" r="72" fill="none" stroke="#E2E8F0" strokeWidth="13" />
              <circle
                cx="85"
                cy="85"
                r="72"
                fill="none"
                stroke="url(#sg)"
                strokeWidth="13"
                strokeDasharray={`${dash} ${circumference}`}
                strokeLinecap="round"
                transform="rotate(135 85 85)"
              />
              <defs>
                <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1A7A3A" />
                  <stop offset="100%" stopColor="#2DAA55" />
                </linearGradient>
              </defs>
              <text x="85" y="78" textAnchor="middle" fontSize="46" fontWeight="800" fill="#1A7A3A" fontFamily="DM Sans, sans-serif">
                {score || '—'}
              </text>
              <text x="85" y="100" textAnchor="middle" fontSize="14" fontWeight="700" fill="#64748B" fontFamily="DM Sans, sans-serif">
                {creditScore?.band ?? ''}
              </text>
              <text x="85" y="118" textAnchor="middle" fontSize="11" fill="#94A3B8" fontFamily="DM Sans, sans-serif">
                out of 850
              </text>
            </svg>
            <div className="mt-1 text-[11px] text-muted">Updated today · Free monthly refresh</div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Factor label="Payment History" value={`${creditScore?.factors?.paymentHistory?.pct ?? '—'}%`} grade={creditScore?.factors?.paymentHistory?.grade} valueColor="text-good" />
            <Factor label="Credit Usage" value={`${creditScore?.factors?.usage?.pct ?? '—'}%`} grade={creditScore?.factors?.usage?.grade} valueColor="text-blue" />
            <Factor label="Credit Age" value={`${creditScore?.factors?.creditAgeYears ?? '—'} yrs`} grade="Good" valueColor="text-navy" />
            <Factor label="Hard Inquiries" value={creditScore?.factors?.hardInquiries ?? '—'} grade="Good" valueColor="text-navy" />
          </div>
        </div>

        <div className="mt-3 rounded-lg2 border border-[#FFD4B5] bg-brand-light p-4">
          <div className="text-[13px] font-extrabold text-[#8C2E00]">💡 Score Simulator</div>
          <div className="my-1.5 text-xs leading-relaxed text-[#A83800]">
            What if you paid off your Visa Signature balance?
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-[#6B2200]">Projected score:</span>
            <span className="text-[22px] font-extrabold text-good">
              {sim?.projectedScore ?? '—'}{' '}
              <span className="text-sm text-[#15803D]">{sim ? `(+${sim.delta})` : ''}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between px-0 py-4">
          <span className="text-[15px] font-bold text-ink">Personalized Offers</span>
        </div>
        <div className="flex flex-col gap-2">
          {[
            { title: 'Auto Loan Pre-Approval', sub: 'Rate as low as 5.9% APR · Quick decision' },
            { title: 'Personal Loan up to $25,000', sub: 'Apply online in minutes' },
            { title: 'Mortgage Pre-Qualification', sub: 'See how much home you qualify for' },
          ].map((o) => (
            <div key={o.title} className="flex cursor-pointer items-center justify-between rounded-md2 bg-blue-light px-[15px] py-3.5">
              <div>
                <div className="text-[13px] font-bold text-navy">{o.title}</div>
                <div className="mt-0.5 text-[11px] text-blue">{o.sub}</div>
              </div>
              <span className="text-xl text-blue">›</span>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </Shell>
  );
}

function Factor({ label, value, grade, valueColor }) {
  return (
    <div className="rounded-md2 bg-bg p-3.5 text-center">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-[3px] text-xl font-extrabold ${valueColor}`}>{value}</div>
      <div className="mt-px text-[11px] font-bold text-good">{grade}</div>
    </div>
  );
}
