import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, ArrowRight, Wallet, Building2, TrendingUp, Percent, PiggyBank, Clock } from "lucide-react";
import { useCurrency } from "../../context/CurrencyContext";
import { arrowOf, pctText, dirOf } from "../../lib/marketStats";
import Sparkline from "./Sparkline";
import { useDeals, gapInfo } from "./InvestorViews";
import PropertyCover, { prettyType, accentOf } from "./PropertyCover";
import { Badge, Skeleton, Card } from "../ui/dash";

const MOVE = { up: "var(--up)", down: "var(--down)", flat: "var(--ink-3)" };
const SORTS = [["deal", "Best discount"], ["entry", "Lowest entry price"], ["available", "Most available"], ["value", "Highest value"], ["name", "Name"]];
const field = "rounded-xl border border-[#2c2d31] bg-[#1b1c1f] px-3 py-2 text-sm text-white outline-none focus:border-[#1fe06f]";

// Property photo that fills whatever space it is given. The caller sets the position (relative or absolute).
function Photo({ asset, className = "" }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`overflow-hidden bg-[#1b1c1f] ${className}`}>
      {asset.imageUrl && !failed
        ? <img src={asset.imageUrl} onError={() => setFailed(true)} alt={asset.name} className="absolute inset-0 h-full w-full object-cover" />
        : <PropertyCover asset={asset} className="absolute inset-0" />}
    </div>
  );
}

const supplyOf = (d) => Number(d.asset.totalShares) || 0;
// What the whole property is worth at its approved price per token.
const valueOf = (d) => (d.approved != null ? d.approved * supplyOf(d) : null);
// The price a new investor pays per token today: the cheapest offer, else the approved price.
const entryOf = (d) => d.lowest ?? d.approved;
// Tokens that already left the owner's wallet: sold to investors.
const heldByOthersOf = (d) => Math.max(0, supplyOf(d) - (d.asset.ownership?.ownerBalance ?? supplyOf(d)));
const availablePct = (d) => (supplyOf(d) ? (d.tokens / supplyOf(d)) * 100 : 0);

function Metric({ label, value, tone }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#98a2c3]">{label}</dt>
      <dd className="mt-1 truncate text-[15px] font-bold tabular-nums" style={{ color: tone || "#ffffff" }}>{value}</dd>
    </div>
  );
}

