import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, ShoppingBag, Percent } from "lucide-react";
import { useCurrency } from "../../context/CurrencyContext";
import { isActiveOffer, sellerKind } from "../../lib/marketplaceData";
import { tradesByToken, summarize, arrowOf, pctText, dirOf } from "../../lib/marketStats";
import { AssetPhoto } from "../AssetExplorer";
import Sparkline from "./Sparkline";
import { Card, Badge, SellerTag, Skeleton } from "../ui/dash";

const MOVE = { up: "var(--up)", down: "var(--down)", flat: "var(--ink-3)" };

// How an asking price compares with the approved value, as a colour, arrow and sentence.
// Same rule as every price move: above = green ▲, below = red ▼, no change = grey.
export function gapInfo(gap) {
  if (gap == null) return { color: "var(--ink-3)", label: "No approved price", short: "—" };
  const pc = Math.abs(gap * 100);
  if (pc < 1) return { color: "var(--ink-2)", label: "At the approved price", short: "– At approved" };
  return gap < 0
    ? { color: "var(--down)", label: `${pc.toFixed(0)}% below approved`, short: `▼ ${pc.toFixed(0)}% below` }
    : { color: "var(--up)", label: `${pc.toFixed(0)}% above approved`, short: `▲ ${pc.toFixed(0)}% above` };
}

// One row per property, with its open offers worked out for a buyer.
function useDeals({ assets, offers, reference, trades }) {
  const { convert } = useCurrency();
  return useMemo(() => {
    const byToken = tradesByToken(trades || []);
    return assets.map((a) => {
      const mine = offers.filter((o) => Number(o.assetId) === Number(a.tokenId));
      const lowest = mine.length ? Math.min(...mine.map((o) => o.pricePerTokenFormatted)) : null;
      const refLkr = reference[Number(a.tokenId)];
      const approved = refLkr != null ? convert(refLkr, "LKR", "USD") : null;
      const list = byToken.get(Number(a.tokenId)) || [];
      return {
        asset: a, offers: mine, lowest, approved,
        gap: lowest != null && approved ? lowest / approved - 1 : null,
        tokens: mine.reduce((s, o) => s + Number(o.amount), 0),
        fromOwner: mine.filter((o) => sellerKind(o, a.ownerWallet) === "owner").length,
        fromInvestors: mine.filter((o) => sellerKind(o, a.ownerWallet) === "investor").length,
        s: summarize(list), spark: list.slice(-12).map((t) => t.price),
        held: a.ownership?.viewerBalance || 0,
      };
    });
  }, [assets, offers, reference, trades, convert]);
}

const SORTS = [["deal", "Best deals first"], ["price", "Lowest price"], ["tokens", "Most tokens"], ["name", "Name"]];

