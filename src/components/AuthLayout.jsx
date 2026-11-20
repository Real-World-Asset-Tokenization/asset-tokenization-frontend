import { Link } from 'react-router-dom';
import { Hexagon, ShieldCheck, Repeat, Gift } from 'lucide-react';

const POINTS = [
  [ShieldCheck, 'Verified people and properties', 'Owners and investors pass identity checks, and every property is reviewed before it is tokenized.'],
  [Repeat, 'Trade like shares', 'Buy and sell fractions of real property. Every trade settles on the blockchain.'],
  [Gift, 'Your own wallet', 'Your tokens and payments stay in a wallet that only you control.'],
];

// Split layout for sign in and register: a calm brand panel beside the form.
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-bg min-h-screen text-white lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden px-14 py-12 border-r border-[#1b2440]">
        <div aria-hidden className="bg-grid absolute inset-0" />
        <Link to="/" className="relative inline-flex items-center gap-3 w-fit">
          <span className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_20px_-8px_rgba(31, 224, 111,0.8)]">
            <Hexagon className="w-5 h-5 text-white" />
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-bold tracking-tight">TerraToken</span>
            <span className="block text-xs text-[#98a2c3]">RWA Tokenization</span>
          </span>
        </Link>

        <div className="relative max-w-lg">
          <h2 className="text-[2.6rem] font-bold leading-[1.05] tracking-[-0.02em]">
            Own a share of <span className="bg-gradient-to-r from-indigo-300 to-cyan-300 bg-clip-text text-transparent">real property</span>.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[#98a2c3]">
            Property is split into tokens that anyone can hold, trade and earn from, with every step recorded on the blockchain.
          </p>
          <ul className="mt-10 space-y-6">
            {POINTS.map(([Icon, head, text]) => (
              <li key={head} className="flex gap-4">
                <span className="mt-0.5 w-9 h-9 shrink-0 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-indigo-300" />
                </span>
                <span>
                  <span className="block font-semibold">{head}</span>
                  <span className="block mt-0.5 text-sm leading-relaxed text-[#98a2c3]">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-[#6b7599]">University research prototype. Tokens use demo mUSD, not real money.</p>
      </aside>

      <main className="flex min-h-screen lg:min-h-0 items-center justify-center px-4 sm:px-8 py-10">
        <div className="rise w-full max-w-[26rem]">
          <Link to="/" className="lg:hidden mb-8 inline-flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center"><Hexagon className="w-5 h-5 text-white" /></span>
            <span className="text-lg font-bold tracking-tight">TerraToken</span>
          </Link>
          <h1 className="text-[1.75rem] font-bold tracking-[-0.02em]">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[15px] leading-relaxed text-[#98a2c3]">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <p className="mt-8 text-center text-sm text-[#98a2c3]">{footer}</p>}
        </div>
      </main>
    </div>
  );
}
