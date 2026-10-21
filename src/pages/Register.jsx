import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Hexagon, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../lib/api';
import { Input } from '../components/Input';

const ROLES = [
  ['investor', 'Investor', 'Buy, sell and earn from property tokens.'],
  ['asset_owner', 'Asset owner', 'List your property and tokenize it.'],
  ['compliance_officer', 'Compliance', 'Review identities and properties.'],
];

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'investor',
    walletAddress: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const trimmedWallet = formData.walletAddress ? formData.walletAddress.trim().toLowerCase() : '';
    if (trimmedWallet && !/^0x[a-f0-9]{40}$/i.test(trimmedWallet)) {
      setError('Please enter a valid 42-character Ethereum address (0x...) or leave it blank to link after login.');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        walletAddress: trimmedWallet || undefined,
      });

      const { token, user } = response.data.data;

      login({
        userId: user.id || user._id, // Handle both id and _id
        name: user.name,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress || null,
        token,
      });

      // Redirect based on role
      if (user.role === 'investor') {
        navigate('/dashboard/investor');
      } else if (user.role === 'asset_owner') {
        navigate('/dashboard/asset-owner');
      } else if (user.role === 'compliance_officer') {
        navigate('/dashboard/compliance-officer');
      } else {
        navigate('/dashboard/admin');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const role = ROLES.find(([v]) => v === formData.role);
  const needsKyc = formData.role !== 'compliance_officer';

  return (
    <div className="auth-bg min-h-screen flex flex-col items-center justify-center px-4 py-10 text-white">
      <Link to="/" className="mb-8 inline-flex items-center gap-3" aria-label="TerraToken home">
        <span className="w-10 h-10 rounded-xl bg-[#1fe06f] flex items-center justify-center"><Hexagon className="w-5 h-5 text-[#04130a]" /></span>
        <span className="text-xl font-bold tracking-tight">TerraToken</span>
      </Link>

      <main className="rise w-full max-w-md rounded-3xl border border-white/10 bg-[#232427] p-7 sm:p-8 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]">
        <h1 className="text-2xl font-bold tracking-tight">Create account</h1>
        <p className="mt-1 text-sm text-[#a1a1aa]">It takes a minute.</p>

        {error && (
          <div role="alert" className="mt-5 flex gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-[#d4d4d8]">I am joining as</legend>
            <div role="radiogroup" className="flex gap-1 rounded-2xl bg-[#1b1c1f] p-1">
              {ROLES.map(([value, label]) => {
                const on = formData.role === value;
                return (
                  <label key={value} className={`flex-1 cursor-pointer rounded-xl px-2 py-2.5 text-center text-sm font-semibold transition-colors ${on ? 'bg-[#1fe06f] text-[#04130a]' : 'text-[#a1a1aa] hover:text-white'}`}>
                    <input type="radio" name="role" value={value} checked={on} onChange={() => setFormData({ ...formData, role: value })} className="sr-only" />
                    {label}
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-[#a1a1aa]">{role[2]}</p>
          </fieldset>

          <Input label="Full name" type="text" autoComplete="name" value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Your full name" required />

          <Input label="Email" type="email" autoComplete="email" value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="you@example.com" required />

          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Password" type="password" autoComplete="new-password" value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Create a password" required />
            <Input label="Confirm password" type="password" autoComplete="new-password" value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="Repeat it" required />
          </div>

          <details className="group rounded-xl border border-white/10 bg-[#1b1c1f] px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-[#d4d4d8] list-none flex items-center justify-between">
              Add a wallet now <span className="text-xs font-normal text-[#8e8f98]">optional</span>
            </summary>
            <div className="mt-3">
              <Input type="text" aria-label="Ethereum wallet address" autoComplete="off" spellCheck={false} value={formData.walletAddress}
                onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })} placeholder="0x…"
                hint="Each wallet belongs to one account. You can also link it after you sign in." />
            </div>
          </details>

          {needsKyc && (
            <div className="rounded-xl border border-white/10 bg-[#1b1c1f] px-4 py-3 text-sm">
              <p className="font-semibold text-white">What happens next</p>
              <ol className="mt-1.5 space-y-1 text-[#a1a1aa] list-decimal pl-5">
                <li>Sign in to your new account.</li>
                <li>Verify your identity (KYC) with a National ID, passport or driving licence.</li>
                <li>{formData.role === 'asset_owner' ? 'Submit your property for approval.' : 'Start trading property tokens.'}</li>
              </ol>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#1fe06f] hover:bg-[#4aeb8a] py-3 font-bold text-[#04130a] disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </main>

      <p className="mt-6 text-sm text-[#a1a1aa]">
        Already have an account? <Link to="/login" className="font-semibold text-[#1fe06f] hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
