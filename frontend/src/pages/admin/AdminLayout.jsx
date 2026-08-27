import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

const LINKS = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/transfers', label: 'Transfers', icon: '⇅' },
  { to: '/admin/customers', label: 'Customers', icon: '👥' },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: '🗂️' },
];

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-line bg-navy text-white">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="text-lg font-extrabold">
            MERIDIAN <span className="text-brand-mid">TRUST</span>
          </div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[1.5px] text-white/50">
            Admin Console
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md2 px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                  isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span>{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="text-sm font-bold">{user?.fullName}</div>
          <div className="text-[11px] capitalize text-white/50">{user?.role}</div>
          <button
            onClick={() => {
              logout();
              navigate('/admin/login');
            }}
            className="mt-3 w-full rounded-md2 bg-white/10 py-2 text-xs font-bold hover:bg-white/20"
          >
            Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
