import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', icon: '🏠', label: 'Home', end: true },
  { to: '/accounts', icon: '💳', label: 'Accounts' },
  { to: '/transfer', icon: '⇅', label: 'Transfer' },
  { to: '/credit', icon: '📊', label: 'Credit' },
  { to: '/more', icon: '☰', label: 'More' },
];

export default function BottomNav() {
  return (
    <nav className="flex flex-shrink-0 border-t border-line bg-surface px-1 pb-[14px] pt-2 shadow-[0_-4px_20px_rgba(0,43,114,0.08)]">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className="flex flex-1 flex-col items-center gap-[3px] px-0.5 py-[5px] active:scale-95"
        >
          {({ isActive }) => (
            <>
              <div className={`mx-auto -mt-px h-1 w-1 rounded-full bg-brand ${isActive ? 'opacity-100' : 'opacity-0'}`} />
              <div className="text-[22px] leading-none">{tab.icon}</div>
              <div className={`text-[10px] font-semibold ${isActive ? 'text-navy' : 'text-muted'}`}>{tab.label}</div>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