// One investment opportunity: what it is, what it is worth, what it costs to get in, and how much is still open.
function OpportunityCard({ d, formatMUSD }) {
  const a = d.asset;
  const open = d.offers.length > 0;
  const g = gapInfo(d.gap);
  const discounted = open && d.gap != null && d.gap < -0.005;
  const move = MOVE[dirOf(d.s.change)];
  const value = valueOf(d);
  const entry = entryOf(d);
  const accent = accentOf(a);
  const avail = availablePct(d);
  const others = supplyOf(d) ? (heldByOthersOf(d) / supplyOf(d)) * 100 : 0;
  const to = `/marketplace/assets/${a.assetId}`;
  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-[#2c2d31] bg-[#232427] transition-colors hover:border-[#3a3b40]" style={{ borderTop: `3px solid ${accent}` }}>
      <Link to={to} aria-label={`View ${a.name}`} className="relative block h-48">
        <Photo asset={a} className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#232427] via-transparent to-black/30" />
        <span className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold backdrop-blur-md ${open ? "bg-[#1fe06f] text-[#04130a]" : "bg-black/60 text-[#d4d4d8]"}`}>
          {open ? <><TrendingUp className="h-3.5 w-3.5" />Open to invest</> : <><Clock className="h-3.5 w-3.5" />Sold out</>}
        </span>
        {discounted && <span className="absolute right-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-bold backdrop-blur-md" style={{ color: g.color, border: `1px solid color-mix(in srgb, ${g.color} 55%, transparent)` }}>{g.short}</span>}
        {d.held > 0 && <span className="absolute bottom-3 left-3"><Badge tone="brand">You own {((d.held / (supplyOf(d) || 1)) * 100).toFixed(2)}%</Badge></span>}
      </Link>

      <div className="flex flex-1 flex-col gap-4 p-5 pt-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: accent }}>{prettyType(a.propertyType || a.assetType)}</p>
          <Link to={to} className="mt-0.5 block truncate text-xl font-bold text-white hover:text-[#1fe06f]">{a.name}</Link>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[#98a2c3]"><MapPin size={14} className="shrink-0" /><span className="truncate">{a.location || "Location not provided"}</span></p>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wide text-[#98a2c3]">Property value</p>
          <p className="text-3xl font-bold leading-tight tabular-nums" style={{ color: accent }}>{value != null ? formatMUSD(value) : "—"}</p>
        </div>

        <dl className="grid grid-cols-3 gap-3 rounded-2xl bg-[#1b1c1f] px-4 py-3">
          <Metric label="Start from" tone="#38bdf8" value={entry != null ? formatMUSD(entry) : "—"} />
          <Metric label="Tokens" tone="#fbbf24" value={supplyOf(d) ? supplyOf(d).toLocaleString() : "—"} />
          <Metric label="Per token" tone="#a78bfa" value={supplyOf(d) ? `${(100 / supplyOf(d)).toFixed(supplyOf(d) > 1000 ? 3 : 2)}%` : "—"} />
        </dl>

        <div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-semibold text-white">{open ? `${avail.toFixed(1)}% open to invest` : `${others.toFixed(1)}% held by investors`}</span>
            <span className="text-[#98a2c3]">{open ? `${d.tokens.toLocaleString()} tokens` : "None for sale right now"}</span>
          </div>
          <div role="img" aria-label={open ? `${avail.toFixed(1)}% of the property is open to invest` : `${others.toFixed(1)}% of the property is held by investors`} className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#2c2d31]">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, open ? avail : others)}%`, background: open ? accent : "#98a2c3" }} />
          </div>
        </div>

        <div className="mt-auto flex items-center gap-3">
          {open ? (
            <Link to={to} className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 py-3 text-[15px] font-bold text-white">
              Invest <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link to={to} className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-[#3a3b40] py-3 text-[15px] font-semibold text-[#d4d4d8] hover:bg-[#2c2d31] hover:text-white">
              View property <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          {d.spark.length > 1 && (
            <div className="text-right" title="Recent trade prices">
              <Sparkline prices={d.spark} />
              {d.s.change != null && <p className="text-[11px] font-bold tabular-nums" style={{ color: move }}>{arrowOf(d.s.change)} {pctText(d.s.change)}</p>}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function SummaryStrip({ all, open, cash, wallet, loading, formatMUSD }) {
  const owned = all.filter((d) => d.held > 0);
  const holdingsValue = owned.reduce((s, d) => s + (d.approved != null ? d.held * d.approved : 0), 0);
  const gaps = open.map((d) => d.gap).filter((x) => x != null);
  const best = gaps.length ? Math.min(...gaps) : null;
  const v = (x) => (loading ? "…" : x);
  const cells = [
    { label: "Cash to invest", color: "#38bdf8", icon: Wallet, to: "/portfolio", value: !wallet ? "—" : cash == null ? "…" : formatMUSD(cash), note: wallet ? "Demo mUSD in your wallet" : "Connect a wallet to invest" },
    { label: "Your investments", color: "#a78bfa", icon: PiggyBank, to: "/portfolio", value: v(owned.length ? formatMUSD(holdingsValue) : formatMUSD(0)), note: loading ? "" : owned.length ? `${owned.length} ${owned.length === 1 ? "property" : "properties"} at approved value` : "Nothing invested yet" },
    { label: "Open to invest", color: "#1fe06f", icon: Building2, value: v(open.length), note: loading ? "" : `of ${all.length} tokenized` },
    { label: "Best discount", color: "#fbbf24", icon: Percent, value: v(best != null && best < -0.005 ? `${Math.abs(best * 100).toFixed(0)}%` : "None"), tone: best != null && best < -0.005 ? "var(--up)" : undefined, note: "Below the approved value" },
  ];
  return (
    <section aria-label="Your investing summary" className="grid grid-cols-2 overflow-hidden rounded-3xl border border-[#2c2d31] bg-[#232427] lg:grid-cols-4">
      {cells.map((c, i) => {
        const body = (
          <>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#98a2c3]"><span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${c.color} 16%, transparent)`, color: c.color }}><c.icon className="h-4 w-4" aria-hidden /></span>{c.label}</p>
            <p className="mt-2 truncate text-2xl font-bold leading-none tabular-nums" style={{ color: c.tone || c.color }}>{c.value}</p>
            <p className="mt-2 truncate text-xs text-[#98a2c3]">{c.note}</p>
          </>
        );
        const cls = `block min-w-0 p-4 sm:p-5 ${i % 2 === 1 ? "border-l border-[#2c2d31]" : ""} ${i > 1 ? "border-t border-[#2c2d31] lg:border-t-0" : ""} ${i > 0 ? "lg:border-l lg:border-[#2c2d31]" : ""}`;
        return c.to ? <Link key={c.label} to={c.to} className={`${cls} transition-colors hover:bg-[#2c2d31]`}>{body}</Link> : <div key={c.label} className={cls}>{body}</div>;
      })}
    </section>
  );
}

// The investor's home in the marketplace. A property appears here only after its owner has released tokens
// for sale; until then it stays out of the marketplace.
export function InvestorShop({ assets, offers, reference, trades, loading, error, onRetry, cash, wallet }) {
  const { formatMUSD } = useCurrency();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("deal");
  const all = useDeals({ assets, offers, reference, trades });

  // Offers the viewer can actually take: not their own, cheapest first.
  const buyableOf = (d) => d.offers.filter((o) => !wallet || o.seller.toLowerCase() !== wallet).sort((a, b) => a.pricePerTokenFormatted - b.pricePerTokenFormatted);
  const num = (x, fallback) => (x == null ? fallback : x);
  const byOrder = (a, b) => {
    if (sort === "entry") return num(entryOf(a), Infinity) - num(entryOf(b), Infinity);
    if (sort === "available") return availablePct(b) - availablePct(a);
    if (sort === "value") return num(valueOf(b), -1) - num(valueOf(a), -1);
    if (sort === "name") return a.asset.name.localeCompare(b.asset.name);
    return num(a.gap, Infinity) - num(b.gap, Infinity) || a.asset.name.localeCompare(b.asset.name);
  };
  const released = useMemo(
    () => all.map((d) => ({ ...d, offers: buyableOf(d), tokens: buyableOf(d).reduce((s, o) => s + Number(o.amount), 0) })).filter((d) => d.offers.length > 0 || heldByOthersOf(d) > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all, wallet],
  );
  const shown = released
    .filter((d) => `${d.asset.name} ${d.asset.location || ""}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (b.offers.length > 0) - (a.offers.length > 0) || byOrder(a, b));

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="text-sm text-amber-300">{error} <button type="button" onClick={onRetry} className="underline">Retry</button></p>}
      <SummaryStrip all={all} open={released.filter((d) => d.offers.length > 0)} cash={cash} wallet={wallet} loading={loading} formatMUSD={formatMUSD} />

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"><Skeleton className="h-[34rem] rounded-3xl" /><Skeleton className="h-[34rem] rounded-3xl" /><Skeleton className="h-[34rem] rounded-3xl" /></div>
      ) : released.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1fe06f]/10 text-[#1fe06f]"><Clock className="h-6 w-6" aria-hidden /></span>
            <h2 className="text-lg font-bold text-white">No properties are open to invest in yet</h2>
            <p className="max-w-md text-sm leading-relaxed text-[#98a2c3]">A property appears here as soon as its owner releases tokens for sale. Check back soon.</p>
          </div>
        </Card>
      ) : (
        <>
          {released.length > 1 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#98a2c3]"><span className="font-semibold text-white">{released.length}</span> properties on the marketplace</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="relative">
                  <span className="sr-only">Search properties</span>
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2c3]" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or location" className={`${field} w-full pl-10 sm:w-64`} />
                </label>
                <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className={field}>
                  {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
            </div>
          )}

          {shown.length === 0 ? (
            <Card><p className="text-sm text-[#98a2c3]">No properties match your search.</p></Card>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((d) => <OpportunityCard key={d.asset.tokenId} d={d} formatMUSD={formatMUSD} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
