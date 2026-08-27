import { useBankStore } from '../store/useBankStore';

export default function Toast() {
  const toast = useBankStore((s) => s.toast);
  return (
    <div
      className={`pointer-events-none absolute bottom-[85px] left-1/2 z-[999] -translate-x-1/2 whitespace-nowrap rounded-2xl bg-good px-[22px] py-[13px] text-[13px] font-bold text-white shadow-lg2 transition-all duration-300 ${
        toast ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
      }`}
    >
      {toast}
    </div>
  );
}
