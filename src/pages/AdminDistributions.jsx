import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useCurrency } from "../context/CurrencyContext";
import {
  ShieldCheck,
  PlusCircle,
  FileText,
  Coins,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
  ExternalLink
} from "lucide-react";

export default function AdminDistributions() {
  const { currency, formatMUSD } = useCurrency();
  const [rounds, setRounds] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [periodLabel, setPeriodLabel] = useState("2026-Q2 Rental Distribution");
  const [distributableAmount, setDistributableAmount] = useState(100000);
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [roundsRes, reportsRes] = await Promise.all([
        fetch("http://localhost:5001/api/distribution/rounds"),
        fetch("http://localhost:5001/api/profit/reports?assetId=1")
      ]);
      const roundsData = await roundsRes.json();
      const reportsData = await reportsRes.json();

      if (roundsData.success) setRounds(roundsData.data);
      if (reportsData.success) setReports(reportsData.data);
    } catch (err) {
      console.error("Fetch data error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteDistribution = async (e) => {
    e.preventDefault();
    try {
      setPublishing(true);
      setErrorMsg("");
      setPublishStatus("Calculating time-weighted holdings and generating Merkle tree...");

      const res = await fetch("http://localhost:5001/api/distribution/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: 1,
          periodLabel,
          periodStart: 1792300000,
          periodEnd: 1792400000,
          distributableAmount: Number(distributableAmount),
          totalShares: 1000,
          autoPublishOnChain: true
        })
      });

      const data = await res.json();
      if (data.success) {
        setPublishStatus("Round published, funded, and activated on-chain!");
        setShowPublishModal(false);
        fetchData();
      } else {
        setErrorMsg(data.message);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-indigo-500" />
              Distribution Administration
            </h1>
            <p className="text-zinc-400 mt-1 text-sm sm:text-base">
              Manage financial periods, authorize Merkle dividend settlements, and monitor investor claim throughput.
            </p>
          </div>

          <button
            onClick={() => setShowPublishModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Launch Distribution Round
          </button>
        </div>

        {/* Distribution Rounds Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Published Dividend Rounds</h2>

          {loading ? (
            <div className="py-10 text-center text-zinc-500">Loading distribution rounds...</div>
          ) : rounds.length === 0 ? (
            <div className="py-10 text-center text-zinc-500 text-sm">No distribution rounds initiated yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Round ID</th>
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Total Pool</th>
                    <th className="py-3 px-4">Merkle Root</th>
                    <th className="py-3 px-4">Eligible Holders</th>
                    <th className="py-3 px-4">On-Chain Tx</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {rounds.map((r) => (
                    <tr key={r.roundId} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-white">#{r.roundId}</td>
                      <td className="py-4 px-4 text-zinc-200">{r.periodLabel}</td>
                      <td className="py-4 px-4 font-bold text-emerald-400">
                        <div>{r.totalPayoutFormatted.toLocaleString()} mUSD</div>
                        {currency !== "USD" && (
                          <span className="text-[11px] text-zinc-400 font-mono font-normal">
                            ≈ {formatMUSD(r.totalPayoutFormatted)}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-zinc-400">
                        {r.merkleRoot.slice(0, 10)}...{r.merkleRoot.slice(-8)}
                      </td>
                      <td className="py-4 px-4 font-semibold text-blue-400">{r.eligibleHoldersCount}</td>
                      <td className="py-4 px-4 font-mono text-xs text-zinc-500">
                        {r.txHashPublish ? `${r.txHashPublish.slice(0, 8)}...` : "—"}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            r.status === "Active"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal */}
        {showPublishModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-2">Automate & Publish Round</h2>
              <p className="text-xs text-zinc-400 mb-6">
                Reconstructs blockchain event timelines, generates cryptographic leaves, funds the round, and publishes the Merkle root on-chain.
              </p>

              <form onSubmit={handleExecuteDistribution} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Period Label
                  </label>
                  <input
                    type="text"
                    value={periodLabel}
                    onChange={(e) => setPeriodLabel(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Distributable Amount (mUSD)
                  </label>
                  <input
                    type="number"
                    value={distributableAmount}
                    onChange={(e) => setDistributableAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none"
                    required
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                    {errorMsg}
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPublishModal(false)}
                    className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={publishing}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                  >
                    {publishing ? "Publishing On-Chain..." : "Publish & Fund"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
