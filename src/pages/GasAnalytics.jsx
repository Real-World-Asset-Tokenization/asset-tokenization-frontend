import { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import { gasAPI } from "../lib/api";
import { Flame, TrendingDown, ShieldCheck, Users, Layers, Radio } from "lucide-react";
import OperationBreakdown from "../components/gas/OperationBreakdown";
import MerkleComparison from "../components/gas/MerkleComparison";
import OptimizationResults from "../components/gas/OptimizationResults";
import ScenarioBenchmark from "../components/gas/ScenarioBenchmark";
import TransactionEvidence from "../components/gas/TransactionEvidence";

const TABS = [
  ["overview", "Operations"],
  ["merkle", "Merkle comparison"],
  ["optimizations", "Optimizations"],
  ["scenario", "End-to-end scenario"],
  ["transactions", "Transactions"],
];

export default function GasAnalytics() {
  const [tab, setTab] = useState("overview");
  const [summary, setSummary] = useState(null);
  const [benchmark, setBenchmark] = useState([]);
  const [benchmarkMeta, setBenchmarkMeta] = useState({ measured: false, generatedAt: null, blockGasLimit: null });
  const [optimizations, setOptimizations] = useState({ measured: false, listing: null, voting: [], minting: [] });
  const [scenario, setScenario] = useState({ measured: false, cohorts: [] });
  const [error, setError] = useState("");

  const fetchGasData = useCallback(async () => {
    try {
      setError("");
      const [sumRes, benchRes, optRes, scenarioRes] = await Promise.all([
        gasAPI.getSummary(),
        gasAPI.getBenchmark(),
        gasAPI.getOptimizations(),
        gasAPI.getScenario()
      ]);
      if (sumRes.data.success) setSummary(sumRes.data.data);
      if (benchRes.data.success) {
        setBenchmark(benchRes.data.data);
        setBenchmarkMeta({ measured: benchRes.data.measured, generatedAt: benchRes.data.generatedAt, blockGasLimit: benchRes.data.blockGasLimit });
      }
      if (optRes.data.success) setOptimizations(optRes.data);
      if (scenarioRes.data.success) setScenario(scenarioRes.data);
    } catch (err) {
      console.error("Gas data fetch error:", err);
      setError(err.response?.data?.message || "Gas data could not be loaded.");
    }
  }, []);

  useEffect(() => { fetchGasData(); }, [fetchGasData]);

  const tile = "bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg";
  const tileHead = "flex items-center justify-between text-zinc-400 mb-2 text-xs font-semibold uppercase tracking-wider";

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
            What each operation costs, who pays for it, and how the optimized approaches compare with the baselines. Every figure is read from mined transactions or measured with real contract calls.
          </p>
        </div>

        {error && <p role="alert" className="mb-6 text-sm text-amber-300">{error}</p>}

        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-8">
            <div className={tile}>
              <div className={tileHead}><span>Total gas</span><Flame className="w-4 h-4 text-amber-400" /></div>
              <div className="text-2xl font-black text-white">{summary.totalGasConsumed.toLocaleString()}</div>
              <div className="text-xs text-zinc-500 mt-2">{summary.totalTransactions} recorded transactions</div>
            </div>
            <div className={tile}>
              <div className={tileHead}><span>Network fees</span><TrendingDown className="w-4 h-4 text-emerald-400" /></div>
              <div className="text-2xl font-black text-emerald-400">{summary.totalFeeEth.toFixed(6)} <span className="text-xs text-zinc-400 font-normal">ETH</span></div>
              <div className="text-xs text-zinc-500 mt-2">Gas used × price actually paid</div>
            </div>
            <div className={tile}>
              <div className={tileHead}><span>Platform</span><ShieldCheck className="w-4 h-4 text-blue-400" /></div>
              <div className="text-2xl font-black text-blue-400">{summary.platformBurden.percentage}</div>
              <div className="text-xs text-zinc-500 mt-2">{summary.platformBurden.totalGas.toLocaleString()} gas · {summary.platformBurden.count} tx</div>
            </div>
            <div className={tile}>
              <div className={tileHead}><span>Asset owners</span><Layers className="w-4 h-4 text-amber-400" /></div>
              <div className="text-2xl font-black text-amber-400">{summary.assetOwnerBurden.percentage}</div>
              <div className="text-xs text-zinc-500 mt-2">{summary.assetOwnerBurden.totalGas.toLocaleString()} gas · {summary.assetOwnerBurden.count} tx</div>
            </div>
            <div className={tile}>
              <div className={tileHead}><span>Investors</span><Users className="w-4 h-4 text-purple-400" /></div>
              <div className="text-2xl font-black text-purple-400">{summary.investorBurden.percentage}</div>
              <div className="text-xs text-zinc-500 mt-2">{summary.investorBurden.totalGas.toLocaleString()} gas · {summary.investorBurden.count} tx</div>
            </div>
            <div className={tile}>
              <div className={tileHead}><span>Relayer</span><Radio className="w-4 h-4 text-cyan-400" /></div>
              <div className="text-2xl font-black text-cyan-400">{summary.relayerBurden.percentage}</div>
              <div className="text-xs text-zinc-500 mt-2">{summary.relayerBurden.totalGas.toLocaleString()} gas · {summary.relayerBurden.count} tx</div>
            </div>
          </div>
        )}

        <div role="tablist" aria-label="Gas analytics sections" className="flex flex-wrap gap-1 rounded-xl bg-zinc-900 border border-zinc-800 p-1 mb-8">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === id ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && summary && <OperationBreakdown summary={summary} />}
        {tab === "merkle" && <MerkleComparison benchmark={benchmark} meta={benchmarkMeta} />}
        {tab === "optimizations" && <OptimizationResults optimizations={optimizations} />}
        {tab === "scenario" && <ScenarioBenchmark scenario={scenario} />}
        {tab === "transactions" && <TransactionEvidence />}
      </main>
    </div>
  );
}
