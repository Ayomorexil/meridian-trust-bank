import { useAuthStore } from '../store/useAuthStore';
import Logo from './Logo';

export default function Topbar({ subtitle }) {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="relative flex flex-shrink-0 items-center justify-between bg-navy px-5 pb-[11px] pt-[13px] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-gradient-to-r after:from-brand after:via-brand-mid after:to-transparent">
      <div className="flex items-center gap-2.5">
        <Logo size={30} light />
        <div className="text-[14px] font-extrabold leading-none tracking-wide text-white">
          MERIDIAN <span className="text-brand-mid">TRUST</span>
          <small className="mt-[2px] block text-[10px] font-medium uppercase tracking-[1px] opacity-55">
            {subtitle || 'Federal Credit Union'}
          </small>
        </div>
      </div>
      <div className="flex h-[35px] w-[35px] flex-shrink-0 items-center justify-center rounded-full border-2 border-white/25 bg-brand text-[13px] font-extrabold text-white">
        {user?.avatarInitials || '••'}
      </div>
    </div>
  );
}
