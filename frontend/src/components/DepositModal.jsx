import { useEffect, useRef, useState } from 'react';
import { bankService } from '../api/bank';
import { useBankStore } from '../store/useBankStore';

const STEPS = { AMOUNT: 'amount', FRONT: 'front', BACK: 'back', REVIEW: 'review', DONE: 'done' };

export default function DepositModal({ account, onClose }) {
  const { fetchAccounts, fetchRecentActivity, showToast } = useBankStore();
  const [step, setStep] = useState(STEPS.AMOUNT);
  const [amount, setAmount] = useState('');
  const [frontImg, setFrontImg] = useState(null);
  const [backImg, setBackImg] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const isCameraStep = step === STEPS.FRONT || step === STEPS.BACK;

  useEffect(() => {
    if (!isCameraStep) return;
    let cancelled = false;

    async function startCamera() {
      setCameraError('');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'Camera access was denied. Allow camera permission in your browser to capture a check, or skip with a placeholder image below.'
            : 'Could not access a camera on this device. You can skip with a placeholder image below.'
        );
      }
    }
    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [step]);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    if (step === STEPS.FRONT) {
      setFrontImg(dataUrl);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setStep(STEPS.BACK);
    } else {
      setBackImg(dataUrl);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setStep(STEPS.REVIEW);
    }
  };

  const skipWithPlaceholder = () => {
    // Placeholder is used only when no camera is available (e.g. desktop
    // browser without a webcam) so the flow can still be demoed end to end.
    const placeholder =
      'data:image/svg+xml;base64,' +
      btoa('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="140"><rect width="300" height="140" fill="#E6EEF8"/><text x="150" y="75" font-size="14" text-anchor="middle" fill="#64748B">No camera — placeholder</text></svg>');
    if (step === STEPS.FRONT) {
      setFrontImg(placeholder);
      setStep(STEPS.BACK);
    } else {
      setBackImg(placeholder);
      setStep(STEPS.REVIEW);
    }
  };

  const handleAmountNext = (e) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('Enter a valid check amount.');
      return;
    }
    setStep(STEPS.FRONT);
  };

  const submitDeposit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await bankService.mobileDeposit(account.id, {
        amount: parseFloat(amount),
        frontCaptured: !!frontImg,
        backCaptured: !!backImg,
      });
      await fetchAccounts();
      await fetchRecentActivity();
      showToast(`✓  $${parseFloat(amount).toFixed(2)} check deposited!`);
      setStep(STEPS.DONE);
    } catch (err) {
      setError(err.message || 'Deposit failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-black/40 backdrop-blur-sm">
      <div className="mt-auto flex max-h-[92%] flex-col rounded-t-[24px] bg-surface shadow-lg2">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <span className="text-base font-extrabold text-ink">Mobile Check Deposit</span>
          <button onClick={onClose} className="text-xl text-muted">
            ×
          </button>
        </div>

        <div className="no-scrollbar overflow-y-auto p-5">
          {step === STEPS.AMOUNT && (
            <form onSubmit={handleAmountNext} className="space-y-4">
              <p className="text-sm text-muted">Depositing into {account.nickname}.</p>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">
                  Check Amount
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-[15px] top-1/2 -translate-y-1/2 text-xl font-extrabold text-navy">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="input pl-8 text-2xl font-extrabold text-navy"
                    autoFocus
                  />
                </div>
              </div>
              {error && <div className="rounded-md2 bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-danger">{error}</div>}
              <button type="submit" className="w-full rounded-md2 bg-gradient-to-br from-navy to-blue py-3.5 text-sm font-extrabold text-white">
                Continue to Camera →
              </button>
            </form>
          )}

          {isCameraStep && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-ink">
                {step === STEPS.FRONT ? 'Capture the front of the check' : 'Now capture the back (sign it first)'}
              </p>
              <div className="overflow-hidden rounded-md2 bg-ink">
                {!cameraError ? (
                  <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center p-4 text-center text-xs text-white/70">
                    {cameraError}
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-2">
                {!cameraError ? (
                  <button
                    onClick={capture}
                    className="flex-1 rounded-md2 bg-gradient-to-br from-navy to-blue py-3 text-sm font-extrabold text-white"
                  >
                    📷 Capture
                  </button>
                ) : (
                  <button onClick={skipWithPlaceholder} className="flex-1 rounded-md2 bg-blue-light py-3 text-sm font-extrabold text-blue">
                    Continue without camera
                  </button>
                )}
              </div>
            </div>
          )}

          {step === STEPS.REVIEW && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-ink">Review your deposit</p>
              <div className="grid grid-cols-2 gap-2">
                <img src={frontImg} alt="Front of check" className="rounded-md2 border border-line" />
                <img src={backImg} alt="Back of check" className="rounded-md2 border border-line" />
              </div>
              <div className="rounded-md2 bg-bg p-3.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Amount</span>
                  <span className="font-extrabold text-navy">${parseFloat(amount).toFixed(2)}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted">Depositing to</span>
                  <span className="font-semibold text-ink">{account.nickname}</span>
                </div>
              </div>
              {error && <div className="rounded-md2 bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-danger">{error}</div>}
              <button
                onClick={submitDeposit}
                disabled={submitting}
                className="w-full rounded-md2 bg-gradient-to-br from-navy to-blue py-3.5 text-sm font-extrabold text-white disabled:opacity-60"
              >
                {submitting ? 'Depositing…' : 'Submit Deposit'}
              </button>
            </div>
          )}

          {step === STEPS.DONE && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-good-light text-3xl">✓</div>
              <div className="mt-3 text-lg font-extrabold text-ink">Deposit submitted</div>
              <p className="mt-1 text-sm text-muted">${parseFloat(amount).toFixed(2)} has been added to {account.nickname}.</p>
              <button onClick={onClose} className="mt-5 rounded-md2 bg-navy px-6 py-2.5 text-sm font-bold text-white">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