function DealCard({ d, formatMUSD }) {
  const { asset, lowest, approved, gap, tokens, offers, fromOwner, fromInvestors, s, spark, held } = d;
  const g = gapInfo(gap);
  const move = MOVE[dirOf(s.change)];
  const to = `/marketplace/assets/${asset.assetId}`;
  const forSale = offers.length > 0;
  const supply = Number(asset.totalShares) || 0;
  return (
    <article className="group rounded-2xl border border-[#1b2440] bg-[#0b1124] overflow-hidden flex flex-col" style={{ borderTop: `3px solid ${forSale ? g.color : "var(--ink-4)"}` }}>
      <Link to={to} aria-label={`View ${asset.name}`} className="relative block">
        <AssetPhoto asset={asset} />
        {forSale && gap != null && (
          <span className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-xs font-bold backdrop-blur-md bg-black/65" style={{ color: g.color, border: `1px solid color-mix(in srgb, ${g.color} 55%, transparent)` }}>{g.short}</span>
        )}
        {held > 0 && <span className="absolute bottom-3 left-3"><Badge tone="brand">You hold {held.toLocaleString()}</Badge></span>}
        {s.change != null && <span className="absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-bold backdrop-blur-md bg-black/65" style={{ color: move }}>{arrowOf(s.change)} {pctText(s.change)}</span>}
      </Link>
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="min-w-0">
          <Link to={to} className="block font-bold text-lg text-white truncate hover:text-indigo-300">{asset.name}</Link>
          <p className="flex items-center gap-1.5 text-sm text-[#98a2c3] mt-0.5"><MapPin size={14} className="shrink-0" /><span className="truncate">{asset.location || "Location not provided"}</span></p>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[#98a2c3]">{forSale ? "Buy from" : "Not for sale"}</p>
            <p className="text-2xl font-bold text-white tabular-nums leading-tight">{lowest != null ? formatMUSD(lowest) : "—"}</p>
            <p className="text-xs text-[#98a2c3]">per token{approved != null ? ` · approved ${formatMUSD(approved)}` : ""}</p>
          </div>
          <Sparkline prices={spark} />
        </div>

        {forSale ? (
          <div className="rounded-xl bg-[#0e1426] px-3.5 py-2.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#98a2c3]">Available</span>
              <span className="font-semibold text-white tabular-nums">{tokens.toLocaleString()} tokens{supply > 0 ? <span className="font-normal text-[#98a2c3]"> · {(tokens / supply * 100).toFixed(1)}%</span> : null}</span>
            </div>
            <p className="mt-1 text-xs text-[#98a2c3]">{fromOwner} from the owner · {fromInvestors} from investors</p>
          </div>
        ) : <p className="rounded-xl bg-[#0e1426] px-3.5 py-2.5 text-sm text-[#98a2c3]">Nobody is selling this property right now.</p>}

        <Link to={to} className={`mt-auto inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ${forSale ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "border border-[#29345a] text-[#c3cae2] hover:bg-[#141c33]"}`}>
          <ShoppingBag size={16} />{forSale ? "Buy tokens" : "View property"}
        </Link>
      </div>
    </article>
  );
}

// Browse: property cards for people who want to buy, with deals worked out for them.
export function InvestorBrowse({ assets, offers, reference, trades, loading, error, onRetry }) {
  const { formatMUSD } = useCurrency();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState("deal");
  const [onlyDeals, setOnlyDeals] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const deals = useDeals({ assets, offers, reference, trades });
  const types = [...new Set(assets.map((a) => a.propertyType || a.assetType).filter(Boolean))];

  const shown = deals
    .filter((d) => (showAll ? true : d.offers.length > 0))
    .filter((d) => !onlyDeals || (d.gap != null && d.gap < -0.005))
    .filter((d) => !type || (d.asset.propertyType || d.asset.assetType) === type)
    .filter((d) => `${d.asset.name} ${d.asset.location || ""}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      if (sort === "price") return (a.lowest == null) - (b.lowest == null) || (a.lowest ?? 0) - (b.lowest ?? 0);
      if (sort === "tokens") return b.tokens - a.tokens;
      if (sort === "name") return a.asset.name.localeCompare(b.asset.name);
      // best deal: biggest discount first; properties with no offers go last
      return (a.gap == null) - (b.gap == null) || (a.gap ?? 0) - (b.gap ?? 0) || a.asset.name.localeCompare(b.asset.name);
    });
  const noOffers = deals.filter((d) => !d.offers.length).length;
  const field = "rounded-xl border border-[#1b2440] bg-[#0e1426] px-3 py-2 text-sm text-white outline-none focus:border-indigo-500";

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <label className="relative flex-1">
          <span className="sr-only">Search properties</span>
          <Search className="w-4 h-4 text-[#98a2c3] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or location" className={`${field} w-full pl-10`} />
        </label>
        <select aria-label="Property type" value={type} onChange={(e) => setType(e.target.value)} className={field}>
          <option value="">All types</option>
          {types.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className={field}>
          {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={onlyDeals} onClick={() => setOnlyDeals((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-sm font-semibold ${onlyDeals ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300" : "border-[#1b2440] text-[#98a2c3] hover:text-white"}`}>
          <Percent className="w-3.5 h-3.5" />Below approved price
        </button>
        {noOffers > 0 && (
          <button type="button" aria-pressed={showAll} onClick={() => setShowAll((v) => !v)}
            className={`px-3.5 py-1.5 rounded-full border text-sm font-semibold ${showAll ? "border-indigo-500/60 bg-indigo-500/15 text-indigo-300" : "border-[#1b2440] text-[#98a2c3] hover:text-white"}`}>
            {showAll ? "Hide" : "Show"} {noOffers} not for sale
          </button>
        )}
        <span className="ml-auto text-sm text-[#98a2c3]">{shown.length} {shown.length === 1 ? "property" : "properties"}</span>
      </div>

      {error && <p role="alert" className="text-sm text-amber-300">{error} <button type="button" onClick={onRetry} className="underline">Retry</button></p>}
      {loading ? <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[26rem] rounded-2xl" />)}</div>
        : !shown.length ? <Card><p className="text-sm text-[#98a2c3]">{deals.length ? "No properties match. Try clearing a filter." : "No tokenized properties are listed yet."}</p></Card>
        : <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">{shown.map((d) => <DealCard key={d.asset.tokenId} d={d} formatMUSD={formatMUSD} />)}</div>}
    </div>
  );
}

// Best deals: every open offer ranked by how far under the approved price it is.
export function BestDeals({ assets, offers, reference, loading }) {
  const { formatMUSD, convert } = useCurrency();
  const byToken = useMemo(() => new Map(assets.map((a) => [Number(a.tokenId), a])), [assets]);
  const rows = useMemo(() => offers.map((o) => {
    const a = byToken.get(Number(o.assetId));
    const refLkr = reference[Number(o.assetId)];
    const approved = refLkr != null ? convert(refLkr, "LKR", "USD") : null;
    return { o, a, approved, gap: approved ? o.pricePerTokenFormatted / approved - 1 : null };
  }).filter((r) => r.a).sort((x, y) => (x.gap == null) - (y.gap == null) || (x.gap ?? 0) - (y.gap ?? 0) || x.o.pricePerTokenFormatted - y.o.pricePerTokenFormatted), [offers, byToken, reference, convert]);

  if (loading) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>;
  if (!rows.length) return <Card><p className="text-sm text-[#98a2c3]">No offers are open right now.</p></Card>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-[#98a2c3]">Every open offer, cheapest compared with its approved value first.</p>
      <ul className="space-y-3">
        {rows.map(({ o, a, approved, gap }, i) => {
          const g = gapInfo(gap);
          return (
            <li key={o.listingId} className="rounded-2xl border border-[#1b2440] bg-[#0b1124] p-4 flex flex-wrap items-center gap-x-6 gap-y-3">
              <span className="w-8 text-center text-lg font-bold text-[#98a2c3] tabular-nums">{i + 1}</span>
              <div className="flex items-center gap-3 min-w-0 flex-1 basis-56">
                {a.imageUrl ? <img src={a.imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" /> : <span className="w-14 h-14 rounded-xl bg-[#141c33] shrink-0" />}
                <div className="min-w-0">
                  <Link to={`/marketplace/assets/${a.assetId}`} className="block font-semibold text-white truncate hover:text-indigo-300">{a.name}</Link>
                  <div className="mt-1"><SellerTag kind={sellerKind(o, a.ownerWallet)} /></div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-white tabular-nums">{formatMUSD(o.pricePerTokenFormatted)}</p>
                <p className="text-xs font-semibold" style={{ color: g.color }}>{gap == null ? "—" : g.label}</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-white tabular-nums">{Number(o.amount).toLocaleString()} tokens</p>
                <p className="text-xs text-[#98a2c3]">{approved != null ? `approved ${formatMUSD(approved)}` : ""}</p>
              </div>
              <Link to={`/marketplace/assets/${a.assetId}`} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white"><ShoppingBag size={15} />Buy</Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// My purchases: tokens this wallet bought, read from the blockchain.
export function MyPurchases({ wallet, trades, error, loading }) {
  const { formatMUSD } = useCurrency();
  if (!wallet) return <Card><p className="text-sm text-[#98a2c3]">Connect your wallet to see what you have bought.</p></Card>;
  if (loading || trades == null) return <Skeleton className="h-48 rounded-2xl" />;
  const bought = trades.filter((t) => t.side === "Bought");
  const spent = bought.reduce((s, t) => s + t.total, 0);
  const tokens = bought.reduce((s, t) => s + t.amount, 0);
  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
      <div className="grid grid-cols-3 gap-3">
        {[["Purchases", bought.length.toLocaleString()], ["Tokens bought", tokens.toLocaleString()], ["Total spent", formatMUSD(spent)]].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-[#1b2440] bg-[#0b1124] px-4 py-3"><p className="text-xs text-[#98a2c3]">{k}</p><p className="mt-1 text-xl font-bold text-white tabular-nums">{v}</p></div>
        ))}
      </div>
      {!bought.length ? (
        <Card><p className="text-sm text-[#98a2c3]">You haven't bought any tokens yet. Open <b className="text-white">Browse</b> to find a property.</p></Card>
      ) : (
        <div className="rounded-2xl border border-[#1b2440] bg-[#0b1124] overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-[#98a2c3] border-b border-[#1b2440]"><th className="px-5 py-3">Date</th><th className="px-5 py-3">Property</th><th className="px-5 py-3 text-right">Tokens</th><th className="px-5 py-3 text-right">Price / token</th><th className="px-5 py-3 text-right">You paid</th></tr></thead>
            <tbody>
              {bought.map((t) => (
                <tr key={`${t.txHash}-${t.listingId}`} className="border-b border-[#1b2440] last:border-0 hover:bg-[#0e1426]">
                  <td className="px-5 py-3 text-[#c3cae2] whitespace-nowrap">{t.at.toLocaleDateString()}</td>
                  <td className="px-5 py-3 font-semibold text-white">{t.name}</td>
                  <td className="px-5 py-3 text-right text-white tabular-nums">{t.amount.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right text-[#c3cae2] tabular-nums">{formatMUSD(t.amount ? t.total / t.amount : 0)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-white tabular-nums">{formatMUSD(t.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
