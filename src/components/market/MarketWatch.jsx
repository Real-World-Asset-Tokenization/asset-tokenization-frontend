import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Search, ShoppingBag } from "lucide-react";
import { useCurrency } from "../../context/CurrencyContext";
import { isActiveOffer } from "../../lib/marketplaceData";
import { tradesByToken, summarize, colorOf, arrowOf, pctText, dirOf } from "../../lib/marketStats";
import { cardClass, Badge } from "../ui/dash";
import Sparkline from "./Sparkline";
import { AssetPhoto } from "../AssetExplorer";

const th = "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#98a2c3] whitespace-nowrap";
const SORTS = [["change", "Biggest move"], ["volume", "Most traded"], ["ask", "Lowest price"], ["name", "Name"]];
const FILTERS = [["all", "All"], ["up", "▲ Rising"], ["down", "▼ Falling"], ["sale", "For sale"]];
// Direction colours come from CSS variables so green and red stay readable in both themes.
const TONE = { up: "var(--up)", down: "var(--down)", flat: "var(--ink-3)" };
const tint = (c, pct) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

// One property as a trading card: photo, price, move and a one-tap buy.
function MarketCard({ row, formatMUSD }) {
  const { asset, s, ask, askCount, spark, held } = row;
  const c = TONE[dirOf(s.change)];
  const to = `/marketplace/assets/${asset.assetId}`;
  return (
    <article className="group rounded-2xl border border-[#1b2440] bg-[#0b1124] overflow-hidden flex flex-col transition-transform hover:-translate-y-0.5"
      style={{ borderTop: `3px solid ${c}` }}>
      <Link to={to} aria-label={`View ${asset.name}`} className="relative block">
        <AssetPhoto asset={asset} />
        <span className="absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-bold backdrop-blur-md bg-black/60" style={{ color: c, border: `1px solid ${tint(c, 55)}` }}>
          {s.change != null ? `${arrowOf(s.change)} ${pctText(s.change)}` : "New"}
        </span>
        {held && <span className="absolute top-3 left-3"><Badge tone="brand">You hold {asset.ownership.viewerBalance.toLocaleString()}</Badge></span>}
      </Link>
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="min-w-0">
          <Link to={to} className="block font-bold text-lg text-white truncate hover:text-indigo-300">{asset.name}</Link>
          <p className="flex items-center gap-1.5 text-sm text-[#98a2c3] mt-0.5"><MapPin size={14} className="shrink-0" /><span className="truncate">{asset.location || "Location not provided"}</span></p>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[#98a2c3]">Last price</p>
            <p className="text-2xl font-bold text-white tabular-nums leading-tight">{s.last != null ? formatMUSD(s.last) : <span className="text-base font-medium text-[#98a2c3]">No trades yet</span>}</p>
          </div>
          <Sparkline prices={spark} />
        </div>
        <p className="text-sm text-[#98a2c3]">
          {ask != null ? <>Buy from <strong className="text-white">{formatMUSD(ask)}</strong> · {askCount} {askCount === 1 ? "offer" : "offers"}</> : "Nobody is selling right now"}
        </p>
        <Link to={to} className={`mt-auto inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ${ask != null ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "border border-[#29345a] text-[#c3cae2] hover:bg-[#141c33]"}`}>
          <ShoppingBag size={16} />{ask != null ? "Buy tokens" : "View property"}
        </Link>
      </div>
    </article>
  );
}

/**
 * A ticker board: one row per tokenized property with last price, change, trend,
 * volume and lowest ask, all from completed trades and open offers on the chain.
 * `compact` gives the dashboard version (no movers strip, fewer columns).
 */
export default function MarketWatch({ assets, trades, listings, reference = {}, compact = false, limit, loading, error }) {
  const { formatMUSD, convert } = useCurrency();
  const [sort, setSort] = useState("change");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const byToken = tradesByToken(trades || []);
    return assets.map((a) => {
      const list = byToken.get(Number(a.tokenId)) || [];
      const s = summarize(list);
      const asks = listings.filter((o) => Number(o.assetId) === Number(a.tokenId) && isActiveOffer(o));
      const ask = asks.length ? Math.min(...asks.map((o) => o.pricePerTokenFormatted)) : null;
      const refLkr = reference[Number(a.tokenId)];
      const approved = refLkr != null ? convert(refLkr, "LKR", "USD") : null;
      return { asset: a, s, ask, approved, askCount: asks.length, spark: list.slice(-12).map((t) => t.price), held: (a.ownership?.viewerBalance || 0) > 0 };
    });
  }, [assets, trades, listings, reference, convert]);

  const byName = (a, b) => a.asset.name.localeCompare(b.asset.name);
  const sorted = [...rows].sort((a, b) => {
    if (sort === "change") return (a.s.change == null) - (b.s.change == null) || Math.abs(b.s.change ?? 0) - Math.abs(a.s.change ?? 0) || byName(a, b);
    if (sort === "volume") return b.s.volume - a.s.volume || byName(a, b);
    if (sort === "ask") return (a.ask == null) - (b.ask == null) || (a.ask ?? 0) - (b.ask ?? 0) || byName(a, b);
    return byName(a, b);
  });
  // The dashboard version favours properties the investor holds.
  const ordered = compact ? [...sorted].sort((a, b) => Number(b.held) - Number(a.held)) : sorted
    .filter((r) => filter === "all" || (filter === "sale" ? r.ask != null : dirOf(r.s.change) === filter))
    .filter((r) => `${r.asset.name} ${r.asset.location || ""}`.toLowerCase().includes(query.toLowerCase()));
  const shown = limit ? ordered.slice(0, limit) : ordered;

  if (!compact) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div role="group" aria-label="Filter properties" className="flex flex-wrap gap-2">
            {FILTERS.map(([k, label]) => {
              const on = filter === k;
              const tone = k === "up" ? "var(--up)" : k === "down" ? "var(--down)" : "#4ade80";
              return (
                <button key={k} onClick={() => setFilter(k)} aria-pressed={on}
                  className={`px-3.5 py-1.5 rounded-full border text-sm font-semibold ${on ? "" : "text-[#98a2c3] border-[#1b2440] hover:text-white"}`}
                  style={on ? { background: tint(tone, 18), borderColor: tint(tone, 65), color: tone } : undefined}>
                  {label}
                </button>
              );
            })}
          </div>
          <label className="relative flex-1 lg:max-w-xs lg:ml-auto">
            <span className="sr-only">Search properties</span>
            <Search className="w-4 h-4 text-[#98a2c3] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or location" className="w-full pl-10 pr-3 py-2 rounded-xl border border-[#1b2440] bg-[#0b1124] text-white text-sm outline-none" />
          </label>
          <label className="text-xs text-[#98a2c3] flex items-center gap-2">Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-[#1b2440] bg-[#0e1426] px-2.5 py-1.5 text-sm text-white outline-none">
              {SORTS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </label>
        </div>
        {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
        {loading ? <p className="py-12 text-center text-[#98a2c3]">Loading market…</p>
          : !rows.length ? <p className="py-12 text-center text-[#98a2c3]">No tokenized properties are listed yet.</p>
          : !shown.length ? <p className="py-12 text-center text-[#98a2c3]">No properties match. Try “All”.</p>
          : <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">{shown.map((row) => <MarketCard key={row.asset.tokenId} row={row} formatMUSD={formatMUSD} />)}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className={`${cardClass} overflow-hidden`}>
        {!compact && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 pt-5">
            <div>
              <h2 className="text-lg font-bold text-white">Market watch</h2>
              <p className="text-sm text-[#98a2c3]">Every tokenized property like a ticker. Change compares the last trade with the one before it.</p>
            </div>
            <label className="text-xs text-[#98a2c3] flex items-center gap-2">Sort by
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-[#1b2440] bg-[#0e1426] px-2.5 py-1.5 text-sm text-white outline-none focus:border-indigo-500">
                {SORTS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </label>
          </div>
        )}
        {error && <p role="alert" className="px-5 sm:px-6 pt-3 text-sm text-amber-300">{error}</p>}
        {loading ? <p className="p-6 text-[#98a2c3]">Loading market…</p> : !shown.length ? <p className="p-6 text-[#98a2c3]">No tokenized properties are listed yet.</p> : (
          <div className="overflow-x-auto mt-3">
            <table className={`w-full text-sm ${compact ? "min-w-[560px]" : "min-w-[860px]"}`}>
              <thead className="border-b border-[#1b2440]">
                <tr className="text-left">
                  <th className={th}>Property</th>
                  <th className={`${th} text-right`}>Last price</th>
                  <th className={`${th} text-right`}>Change</th>
                  <th className={th}>Trend</th>
                  {!compact && <th className={`${th} text-right`}>Volume</th>}
                  <th className={`${th} text-right`}>Lowest selling price</th>
                  {!compact && <th className={`${th} text-right`}>Approved value</th>}
                  <th className={th}><span className="sr-only">Trade</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ asset, s, ask, approved, askCount, spark, held }) => (
                  <tr key={asset.tokenId} className="border-b border-[#1b2440] last:border-0 hover:bg-[#0e1426]">
                    <td className="px-4 py-3">
                      <Link to={`/marketplace/assets/${asset.assetId}`} className="block font-semibold text-white hover:text-indigo-300 truncate max-w-[240px]">{asset.name}</Link>
                      <span className="flex items-center gap-2 text-xs text-[#6b7599]">Token #{asset.tokenId}{held && <Badge tone="brand">You hold {asset.ownership.viewerBalance.toLocaleString()}</Badge>}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-white whitespace-nowrap">{s.last != null ? formatMUSD(s.last) : <span className="font-normal text-[#6b7599]">No trades</span>}</td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap" style={{ color: colorOf(s.change) }}>{s.change != null ? `${arrowOf(s.change)} ${pctText(s.change)}` : <span className="font-normal text-[#6b7599]">—</span>}</td>
                    <td className="px-4 py-3"><Sparkline prices={spark} /></td>
                    {!compact && <td className="px-4 py-3 text-right text-[#c3cae2] whitespace-nowrap">{s.volume ? `${s.volume.toLocaleString()} tokens` : "—"}</td>}
                    <td className="px-4 py-3 text-right whitespace-nowrap">{ask != null ? <><span className="font-semibold text-white">{formatMUSD(ask)}</span><span className="block text-xs text-[#6b7599]">{askCount} {askCount === 1 ? "offer" : "offers"}</span></> : <span className="text-[#6b7599]">None</span>}</td>
                    {!compact && <td className="px-4 py-3 text-right text-[#c3cae2] whitespace-nowrap">{approved != null ? formatMUSD(approved) : "—"}</td>}
                    <td className="px-4 py-3 text-right"><Link to={`/marketplace/assets/${asset.assetId}`} className="inline-block rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white">Trade</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
