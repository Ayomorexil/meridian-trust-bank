import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bankService } from '../api/bank';
import { useAuthStore } from '../store/useAuthStore';
import Shell from '../components/Shell';
import Logo from '../components/Logo';

export default function Login() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res =
        mode === 'signin'
          ? await bankService.login(email, password)
          : await bankService.register({
              fullName,
              email,
              phone,
              password,
            });

      setSession(res.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <div className="flex flex-1 flex-col justify-center overflow-y-auto px-8 py-6">
        <div className="mb-7 flex flex-col items-center text-center">
          <Logo size={56} />

          <div className="mt-3 text-xl font-extrabold text-navy">
            MERIDIAN <span className="text-brand">TRUST</span>
          </div>

          <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-muted">
            Federal Credit Union
          </div>
        </div>

        <div className="mb-5 flex rounded-md2 border border-line bg-bg p-1">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 rounded-sm2 py-2 text-sm font-bold transition-colors ${
              mode === 'signin'
                ? 'bg-surface text-navy shadow-sm2'
                : 'text-muted'
            }`}
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 rounded-sm2 py-2 text-sm font-bold transition-colors ${
              mode === 'signup'
                ? 'bg-surface text-navy shadow-sm2'
                : 'text-muted'
            }`}
          >
            Create Account
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg2 border border-line bg-surface p-6 shadow-sm2"
        >
          {mode === 'signup' && (
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">
                Full Name
              </label>

              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input"
                required
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">
                Phone (optional)
              </label>

              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              minLength={mode === 'signup' ? 8 : undefined}
              required
            />

            {mode === 'signup' && (
              <div className="mt-1 text-[11px] text-muted">
                At least 8 characters.
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md2 bg-[#FEE2E2] px-3 py-2 text-[12px] font-semibold text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md2 bg-gradient-to-br from-navy to-blue py-3.5 text-[15px] font-extrabold text-white shadow-md2 disabled:opacity-60"
          >
            {loading
              ? 'Please wait…'
              : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
          </button>
        </form>
      </div>
    </Shell>
  );
}
