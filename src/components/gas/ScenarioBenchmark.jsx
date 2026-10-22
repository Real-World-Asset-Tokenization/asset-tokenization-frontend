import { useState } from "react";
import { Route, AlertTriangle } from "lucide-react";
import { pct, num, shortHash, shortAddress, savingsClass, CATEGORY_LABEL, CATEGORY_TEXT, cardClass, headRowClass, thClass } from "./format";

const FLOW_LABEL = { baseline: "Baseline", optimized: "Optimized" };

// The whole property story, from the owner tokenizing the land to the sale price being paid out, measured once
// with the baseline approach and once with the optimized approach. Every row is a real transaction.
export default function ScenarioBenchmark({ scenario }) {
  const [investors, setInvestors] = useState(null);

  if (!scenario.measured) {
    return (
      <div className={cardClass}>
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Route className="w-6 h-6 text-indigo-400" />End-to-end scenario</h2>
        <div className="mt-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs text-zinc-300">
          No scenario has been measured yet. Run <span className="font-mono text-white">npx hardhat run scripts/measureScenarioGas.js</span> in the blockchain folder, then refresh this page.
        </div>
      </div>
    );
  }

  const cohort = scenario.cohorts.find((c) => c.investors === investors) || scenario.cohorts[0];
  const { baseline, optimized } = cohort.flows;
  const c = cohort.comparison;

  return (
    <>
      <div className={cardClass}>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Route className="w-6 h-6 text-indigo-400" />End-to-end scenario</h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
              An owner tokenizes land and sells 600 of 1,000 tokens to investors, one investor resells part of their tokens, a buyer offers for the whole
              property, every holder votes, and the price is paid out by tokens held. Measured {new Date(scenario.generatedAt).toLocaleString()} on a {scenario.network.name.toLowerCase()}.
            </p>
          </div>
          <div role="group" aria-label="Number of investors" className="flex gap-1 rounded-xl bg-zinc-950 border border-zinc-800 p-1">
            {scenario.cohorts.map((x) => (
              <button key={x.investors} onClick={() => setInvestors(x.investors)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold ${x.investors === cohort.investors ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"}`}>
                {x.investors} investors
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Tile label="Total gas, whole scenario" value={`${pct(c.totalGasSavedPercent)} ${c.totalGasSavedPercent >= 0 ? "less" : "more"}`} tone={c.totalGasSavedPercent}
            note={`${num(c.networkGasBaseline)} baseline vs ${num(c.networkGasOptimized)} optimized`} />
          <Tile label="Total gas, without tokenization" value={`${pct(c.totalExcludingTokenizationSavedPercent)} ${c.totalExcludingTokenizationSavedPercent >= 0 ? "less" : "more"}`} tone={c.totalExcludingTokenizationSavedPercent}
            note="Tokenization is the same cost for any number of investors" />
          <Tile label="Platform wallet only" value={`${pct(c.platformOnlySavedPercent)} ${c.platformOnlySavedPercent >= 0 ? "less" : "more"}`} tone={c.platformOnlySavedPercent}
            note={`${num(baseline.byCategory.Platform)} baseline vs ${num(optimized.byCategory.Platform)} optimized`} />
          <Tile label="Platform + vote relay" value={`${pct(c.platformWithRelayerSavedPercent)} ${c.platformWithRelayerSavedPercent >= 0 ? "less" : "more"}`} tone={c.platformWithRelayerSavedPercent}
            note={`The platform wallet also sends the ${num(optimized.byCategory.Relayer)} gas relay`} />
        </div>

        <div role="note" className="mb-6 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-300" />
          <p>
            Most of the whole-scenario saving comes from creating the tokens in one transaction instead of {num(baseline.byStage[0].transactions)}, which does not grow with the number of investors.
            Read the stage table below: some stages (escrow, payout) cost more gas in the optimized flow because they add an escrow contract and investor claims, and they move cost from the platform to the holders.
          </p>
        </div>

        <h3 className="text-sm font-semibold text-white mb-3">Gas by stage</h3>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className={headRowClass}>
                <th className={thClass}>Stage</th>
                <th className={thClass}>Baseline gas</th>
                <th className={thClass}>Baseline tx</th>
                <th className={thClass}>Optimized gas</th>
                <th className={thClass}>Optimized tx</th>
                <th className={thClass}>Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {c.byStage.map((row, i) => (
                <tr key={row.stage} className="hover:bg-zinc-800/30">
                  <td className="py-3 px-4 text-white font-sans font-semibold">{row.stage}</td>
                  <td className="py-3 px-4 text-zinc-300">{num(row.baselineGas)}</td>
                  <td className="py-3 px-4 text-zinc-500">{num(baseline.byStage[i].transactions)}</td>
                  <td className="py-3 px-4 text-white font-bold">{num(row.optimizedGas)}</td>
                  <td className="py-3 px-4 text-zinc-500">{num(optimized.byStage[i].transactions)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${savingsClass(row.savedPercent)}`}>
                      {row.savedPercent >= 0 ? `${pct(row.savedPercent)} less` : `${pct(Math.abs(row.savedPercent))} more`}
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="bg-zinc-950">
                <td className="py-3 px-4 text-white font-sans font-bold">Total</td>
                <td className="py-3 px-4 text-white font-bold">{num(baseline.totalGas)}</td>
                <td className="py-3 px-4 text-zinc-400">{num(baseline.transactions)}</td>
                <td className="py-3 px-4 text-white font-bold">{num(optimized.totalGas)}</td>
                <td className="py-3 px-4 text-zinc-400">{num(optimized.transactions)}</td>
                <td className="py-3 px-4">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${savingsClass(c.totalGasSavedPercent)}`}>
                    {c.totalGasSavedPercent >= 0 ? `${pct(c.totalGasSavedPercent)} less` : `${pct(Math.abs(c.totalGasSavedPercent))} more`}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-sm font-semibold text-white mb-3">Who pays</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className={headRowClass}>
                <th className={thClass}>Payer</th>
                <th className={thClass}>Baseline gas</th>
                <th className={thClass}>Optimized gas</th>
                <th className={thClass}>Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {c.byPayer.map((row) => (
                <tr key={row.category} className="hover:bg-zinc-800/30">
                  <td className={`py-3 px-4 font-sans font-semibold ${CATEGORY_TEXT[row.category]}`}>{CATEGORY_LABEL[row.category]}</td>
                  <td className="py-3 px-4 text-zinc-300">{num(row.baselineGas)}</td>
                  <td className="py-3 px-4 text-white font-bold">{num(row.optimizedGas)}</td>
                  <td className="py-3 px-4">
                    {row.baselineGas === 0 && row.optimizedGas === 0 ? <span className="text-zinc-600">—</span> : row.baselineGas === 0 ? (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-red-500/10 text-red-400 border-red-500/20">new payer</span>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${savingsClass(row.savedPercent)}`}>
                        {row.savedPercent >= 0 ? `${pct(row.savedPercent)} less` : `${pct(Math.abs(row.savedPercent))} more`}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {["baseline", "optimized"].map((flow) => (
        <div key={flow} className={cardClass}>
          <details>
            <summary className="cursor-pointer text-lg font-bold text-white">
              {FLOW_LABEL[flow]} flow: transaction evidence <span className="text-sm font-normal text-zinc-400">({cohort.flows[flow].steps.length} steps, {num(cohort.flows[flow].transactions)} transactions)</span>
            </summary>
            <p className="text-xs text-zinc-500 mt-2 mb-4">{scenario.network.note}</p>
            <StepTable steps={cohort.flows[flow].steps} />
          </details>
        </div>
      ))}
    </>
  );
}

function Tile({ label, value, tone, note }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
      <p className={`mt-2 text-2xl font-black ${tone >= 0 ? "text-emerald-400" : "text-red-400"}`}>{value}</p>
      <p className="mt-1.5 text-xs text-zinc-500">{note}</p>
    </div>
  );
}

function StepTable({ steps }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className={headRowClass}>
            <th className="py-2 px-3">Stage</th>
            <th className="py-2 px-3">Step</th>
            <th className="py-2 px-3">Payer</th>
            <th className="py-2 px-3">Contract.method</th>
            <th className="py-2 px-3">Transaction hash</th>
            <th className="py-2 px-3">Block</th>
            <th className="py-2 px-3">Gas used</th>
            <th className="py-2 px-3">Gas price (gwei)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60 font-mono">
          {steps.map((s, i) => (
            <tr key={i} className={s.offChain ? "opacity-70" : "hover:bg-zinc-800/30"}>
              <td className="py-2 px-3 text-zinc-300 font-sans">{s.stage}</td>
              <td className="py-2 px-3 text-zinc-200 font-sans">{s.step}{s.count > 1 ? ` (×${num(s.count)})` : ""}</td>
              <td className={`py-2 px-3 font-sans ${CATEGORY_TEXT[s.payerCategory]}`}>{CATEGORY_LABEL[s.payerCategory]}{s.payerAddress ? <span className="text-zinc-500"> {shortAddress(s.payerAddress)}</span> : null}</td>
              <td className="py-2 px-3 text-zinc-300">{s.contract}.{s.method}</td>
              <td className="py-2 px-3 text-zinc-400">
                {s.offChain ? <span className="font-sans italic">signed off-chain, nothing sent</span> : (
                  <span title={s.lastTxHash ? `first ${s.txHash}\nlast ${s.lastTxHash}` : s.txHash}>{shortHash(s.txHash)}{s.lastTxHash ? " …" : ""}</span>
                )}
              </td>
              <td className="py-2 px-3 text-zinc-400">{s.blockNumber ?? "—"}{s.lastBlockNumber ? `–${s.lastBlockNumber}` : ""}</td>
              <td className="py-2 px-3 text-white font-bold">{num(s.gasUsed)}</td>
              <td className="py-2 px-3 text-zinc-400">{s.effectiveGasPriceGwei != null ? Number(s.effectiveGasPriceGwei).toFixed(4) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
