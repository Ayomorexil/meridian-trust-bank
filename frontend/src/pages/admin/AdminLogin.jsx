import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { bankService } from '../../api/bank';
import { useAuthStore } from '../../store/useAuthStore';

export default function AdminLogin() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('admin@meridiantrust.demo');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await bankService.login(email, password);
      if (!['support', 'manager', 'admin', 'superadmin'].includes(res.data.user.role)) {
        setError('This account does not have staff access.');
        setLoading(false);
        return;
      }
      setSession(res.token, res.data.user);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm rounded-lg2 border border-line bg-surface p-8 shadow-lg2">
        <div className="mb-6 text-center">
          <div className="text-xl font-extrabold text-navy">
            MERIDIAN <span className="text-brand">TRUST</span>
          </div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-muted">
            Staff Administration Console
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">Staff Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md2 border-[1.5px] border-line px-3.5 py-3 text-[15px] font-semibold text-ink focus:border-blue focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin!2345 (demo)"
              className="w-full rounded-md2 border-[1.5px] border-line px-3.5 py-3 text-[15px] font-semibold text-ink focus:border-blue focus:outline-none"
              required
            />
          </div>
          {error && <div className="rounded-md2 bg-[#FEE2E2] px-3 py-2 text-[12px] font-semibold text-danger">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md2 bg-gradient-to-br from-navy to-blue py-3.5 text-[15px] font-extrabold text-white shadow-md2 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign In to Console'}
          </button>
        </form>
        <div className="mt-5 text-center text-[11px] text-muted">
          Demo staff logins: admin@meridiantrust.demo / Admin!2345
          <br />
          superadmin@meridiantrust.demo / SuperAdmin!2345
        </div>
        <div className="mt-3 text-center">
          <Link to="/login" className="text-[11px] font-semibold text-blue-mid">
            ← Back to member sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
