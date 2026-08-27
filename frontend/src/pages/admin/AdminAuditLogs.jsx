import { useEffect, useState } from 'react';
import AdminLayout from './AdminLayout';
import { bankService } from '../../api/bank';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    bankService
      .adminListAuditLogs()
      .then((res) => setLogs(res.data.logs))
      .catch((err) => setError(err.message || 'Could not load audit logs.'));
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-extrabold text-ink">Audit Logs</h1>
      <p className="mt-1 text-sm text-muted">Every administrative action that touched a member's money or status.</p>

      {error && <div className="mt-4 rounded-md2 bg-[#FEE2E2] px-4 py-3 text-sm font-semibold text-danger">{error}</div>}

      <div className="mt-6 overflow-hidden rounded-lg2 border border-line bg-surface shadow-sm2">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg text-xs font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Reason</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-line align-top">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{new Date(l.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="text-sm font-semibold text-ink">{l.admin_name}</div>
                  <div className="text-xs text-muted">{l.admin_email}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-blue-light px-2.5 py-1 text-xs font-bold text-blue">{l.action}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted">
                  {l.entity_type}:{String(l.entity_id).slice(0, 8)}…
                </td>
                <td className="px-4 py-3 text-xs text-ink">{l.reason || '—'}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">
                  No audit entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
