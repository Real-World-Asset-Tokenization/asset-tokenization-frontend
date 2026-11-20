import { Layers } from "lucide-react";
import { CATEGORIES, CATEGORY_LABEL, CATEGORY_TEXT, STAGES, num, cardClass, headRowClass, thClass } from "./format";

// Gas per business stage (tokenization, listing, purchase, resale, voting, escrow, payout), split by who paid,
// and per contract method. Every number is summed from transactions read from the chain.
export default function OperationBreakdown({ summary }) {
  const stages = summary.stages.filter((s) => STAGES.includes(s.stage));
  const methods = summary.methods.slice(0, 20);

  return (
    <>
      <div className={cardClass}>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-400" />
            Gas by operation
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Each stage of a property's life, with the gas paid by the platform, asset owners, investors and the relayer that submits signed votes.
          </p>
        </div>

        {summary.totalTransactions === 0 ? (
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs text-zinc-300">
            No transactions have been recorded on the current contracts yet. They appear here as soon as an asset is registered, tokenized or traded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className={headRowClass}>
                  <th className={thClass}>Stage</th>
                  <th className={thClass}>Transactions</th>
                  <th className={thClass}>Total gas</th>
                  <th className={thClass}>Avg gas / tx</th>
                  <th className={thClass}>Fees (ETH)</th>
                  {CATEGORIES.map((c) => <th key={c} className={thClass}>{CATEGORY_LABEL[c]} gas</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {stages.map((s) => (
                  <tr key={s.stage} className={s.count === 0 ? "opacity-40" : "hover:bg-zinc-800/30"}>
                    <td className="py-3 px-4 text-white font-sans font-semibold">{s.stage}</td>
                    <td className="py-3 px-4 text-zinc-300">{num(s.count)}</td>
                    <td className="py-3 px-4 text-white font-bold">{num(s.totalGas)}</td>
                    <td className="py-3 px-4 text-zinc-400">{num(s.avgGas)}</td>
                    <td className="py-3 px-4 text-zinc-400">{s.totalFeeEth.toFixed(6)}</td>
                    {CATEGORIES.map((c) => (
                      <td key={c} className={`py-3 px-4 ${s.byCategory[c] > 0 ? CATEGORY_TEXT[c] : "text-zinc-600"}`}>{num(s.byCategory[c])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-zinc-500 mt-3">
          A payment approval is counted in the stage it belongs to (marketplace approvals in Purchase, escrow approvals in Escrow). A purchase from anyone other than the property's owner is a Resale.
        </p>
      </div>

      {methods.length > 0 && (
        <div className={cardClass}>
          <h2 className="text-lg font-bold text-white mb-4">Gas by contract method</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className={headRowClass}>
                  <th className={thClass}>Contract.method</th>
                  <th className={thClass}>Stage</th>
                  <th className={thClass}>Calls</th>
                  <th className={thClass}>Avg gas</th>
                  <th className={thClass}>Total gas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {methods.map((m) => (
                  <tr key={`${m.contract}.${m.method}`} className="hover:bg-zinc-800/30">
                    <td className="py-3 px-4 text-zinc-200">{m.contract}.{m.method}</td>
                    <td className="py-3 px-4 text-zinc-400 font-sans">{m.stage}</td>
                    <td className="py-3 px-4 text-zinc-300">{num(m.count)}</td>
                    <td className="py-3 px-4 text-zinc-400">{num(m.avgGas)}</td>
                    <td className="py-3 px-4 text-white font-bold">{num(m.totalGas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
