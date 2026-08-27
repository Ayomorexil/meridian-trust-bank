import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Shell from '../components/Shell';
import Logo from '../components/Logo';
import { bankService } from '../api/bank';

export default function Receipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    bankService
      .getReceipt(id)
      .then((res) => setReceipt(res.data.receipt))
      .catch((err) => setError(err.message || 'Could not load this receipt.'));
  }, [id]);

  return (
    <Shell>
      <div className="flex flex-shrink-0 items-center justify-between border-b border-line bg-surface px-5 py-3.5">
        <button onClick={() => navigate('/transfer')} className="text-sm font-bold text-blue-mid">
          ← Back
        </button>
        <span className="text-sm font-bold text-ink">Transfer Receipt</span>
        <button onClick={() => window.print()} className="text-sm font-bold text-blue-mid">
          Print
        </button>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto p-5">
        {error && <div className="rounded-md2 bg-[#FEE2E2] px-4 py-3 text-sm font-semibold text-danger">{error}</div>}

        {receipt && (
          <div className="rounded-lg2 border border-line bg-surface p-6 shadow-sm2">
            <div className="flex flex-col items-center border-b border-dashed border-line pb-5 text-center">
              <Logo size={44} />
              <div className="mt-2 text-base font-extrabold text-navy">
                MERIDIAN <span className="text-brand">TRUST</span>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Fictional demo institution — simulated transaction
              </div>
              <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-good-light text-2xl">
                ✓
              </div>
              <div className="mt-2 text-sm font-bold capitalize text-good">{receipt.status}</div>
              {receipt.isExternal && (
                <div className="mt-1.5 rounded-full bg-blue-light px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue">
                  External Transfer
                </div>
              )}
            </div>

            <div className="py-5 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Amount</div>
              <div className="mt-1 text-4xl font-extrabold tracking-tight text-navy">
                ${Number(receipt.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="space-y-3 border-t border-dashed border-line pt-5 text-sm">
              <Row label="Reference #" value={receipt.referenceNumber} mono />
              <Row label="Member" value={`${receipt.memberName} (${receipt.memberNumber})`} />
              <Row label="From" value={receipt.fromAccount} />
              <Row label="To" value={receipt.toAccount} />
              {receipt.memo && <Row label="Memo" value={receipt.memo} />}
              <Row label="Date Initiated" value={new Date(receipt.createdAt).toLocaleString()} />
              {receipt.processedAt && <Row label="Date Settled" value={new Date(receipt.processedAt).toLocaleString()} />}
              <Row
                label="Balance After"
                value={`$${Number(receipt.balanceAfter).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                bold
              />
            </div>

            <div className="mt-6 border-t border-dashed border-line pt-4 text-center text-[10px] leading-relaxed text-muted">
              This is a simulated receipt generated for demonstration purposes only. Meridian Trust Federal Credit
              Union is a fictional institution — no real funds were moved.
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Row({ label, value, mono, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={`text-right text-ink ${bold ? 'font-extrabold' : 'font-semibold'} ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}
