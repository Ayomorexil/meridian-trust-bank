import { useEffect, useState } from 'react';
import { bankService } from '../api/bank';

export default function NotificationsModal({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    bankService
      .getNotifications()
      .then((res) => setNotifications(res.data.notifications))
      .catch((err) => setError(err.message || 'Could not load notifications.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const markRead = async (id) => {
    try {
      await bankService.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // non-critical — leave state as-is
    }
  };

  const markAllRead = async () => {
    try {
      await bankService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // non-critical
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-black/40 backdrop-blur-sm">
      <div className="mt-auto flex max-h-[85%] flex-col rounded-t-[24px] bg-surface shadow-lg2">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <span className="text-base font-extrabold text-ink">
            Notifications {unreadCount > 0 && <span className="ml-1 text-xs font-bold text-brand">({unreadCount} new)</span>}
          </span>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-bold text-blue-mid">
                Mark all read
              </button>
            )}
            <button onClick={onClose} className="text-xl text-muted">
              ×
            </button>
          </div>
        </div>

        <div className="no-scrollbar overflow-y-auto p-5">
          {loading && <div className="py-8 text-center text-sm text-muted">Loading…</div>}
          {error && <div className="rounded-md2 bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-danger">{error}</div>}
          {!loading && notifications.length === 0 && (
            <div className="py-8 text-center text-sm text-muted">You're all caught up.</div>
          )}
          <div className="flex flex-col gap-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                className={`cursor-pointer rounded-md2 border p-3.5 transition-colors ${
                  n.read ? 'border-line' : 'border-blue-light bg-blue-light/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-bold text-ink">{n.title}</div>
                  {!n.read && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand" />}
                </div>
                <div className="mt-0.5 text-xs text-muted">{n.body}</div>
                <div className="mt-1 text-[10px] text-muted">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
