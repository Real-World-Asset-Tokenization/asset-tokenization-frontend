import { BarChart3, ShieldCheck, Network, AlertTriangle } from "lucide-react";
import { pct, num, savingsClass, cardClass, headRowClass, thClass } from "./format";

// Overhead is shown with its sign: "+155%" means the Merkle method used 155% MORE gas than the baseline.
const overhead = (value) => `${value > 0 ? "+" : ""}${pct(value)}`;
const overheadClass = (value) =>
  value > 0 ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

// Merkle vs push vs on-chain snapshot. Two numbers answer different questions and are always shown side by side:
// what the platform itself pays, and what the whole network pays (platform + investors).
export default function MerkleComparison({ benchmark, meta }) {
  const largest = benchmark.length ? benchmark[benchmark.length - 1] : null;

  return (
    <div className={cardClass}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-400" />
          Merkle payout vs push transfers vs on-chain snapshot
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          {meta.measured
            ? `Gas measured on a Hardhat node (EVM Cancun) with real contract calls. Measured ${new Date(meta.generatedAt).toLocaleString()}.`
            : "No benchmark has been measured yet."}
        </p>
      </div>

      {!meta.measured && (
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs text-zinc-300">
          Run <span className="font-mono text-white">npx hardhat run scripts/measureGasBenchmark.js</span> in the blockchain folder, then refresh this page.
        </div>
      )}

      {largest && (
        <div role="note" className="mb-6 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-300" />
          <p>
            At {largest.investorCount.toLocaleString()} investors the platform's own gas is{" "}
            <b>{pct(Math.abs(largest.comparison.platformGasSavingsVsPushPercent))} {largest.comparison.platformGasSavingsVsPushPercent >= 0 ? "lower" : "higher"}</b> with the
            Merkle method than with push transfers, while the whole network's gas is{" "}
            <b>{overhead(largest.comparison.networkGasOverheadVsPushPercent)}</b> compared with push and{" "}
            <b>{overhead(largest.comparison.networkGasOverheadVsSnapshotPercent)}</b> compared with the snapshot method.
            Investors pay {num(largest.proposedFramework.totalInvestorGas)} gas in claims on top of the platform's setup.
            {largest.comparison.platformGasSavingsVsPushPercent > 0 && largest.comparison.networkGasOverheadVsPushPercent > 0
              ? " The method moves cost from the platform to the investors; it does not reduce the total, so report both figures."
              : " Report both figures: the platform's share and the network total."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-8">
        {benchmark.map((row) => (
          <div key={row.investorCount} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
            <h3 className="text-base font-bold text-white mb-4">{row.investorCount.toLocaleString()} investors</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-300 mb-2">
                  <ShieldCheck className="w-4 h-4" /> Platform gas
                </div>
                <p className="text-sm text-zinc-300">
                  Merkle <b className="font-mono text-white">{num(row.proposedFramework.platformSetupGas)}</b> vs push{" "}
                  <b className="font-mono text-white">{num(row.baselinePushFramework.totalNetworkGas)}</b>
                </p>
                <p className="mt-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${savingsClass(row.comparison.platformGasSavingsVsPushPercent)}`}>
                    {row.comparison.platformGasSavingsVsPushPercent >= 0 ? "saves" : "costs more"} {pct(Math.abs(row.comparison.platformGasSavingsVsPushPercent))} vs push
                  </span>
                </p>
                <p className="mt-2 text-xs text-zinc-400">
                  vs snapshot setup ({num(row.baselineSnapshotFramework.platformSetupGas)}):{" "}
                  <span className={row.comparison.platformGasSavingsVsSnapshotPercent >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {row.comparison.platformGasSavingsVsSnapshotPercent >= 0 ? "saves" : "costs more"} {pct(Math.abs(row.comparison.platformGasSavingsVsSnapshotPercent))}
                  </span>
                </p>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300 mb-2">
                  <Network className="w-4 h-4" /> Total network gas
                </div>
                <p className="text-sm text-zinc-300">
                  Merkle <b className="font-mono text-white">{num(row.proposedFramework.totalNetworkGas)}</b> vs push{" "}
                  <b className="font-mono text-white">{num(row.baselinePushFramework.totalNetworkGas)}</b>
                </p>
                <p className="mt-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${overheadClass(row.comparison.networkGasOverheadVsPushPercent)}`}>
                    {overhead(row.comparison.networkGasOverheadVsPushPercent)} gas vs push
                  </span>
                </p>
                <p className="mt-2 text-xs text-zinc-400">
                  vs snapshot ({num(row.baselineSnapshotFramework.totalNetworkGas)}):{" "}
                  <span className={row.comparison.networkGasOverheadVsSnapshotPercent > 0 ? "text-red-400" : "text-emerald-400"}>
                    {overhead(row.comparison.networkGasOverheadVsSnapshotPercent)}
                  </span>
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-zinc-400">
              Investors pay {num(row.comparison.investorGasUnderMerkle)} gas in claims ({pct(row.comparison.investorShareUnderMerklePercent)} of the Merkle total).
              Under push the investors pay nothing and the platform pays everything.
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className={headRowClass}>
              <th className={thClass}>Investors</th>
              <th className={thClass}>Merkle platform gas</th>
              <th className={thClass}>Merkle claim gas / investor</th>
              <th className={thClass}>Merkle total</th>
              <th className={thClass}>Push total</th>
              <th className={thClass}>Snapshot total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-mono">
            {benchmark.map((row) => (
              <tr key={row.investorCount} className="hover:bg-zinc-800/30">
                <td className="py-3 px-4 text-white font-bold">{row.investorCount.toLocaleString()}</td>
                <td className="py-3 px-4 text-blue-400 font-semibold">{num(row.proposedFramework.platformSetupGas)}</td>
                <td className="py-3 px-4 text-zinc-300">{num(row.proposedFramework.perInvestorClaimGas)}</td>
                <td className="py-3 px-4 text-amber-300 font-bold">{num(row.proposedFramework.totalNetworkGas)}</td>
                <td className="py-3 px-4 text-zinc-400">{num(row.baselinePushFramework.totalNetworkGas)}</td>
                <td className="py-3 px-4 text-zinc-400">{num(row.baselineSnapshotFramework.totalNetworkGas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {largest && meta.blockGasLimit && largest.baselinePushFramework.totalNetworkGas > meta.blockGasLimit && (
        <p className="text-xs text-zinc-400 mt-3">
          Pushing to {largest.investorCount.toLocaleString()} investors needs {num(largest.baselinePushFramework.totalNetworkGas)} gas, more than one block holds ({num(meta.blockGasLimit)}), so it would have to be split across several transactions.
        </p>
      )}
    </div>
  );
}
