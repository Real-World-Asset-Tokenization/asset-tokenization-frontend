import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ReceiptText } from "lucide-react";
import { gasAPI } from "../../lib/api";
import { CATEGORIES, CATEGORY_LABEL, CATEGORY_TEXT, STAGES, num, shortHash, shortAddress, cardClass, headRowClass, thClass } from "./format";

const selectClass = "rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500";

// The recorded transactions behind every number on this page, read from the chain: hash, contract method, block,
// gas used and the gas price that was actually paid.
export default function TransactionEvidence() {
  const [rows, setRows] = useState(null);
  const [stage, setStage] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await gasAPI.getTransactions({ stage: stage || undefined, category: category || undefined, limit: 300 });
      setRows(res.data.data);
    } catch (err) {
      setRows([]);
      setError(err.response?.data?.message || "Transactions could not be loaded.");
    }
  }, [stage, category]);
  useEffect(() => { load(); }, [load]);

  const sync = async () => {
    setSyncing(true);
    try { await gasAPI.sync(); } catch (err) { setError(err.response?.data?.message || "The chain could not be read."); }
    setSyncing(false);
    load();
  };

  return (
    <div className={cardClass}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><ReceiptText className="w-6 h-6 text-indigo-400" />Transaction evidence</h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Each row was decoded from a mined transaction on the current contracts. Gas used and the price paid come from its receipt, so any row can be checked on the chain.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Stage" value={stage} onChange={(e) => setStage(e.target.value)} className={selectClass}>
            <option value="">All stages</option>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select aria-label="Payer" value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
            <option value="">All payers</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </select>
          <button onClick={sync} disabled={syncing} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />Read the chain
          </button>
        </div>
      </div>

      {error && <p role="alert" className="mb-4 text-sm text-amber-300">{error}</p>}

      {rows === null ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs text-zinc-300">No transactions match. They appear here as soon as the platform contracts are used.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className={headRowClass}>
                <th className={thClass}>Transaction hash</th>
                <th className={thClass}>Contract.method</th>
                <th className={thClass}>Stage</th>
                <th className={thClass}>Payer</th>
                <th className={thClass}>Block</th>
                <th className={thClass}>Gas used</th>
                <th className={thClass}>Gas price (gwei)</th>
                <th className={thClass}>Fee (ETH)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {rows.map((r) => (
                <tr key={r.txHash} className="hover:bg-zinc-800/30">
                  <td className="py-3 px-4 text-zinc-300" title={r.txHash}>{shortHash(r.txHash)}</td>
                  <td className="py-3 px-4 text-zinc-200">{r.contract ? `${r.contract}.` : ""}{r.method}</td>
                  <td className="py-3 px-4 text-zinc-400 font-sans">{r.stage}</td>
                  <td className={`py-3 px-4 font-sans ${CATEGORY_TEXT[r.payerCategory]}`} title={r.payerAddress}>{CATEGORY_LABEL[r.payerCategory]} <span className="text-zinc-500 font-mono">{shortAddress(r.payerAddress)}</span></td>
                  <td className="py-3 px-4 text-zinc-400">{r.blockNumber}</td>
                  <td className="py-3 px-4 text-white font-bold">{num(r.gasUsed)}</td>
                  <td className="py-3 px-4 text-zinc-400">{Number(r.effectiveGasPriceGwei).toFixed(4)}</td>
                  <td className="py-3 px-4 text-zinc-400">{Number(r.totalFeeEth).toFixed(8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
