import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Hexagon, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../lib/api';
import { Input } from '../components/Input';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      const { token, user } = response.data.data;

      login({
        userId: user.id || user._id, // Handle both id and _id
        name: user.name,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress || null,
        token,
      });

      // The wallet is saved on the account, so nothing is asked at login. The app shows the saved wallet and its
      // balance straight away, and MetaMask is only opened when a transaction needs the wallet to sign.

      // Redirect based on role
      if (user.role === 'investor') {
        navigate('/dashboard/investor');
      } else if (user.role === 'asset_owner') {
        navigate('/dashboard/asset-owner');
      } else if (user.role === 'compliance_officer') {
        navigate('/dashboard/compliance-officer');
      } else {
        navigate('/admin');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg min-h-screen flex flex-col items-center justify-center px-4 py-10 text-white">
      <Link to="/" className="mb-8 inline-flex items-center gap-3" aria-label="TerraToken home">
        <span className="w-10 h-10 rounded-xl bg-[#1fe06f] flex items-center justify-center"><Hexagon className="w-5 h-5 text-[#04130a]" /></span>
        <span className="text-xl font-bold tracking-tight">TerraToken</span>
      </Link>

      <main className="rise w-full max-w-sm rounded-3xl border border-white/10 bg-[#232427] p-7 sm:p-8 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]">
        <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-[#a1a1aa]">Welcome back. Enter your details to continue.</p>

        {error && (
          <div role="alert" className="mt-5 flex gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Your password"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#1fe06f] hover:bg-[#4aeb8a] py-3 font-bold text-[#04130a] disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </main>

      <p className="mt-6 text-sm text-[#a1a1aa]">
        New here? <Link to="/register" className="font-semibold text-[#1fe06f] hover:underline">Create an account</Link>
      </p>
    </div>
  );
}
