import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import Navbar from "../components/Navbar";
import {
  ShoppingBag,
  TrendingUp,
  PieChart,
  Gift,
  ShieldCheck,
  Flame,
  ArrowRight,
  Sparkles,
  Layers,
  Activity,
  User,
  Building,
  CheckCircle2
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { roleConfigs } = useRole();

  const handleLaunchRole = (roleKey, targetRoute) => {
    navigate(targetRoute);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 flex flex-col items-center text-center">
        {/* Research Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          University Research Prototype & Evaluation Framework
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl leading-tight sm:leading-none">
          A Gas-Efficient, Time-Weighted Profit Distribution & Trading Framework for <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">Tokenized Real-World Assets</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl leading-relaxed">
          Solving mid-period token trading profit misallocation through time-weighted ownership integrals, combined with O(1) constant-gas Merkle-settled claims on Ethereum EVM.
        </p>

        {/* 3-User Role Separation Gateways */}
        <div className="mt-12 w-full">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Role-Isolated Participant Portals
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
            Select Your User Role View
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl mx-auto mb-8">
            The platform is cleanly separated into 3 participant views. Each view strictly displays only the actions and tools permitted for that specific role.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* 1. Investor View */}
            <div className="bg-zinc-900 border border-blue-500/30 hover:border-blue-500 rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <User className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Role 1
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-1.5">Investor Portal</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Purchase fractional property shares, monitor your real estate portfolio, simulate time-weighted returns, and claim Merkle dividends atomically.
                </p>

                <div className="space-y-1.5 text-xs text-zinc-300 mb-6 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>Secondary Marketplace (Buy / Sell)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>Time-Weighted Yield Calculator</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>O(1) Merkle Tree Payout Claims</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleLaunchRole("investor", "/marketplace")}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Launch Investor View <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* 2. Asset Owner View */}
            <div className="bg-zinc-900 border border-emerald-500/30 hover:border-emerald-500 rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Building className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Role 2
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-1.5">Asset Owner Portal</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Onboard deeds & survey plans, run automated AI OCR authenticity checks, fractionalize into ERC-1155 tokens, and list on the marketplace.
                </p>

                <div className="space-y-1.5 text-xs text-zinc-300 mb-6 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>AI Deed OCR & Authenticity Verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>On-Chain ERC-1155 Tokenization</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Direct Secondary Market Listings</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleLaunchRole("asset_owner", "/dashboard/asset-owner")}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Launch Asset Owner View <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* 3. Admin / Operator View */}
            <div className="bg-zinc-900 border border-purple-500/30 hover:border-purple-500 rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Role 3
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-1.5">Admin & Operator Portal</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Administer monthly snapshot cycles, compute time-weighted ownership integrals, publish on-chain Merkle roots, and monitor gas savings.
                </p>

                <div className="space-y-1.5 text-xs text-zinc-300 mb-6 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Merkle Distribution Snapshot Rounds</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>User & Asset Legal KYC Review</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Gas Tracking & Empirical Benchmarks</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleLaunchRole("admin", "/admin/distributions")}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Launch Admin View <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          {/* Card 1 */}
          <Link
            to="/marketplace"
            className="group bg-zinc-900/80 border border-zinc-800 hover:border-blue-500/50 rounded-2xl p-6 transition-all shadow-xl hover:shadow-blue-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">1. Secure Token Marketplace</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Non-custodial peer-to-peer trading of ERC-1155 real estate fractions settled atomically with ERC-20 payment tokens and configurable 1% platform fee.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-blue-400 font-semibold mt-4 group-hover:translate-x-1 transition-transform">
              Launch Marketplace <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Card 2 */}
          <Link
            to="/profit-dashboard"
            className="group bg-zinc-900/80 border border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-6 transition-all shadow-xl hover:shadow-emerald-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">2. Time-Weighted Accounting</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Reconstructs transfer timelines into token-seconds to eliminate month-end snapshot arbitrage, allocating yield strictly proportional to holding duration.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold mt-4 group-hover:translate-x-1 transition-transform">
              View Allocation Engine <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Card 3 */}
          <Link
            to="/gas-analytics"
            className="group bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/50 rounded-2xl p-6 transition-all shadow-xl hover:shadow-amber-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">3. Gas Optimization & Merkle Proofs</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Replaces O(N) linear platform payouts with O(1) Merkle root settlement. Empirical benchmarks prove massive protocol gas reductions across 1,000 investors.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-amber-400 font-semibold mt-4 group-hover:translate-x-1 transition-transform">
              Inspect Benchmarks <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>

        {/* Module Nav Links */}
        <div className="mt-12 flex flex-wrap gap-4 justify-center text-xs text-zinc-500">
          <Link to="/portfolio" className="hover:text-zinc-300">Investor Portfolio</Link>
          <span>•</span>
          <Link to="/claims" className="hover:text-zinc-300">Dividend Claims Center</Link>
          <span>•</span>
          <Link to="/admin/distributions" className="hover:text-zinc-300">Admin Round Automation</Link>
          <span>•</span>
          <Link to="/login" className="hover:text-zinc-300">KYC Portal Login</Link>
        </div>
      </main>
    </div>
  );
}
