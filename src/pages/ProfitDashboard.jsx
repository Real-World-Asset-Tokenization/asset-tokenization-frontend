import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useCurrency } from "../context/CurrencyContext";
import {
  TrendingUp,
  BarChart3,
  Calendar,
  DollarSign,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileText
} from "lucide-react";

export default function ProfitDashboard() {
  const { currency, formatMUSD } = useCurrency();
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);

  // Calculation parameters
  const [assetId, setAssetId] = useState(1);
  const [distributableAmount, setDistributableAmount] = useState(100000);
  const [calculating, setCalculating] = useState(false);
  const [calcResult, setCalcResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchReports();
    runCalculation();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5001/api/profit/reports?assetId=1");
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setReports(data.data);
        setSelectedReport(data.data[0]);
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const runCalculation = async () => {
    try {
      setCalculating(true);
      setErrorMsg("");

      const res = await fetch("http://localhost:5001/api/profit/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: 1,
          periodStart: 1792300000,
          periodEnd: 1792400000,
          distributableAmount: Number(distributableAmount),
          totalShares: 1000
        })
      });

      const data = await res.json();
      if (data.success) {
        setCalcResult(data.data);
      } else {
        setErrorMsg(data.message);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-500" />
            Time-Weighted Profit & Dividend Engine
          </h1>
          <p className="text-zinc-400 mt-1 text-sm sm:text-base">
            Holding-duration-based profit allocation accounting with empirical variance comparison against traditional snapshot distributions.
          </p>
        </div>

        {/* Research Context Callout */}
        <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/20 border border-blue-800/40 rounded-2xl p-6 mb-8 text-sm">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-white text-base">Research Principle: Holding Duration Entitlement</h3>
              <p className="text-zinc-300 leading-relaxed">
                Traditional snapshot-based distribution allocates profits based solely on wallet balances at period-end, completely ignoring secondary trading activity.
                The proposed framework computes the continuous integral of token holdings across time:
              </p>
              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3 font-mono text-xs text-blue-300 mt-2">
                Investor Payout = [ ∑ (Token Balance × Holding Duration Seconds) / Total Eligible Token-Seconds ] × Approved Distributable Profit
              </div>
            </div>
          </div>
        </div>

        {/* Calculation Control Form */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl mb-8">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Simulate Financial Period Allocation
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Asset
              </label>
              <select
                value={assetId}
                onChange={(e) => setAssetId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none"
              >
                <option value={1}>Asset #1: Colombo Oceanfront Residence (1,000 Total Shares)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Approved Distributable Profit (mUSD)
              </label>
              <input
                type="number"
                value={distributableAmount}
                onChange={(e) => setDistributableAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <button
                onClick={runCalculation}
                disabled={calculating}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {calculating ? "Recomputing Intervals..." : "Recompute Time-Weighted Allocations"}
              </button>
            </div>
          </div>
        </div>

        {/* Allocations Comparison Table */}
        {calcResult && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Comparative Allocation Breakdown</h2>
                <p className="text-xs text-zinc-400">
                  Total Eligible Token-Seconds: {calcResult.totalEligibleTokenSeconds.toLocaleString()} | Distributable: {calcResult.distributableAmount.toLocaleString()} mUSD
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Investor Wallet</th>
                    <th className="py-3 px-4">Holding Token-Seconds</th>
                    <th className="py-3 px-4">Weight Share</th>
                    <th className="py-3 px-4">Proposed Time-Weighted Payout</th>
                    <th className="py-3 px-4">Baseline Snapshot Payout</th>
                    <th className="py-3 px-4">Research Variance (Delta)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {calcResult.allocations.map((a, idx) => {
                    const isPositiveVariance = a.varianceFormatted > 0;
                    const isZero = a.varianceFormatted === 0;

                    return (
                      <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-4 px-4 font-mono text-zinc-300">
                          {a.walletAddress}
                        </td>
                        <td className="py-4 px-4 font-mono font-semibold text-white">
                          {Math.round(a.tokenSeconds).toLocaleString()} s
                        </td>
                        <td className="py-4 px-4 font-semibold text-blue-400">
                          {(a.weightFraction * 100).toFixed(2)}%
                        </td>
                        <td className="py-4 px-4 font-bold text-emerald-400 text-base">
                          <div>{a.timeWeightedPayoutFormatted.toLocaleString(undefined, { minimumFractionDigits: 2 })} mUSD</div>
                          {currency !== "USD" && (
                            <span className="text-[11px] text-zinc-400 font-mono font-normal">
                              ≈ {formatMUSD(a.timeWeightedPayoutFormatted)}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-zinc-400 font-mono">
                          <div>{a.snapshotPayoutFormatted.toLocaleString(undefined, { minimumFractionDigits: 2 })} mUSD</div>
                          {currency !== "USD" && (
                            <span className="text-[11px] text-zinc-500 font-normal">
                              ≈ {formatMUSD(a.snapshotPayoutFormatted)}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold font-mono ${
                              isZero
                                ? "bg-zinc-800 text-zinc-400"
                                : isPositiveVariance
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {isPositiveVariance ? "+" : ""}
                            {a.varianceFormatted.toLocaleString(undefined, { minimumFractionDigits: 2 })} mUSD
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Explanation Note */}
            <div className="mt-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400">
              <strong className="text-zinc-200">Evaluation Insight:</strong> The research variance shows the exact financial misallocation that occurs under a traditional snapshot policy. Senders who held tokens for the majority of the period are correctly credited for their holding duration under the proposed framework, preventing free-rider arbitrage by late buyers.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
