import { useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { resolveUserWallet } from "../lib/walletResolver";
import { loadInvestorReturns } from "../services/investorReturns";
import { summarizeHoldings, signClass, pct } from "../lib/portfolioSummary";

export default function InvestorReturns() {
  const { user } = useAuth();
  const wallet = resolveUserWallet(user);
  const { formatMUSD, convert } = useCurrency();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setRows([]); setError(""); setLoading(true);
    if (!wallet) { setLoading(false); return; }
    loadInvestorReturns(wallet).then(data => { if (!cancelled) setRows(data.filter(r => r.balance || r.hasHistory)); })
      .catch(e => { if (!cancelled) setError(e.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [wallet, version]);
  const summary = summarizeHoldings(rows, [], convert);
  return <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
    <div className="flex justify-between gap-4"><h2 className="text-xl font-bold">Your investment performance</h2><button onClick={() => setVersion(v => v + 1)} className="text-blue-300">Refresh</button></div>
    <p className="text-sm text-zinc-400">Value now is what you paid, moved by how much the land valuation has changed since you bought (both valuations are on-chain). It is not cash you can withdraw.</p>
    {!wallet ? <p>Link your wallet to see your investments.</p> : loading ? <p role="status">Reading your holdings and transaction history…</p> : error ? <p role="alert" className="text-amber-300">{error}</p> : <>
      {rows.length > 0 && (() => {
        const t = summary.totals;
        return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[["Invested", formatMUSD(t.invested), ""],
            ["Value now", formatMUSD(t.currentValue), ""],
            [t.unrealized < 0 ? "Unrealized loss" : "Unrealized profit", `${formatMUSD(t.unrealized)} (${pct(t.invested > 0 ? t.unrealized / t.invested * 100 : null)})`, signClass(t.unrealized)],
            ["Total return", `${formatMUSD(t.totalReturn)} (${pct(t.totalReturnPct)})`, signClass(t.totalReturn)]].map(([label, value, cls]) =>
            <div key={label} className="rounded-xl border border-zinc-800 p-3"><p className="text-xs text-zinc-400">{label}</p><p className={`font-bold ${cls}`}>{value}</p></div>)}
        </div>;
      })()}
      <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-zinc-400"><tr>{["Asset / tokens", "Estimated value", "Cost of held tokens", "Unrealized gain / loss", "Realized sale gain / loss"].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
        <tbody>{summary.holdings.map(row => {
          // Same numbers as the totals above: cost moved by the land-value change since purchase.
          const gain = row.unrealizedUSD;
          return <tr key={row.id} className="border-t border-zinc-800">
            <td className="p-3">{row.name}<span className="block text-zinc-400">{row.balance.toLocaleString()} tokens · {(row.balance / row.supply * 100).toFixed(2)}%</span></td>
            <td className="p-3">{formatMUSD(row.valueUSD)}</td>
            <td className="p-3">{row.costUSD == null ? "Cost unavailable" : formatMUSD(row.costUSD)}</td>
            <td className={`p-3 ${gain == null ? "text-zinc-400" : gain < 0 ? "text-rose-300" : "text-emerald-300"}`}>{gain == null ? "Cannot calculate" : formatMUSD(gain)}{gain != null && row.costUSD > 0 && <span className="block">{(gain / row.costUSD * 100).toFixed(2)}%</span>}</td>
            <td className="p-3">{row.realizedUSD == null ? "Cost unavailable" : formatMUSD(row.realizedUSD)}</td>
          </tr>;
        })}</tbody></table></div>
      {!rows.length && <p>No holdings or transfers found for this wallet on the current chain.</p>}
    </>}
    <p className="text-xs text-zinc-500">Average acquisition cost uses recorded marketplace trades. Gifts, minted tokens, and transfers without a known purchase price show “Cost unavailable”. Figures exclude gas, use the app’s indicative conversion rates, and are demo values, not guaranteed sale proceeds.</p>
  </section>;
}
