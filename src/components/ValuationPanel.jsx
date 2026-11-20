import { useEffect, useState } from "react";
import { Landmark, History, TrendingUp, TrendingDown } from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";
import { valuationApi } from "../services/valuationApi";
import { lkr, pctLabel, changeClass, centsToDecimal } from "../lib/lkr";

const date = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—");

/**
 * Official valuation of one property: approved value, reference price (from the
 * published valuation), last completed trade price (from the marketplace), history.
 * `balance` adds an indicative holding value. `allowReviewRequest` shows the owner's
 * "request a revaluation review" form.
 */
export default function ValuationPanel({ assetId, balance = null, allowReviewRequest = false, title }) {
  const { formatMUSD, convert, currency } = useCurrency();
  const [v, setV] = useState(null);
  const [history, setHistory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState({ open: false, reason: "", busy: false, msg: null });

  useEffect(() => {
    let cancelled = false;
    setV(null); setError("");
    valuationApi.asset(assetId).then((d) => !cancelled && setV(d)).catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [assetId]);

  const toggleHistory = async () => {
    setShowHistory((s) => !s);
    if (!history) {
      try { setHistory(await valuationApi.history(assetId)); } catch (e) { setHistory({ error: e.message }); }
    }
  };

  const sendReview = async (e) => {
    e.preventDefault();
    setReview((r) => ({ ...r, busy: true, msg: null }));
    try {
      await valuationApi.requestReview(assetId, review.reason);
      setReview({ open: false, reason: "", busy: false, msg: { ok: true, text: "Review requested. A valuer will assess the property; the value only changes after approval." } });
    } catch (err) {
      setReview((r) => ({ ...r, busy: false, msg: { ok: false, text: err.message } }));
    }
  };

  if (error) return <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-amber-300" role="alert">Valuation unavailable: {error}</section>;
  if (!v) return <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400" role="status">Loading valuation…</section>;

  const change = v.referencePriceChangePercent;
  const holdingCents = balance != null ? BigInt(v.referencePriceCents) * BigInt(balance) : null;
  const tradeLkr = v.lastTrade ? Math.round(convert(Number(v.lastTrade.pricePerToken), "USD", "LKR")) : null;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-bold flex items-center gap-2"><Landmark className="w-5 h-5 text-indigo-400" />{title || `${v.name} valuation`}</h3>
        <span className="text-xs text-zinc-500">Version {v.valuationVersion} · valued {date(v.lastValuationDate)}</span>
      </div>
      {!v.registryInSync && <p className="text-xs text-amber-300">The registry value differs from the last published version. An administrator should reconcile it.</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
        <Tile label="Approved property value" value={lkr(v.approvedValuation)} note={v.previousValuation ? `was ${lkr(v.previousValuation)}` : "Since registration"} />
        <Tile label="Reference price / token" value={lkr(v.referencePrice)}
          note={change == null ? "No revaluation yet" : <span className={changeClass(change)}>{Number(change) >= 0 ? <TrendingUp className="inline w-3 h-3" /> : <TrendingDown className="inline w-3 h-3" />} {pctLabel(change)} from {lkr(v.previousReferencePrice)}</span>} />
        <Tile label="Last completed trade / token" value={v.lastTrade ? formatMUSD(Number(v.lastTrade.pricePerToken), { showCode: true }) : "No trades yet"}
          note={v.lastTrade ? `≈ ${lkr(String(tradeLkr))} · ${date(v.lastTrade.tradedAt)}` : "Market price comes from actual sales"} />
        <Tile label="Total token supply" value={Number(v.tokenSupply).toLocaleString()} note="Unchanged by revaluation" />
      </div>

      {holdingCents != null && (
        <p className="text-sm bg-zinc-950 rounded-xl p-3">
          Your {Number(balance).toLocaleString()} tokens × {lkr(v.referencePrice)} = <strong>{lkr(centsToDecimal(holdingCents))}</strong>
          <span className="text-zinc-500"> indicative value at the reference price{currency !== "LKR" && " (not converted)"}</span>
        </p>
      )}
      <p className="text-xs text-zinc-500">The reference price = approved value ÷ tokens, and changes only when an authorized revaluation is published on-chain. The trade price is what a buyer actually paid on the marketplace; the two are independent.</p>

      <div className="flex flex-wrap gap-4 text-sm">
        <button onClick={toggleHistory} className="text-blue-300 flex items-center gap-1"><History className="w-4 h-4" />{showHistory ? "Hide" : "Show"} valuation history</button>
        {allowReviewRequest && !review.open && <button onClick={() => setReview((r) => ({ ...r, open: true, msg: null }))} className="text-emerald-300">Request a revaluation review</button>}
      </div>
      {review.msg && <p role="status" className={`text-xs ${review.msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{review.msg.text}</p>}
      {review.open && (
        <form onSubmit={sendReview} className="space-y-2">
          <textarea required minLength={10} value={review.reason} onChange={(e) => setReview((r) => ({ ...r, reason: e.target.value }))}
            placeholder="Why should this property be revalued? (e.g. renovation completed, new road access)"
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm" rows={3} />
          <div className="flex gap-2">
            <button disabled={review.busy} className="px-3 py-1.5 bg-emerald-600 rounded-lg text-sm disabled:opacity-50">{review.busy ? "Sending…" : "Send request"}</button>
            <button type="button" onClick={() => setReview((r) => ({ ...r, open: false }))} className="px-3 py-1.5 bg-zinc-800 rounded-lg text-sm">Cancel</button>
          </div>
        </form>
      )}

      {showHistory && (
        !history ? <p className="text-sm text-zinc-400">Loading history…</p> : history.error ? <p className="text-sm text-amber-300">{history.error}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-zinc-400"><tr>{["Version", "Effective", "Value", "Price / token", "Change", "Approved by", "Blockchain tx"].map((h) => <th key={h} className="p-2 whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {[...history.entries].reverse().map((e) => (
                  <tr key={e.version} className="border-t border-zinc-800">
                    <td className="p-2">v{e.version}</td>
                    <td className="p-2 whitespace-nowrap">{date(e.effectiveDate)}</td>
                    <td className="p-2 whitespace-nowrap">{lkr(e.approvedValue)}</td>
                    <td className="p-2 whitespace-nowrap">{lkr(e.referencePrice)}</td>
                    <td className={`p-2 ${changeClass(e.changePercent)}`}>{e.version === 0 ? "Initial" : pctLabel(e.changePercent)}</td>
                    <td className="p-2">{e.version === 0 ? "At tokenization" : e.approvedBy || "—"}</td>
                    <td className="p-2 font-mono">{e.transactionHash ? `${e.transactionHash.slice(0, 10)}…` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </section>
  );
}

function Tile({ label, value, note }) {
  return (
    <div className="rounded-xl border border-zinc-800 p-3">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="font-bold mt-1">{value}</p>
      {note && <p className="text-xs text-zinc-500 mt-1">{note}</p>}
    </div>
  );
}
