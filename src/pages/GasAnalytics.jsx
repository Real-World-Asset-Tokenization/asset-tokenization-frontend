import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import {
  Flame,
  BarChart3,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  Users,
  Zap,
  Activity,
  Layers
} from "lucide-react";

export default function GasAnalytics() {
  const [summary, setSummary] = useState(null);
  const [benchmark, setBenchmark] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGasData();
  }, []);

  const fetchGasData = async () => {
    try {
      setLoading(true);
      const [sumRes, benchRes] = await Promise.all([
        fetch("http://localhost:5001/api/gas/summary"),
        fetch("http://localhost:5001/api/gas/benchmark")
      ]);
      const sumData = await sumRes.json();
      const benchData = await benchRes.json();

      if (sumData.success) setSummary(sumData.data);
      if (benchData.success) setBenchmark(benchData.data);
    } catch (err) {
      console.error("Gas data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Flame className="w-8 h-8 text-amber-500" />
            Gas Fee Monitoring & Optimization Research
          </h1>
          <p className="text-zinc-400 mt-1 text-sm sm:text-base">
            Empirical gas consumption analysis, network fee tracking, and scalability evaluation comparing Merkle settlements with baseline distribution methods.
          </p>
        </div>

        {/* Live Metrics Summary */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between text-zinc-400 mb-2 text-xs font-semibold uppercase tracking-wider">
                <span>Total Gas Consumed</span>
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-white">
                {summary.totalGasConsumed.toLocaleString()} <span className="text-xs text-zinc-400 font-normal">Gas</span>
              </div>
              <div className="text-xs text-zinc-500 mt-2">
                Across {summary.totalTransactions} recorded transactions
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between text-zinc-400 mb-2 text-xs font-semibold uppercase tracking-wider">
                <span>Total Network Fees</span>
                <TrendingDown className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400">
                {summary.totalFeeEth.toFixed(6)} <span className="text-xs text-zinc-400 font-normal">ETH</span>
              </div>
              <div className="text-xs text-zinc-500 mt-2">
                Actual L1 / L2 network execution cost
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between text-zinc-400 mb-2 text-xs font-semibold uppercase tracking-wider">
                <span>Platform Gas Burden</span>
                <ShieldCheck className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black text-blue-400">
                {summary.platformBurden.percentage}
              </div>
              <div className="text-xs text-zinc-500 mt-2">
                {summary.platformBurden.totalGas.toLocaleString()} gas paid by protocol
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between text-zinc-400 mb-2 text-xs font-semibold uppercase tracking-wider">
                <span>Investor Gas Share</span>
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-purple-400">
                {summary.investorBurden.percentage}
              </div>
              <div className="text-xs text-zinc-500 mt-2">
                Pull-based claims decentralized to claimants
              </div>
            </div>
          </div>
        )}

        {/* Research Benchmark Evaluation (RQ2 & RQ3) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl mb-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-400" />
              Comparative Scalability Benchmark: Baseline vs Proposed Framework
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Empirical comparative measurement across investor cohorts (N = 10, 100, 500, 1,000) under identical EVM Cancun conditions.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Cohort (N)</th>
                  <th className="py-3 px-4">Proposed Platform Setup Gas</th>
                  <th className="py-3 px-4">Proposed Claim Gas / Investor</th>
                  <th className="py-3 px-4">Proposed Total Network Gas</th>
                  <th className="py-3 px-4">Baseline Push Network Gas</th>
                  <th className="py-3 px-4">Platform Gas Savings</th>
                  <th className="py-3 px-4">Scalability Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {benchmark.map((row) => (
                  <tr key={row.investorCount} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-4 px-4 font-mono font-bold text-white text-base">
                      {row.investorCount.toLocaleString()} <span className="text-xs font-normal text-zinc-400">investors</span>
                    </td>
                    <td className="py-4 px-4 font-mono text-blue-400 font-semibold">
                      {row.proposedFramework.platformSetupGas.toLocaleString()} gas
                    </td>
                    <td className="py-4 px-4 font-mono text-zinc-300">
                      {row.proposedFramework.perInvestorClaimGas.toLocaleString()} gas
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-emerald-400">
                      {row.proposedFramework.totalNetworkGas.toLocaleString()} gas
                    </td>
                    <td className="py-4 px-4 font-mono text-zinc-400">
                      {row.baselinePushFramework.totalNetworkGas.toLocaleString()} gas
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {row.comparativeAnalysis.platformGasSavingsVsPushPercent}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-zinc-400 max-w-xs leading-relaxed">
                      {row.comparativeAnalysis.scalabilityVerdict}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Research Finding Summary */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs text-zinc-300 space-y-1.5">
              <strong className="text-white text-sm block mb-1">Finding 1: Platform Overhead O(1)</strong>
              Under the proposed Merkle framework, protocol distribution setup cost remains constant (~92,000 gas) regardless of whether 10 or 10,000 investors participate. In contrast, the baseline push method scales linearly O(N), demanding over 34.5M gas at 1,000 investors and exceeding block gas limits.
            </div>
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs text-zinc-300 space-y-1.5">
              <strong className="text-white text-sm block mb-1">Finding 2: Fair Gas Attribution</strong>
              Rather than forcing the platform treasury to subsidize inactive or micro-investor payouts, gas responsibility shifts naturally to individual claimants when they pull their dividends, achieving sustainable unit economics for tokenized real estate syndicates.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
