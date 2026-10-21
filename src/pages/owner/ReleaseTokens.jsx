import { useMemo } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Building2, MapPin, ArrowRight, Coins, Layers, Tag, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCurrency } from "../../context/CurrencyContext";
import { resolveUserWallet } from "../../lib/walletResolver";
import { useMarketplaceData, isActiveOffer } from "../../lib/marketplaceData";
import { useAllTrades } from "../../lib/useAllTrades";
import { tradesByToken, summarize, arrowOf, pctText, dirOf } from "../../lib/marketStats";
import Sparkline from "../../components/market/Sparkline";
import { AssetPhoto } from "../../components/AssetExplorer";
import { Card, Stat, PageHeader, ActionButton, Skeleton, pageClass } from "../../components/ui/dash";

const TONE = { up: "var(--up)", down: "var(--down)", flat: "var(--ink-3)" };

// Every property the signed-in owner has tokenized, each with its price chart and release
// progress. Choosing one opens that property's own release page.
export default function ReleaseTokens() {
  const { user } = useAuth();
  const wallet = resolveUserWallet(user);
  const { formatMUSD, convert } = useCurrency();
  const [params] = useSearchParams();
  const data = useMarketplaceData({ wallet });
  const { assets, listings, reference, assetsLoading, listingsLoading, assetsError, reload } = data;
  const offersKey = listings.map((l) => `${l.listingId}:${l.amount}:${l.status}`).join(",");
  const market = useAllTrades(offersKey);

  const rows = useMemo(() => {
    const byToken = tradesByToken(market.trades || []);
    return assets
      .filter((a) => wallet && (a.ownerWallet || "").toLowerCase() === wallet)
      .map((a) => {
        const held = a.ownership?.viewerBalance || 0;
        const mine = listings.filter((o) => Number(o.assetId) === Number(a.tokenId) && wallet && o.seller.toLowerCase() === wallet && isActiveOffer(o));
        const released = mine.reduce((s, o) => s + Number(o.amount), 0);
        const list = byToken.get(Number(a.tokenId)) || [];
        const refLkr = reference[Number(a.tokenId)];
        return {
          asset: a, held, released, free: Math.max(0, held - released), supply: Number(a.totalShares) || 0,
          s: summarize(list), spark: list.slice(-24).map((t) => t.price),
          approved: refLkr != null ? convert(refLkr, "LKR", "USD") : null,
        };
      });
  }, [assets, listings, reference, market.trades, wallet, convert]);

  // Older links used /owner/release?asset=<token id>; send them to the property's page.
  const legacy = params.get("asset");
  if (legacy) return <Navigate to={`/owner/release/${legacy}`} replace />;

  const loading = assetsLoading || listingsLoading;
  const totalFree = rows.reduce((s, r) => s + r.free, 0);
  const totalReleased = rows.reduce((s, r) => s + r.released, 0);
  const v = (x) => (loading ? "…" : x);

  return (
    <div className={pageClass}>
      <PageHeader
        title="Release tokens"
        subtitle="Your tokenized properties and how their prices are moving. Choose one to put some of its tokens on the marketplace."
        actions={<ActionButton onClick={reload} icon={RefreshCw}>Refresh</ActionButton>}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Stat icon={Building2} label="Tokenized properties" value={v(rows.length)} />
        <Stat icon={Coins} label="Free to release" value={v(totalFree.toLocaleString())} note="Tokens in your wallet not yet on sale" />
        <Stat icon={Tag} label="Released for sale" value={v(totalReleased.toLocaleString())} note="Open offers right now" />
        <Stat icon={Layers} label="Traded so far" value={v(rows.reduce((s, r) => s + r.s.count, 0).toLocaleString())} note="Completed purchases" />
      </div>

      {(assetsError || market.error) && (
        <p role="alert" className="text-sm text-amber-300 flex flex-wrap gap-2">{assetsError || market.error}<button onClick={reload} className="underline">Retry</button></p>
      )}

      {!wallet ? (
        <Card title="Connect your wallet first" subtitle="Tokens are released from the wallet saved on your account." />
      ) : loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-96 rounded-2xl" />)}</div>
      ) : !rows.length ? (
        <Card title="No tokenized properties yet" subtitle="Tokenize one of your approved properties first, then come back to release its tokens.">
          <ActionButton to="/verified-assets" primary icon={Coins}>Tokenize a property</ActionButton>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {rows.map(({ asset, held, released, free, supply, s, spark, approved }) => {
            const dir = dirOf(s.change);
            const c = TONE[dir];
            const to = `/owner/release/${asset.tokenId}`;
            const pc = (n) => (supply > 0 ? (n / supply) * 100 : 0);
            return (
              <article key={asset.tokenId} className="group rounded-2xl border border-[#1b2440] bg-[#0b1124] overflow-hidden flex flex-col" style={{ borderTop: `3px solid ${c}` }}>
                <Link to={to} aria-label={`Release tokens of ${asset.name}`} className="relative block">
                  <AssetPhoto asset={asset} />
                  <span className="absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-bold backdrop-blur-md bg-black/60" style={{ color: c, border: `1px solid color-mix(in srgb, ${c} 55%, transparent)` }}>
                    {s.change != null ? `${arrowOf(s.change)} ${pctText(s.change)}` : "No trades yet"}
                  </span>
                </Link>
                <div className="p-5 flex flex-col gap-4 flex-1">
                  <div className="min-w-0">
                    <Link to={to} className="block font-bold text-lg text-white truncate hover:text-indigo-300">{asset.name}</Link>
                    <p className="flex items-center gap-1.5 text-sm text-[#98a2c3] mt-0.5"><MapPin size={14} className="shrink-0" /><span className="truncate">{asset.location || "Location not provided"}</span></p>
                  </div>

                  {/* price chart */}
                  <div className="rounded-xl bg-[#0e1426] px-4 py-3">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-[#98a2c3]">{s.last != null ? "Last price" : "Approved price"}</p>
                        <p className="text-xl font-bold text-white tabular-nums leading-tight">{s.last != null ? formatMUSD(s.last) : approved != null ? formatMUSD(approved) : "—"}</p>
                      </div>
                      <Sparkline prices={spark} width={150} height={46} />
                    </div>
                    {s.count > 0 && <p className="mt-1.5 text-xs text-[#98a2c3]">{s.count} {s.count === 1 ? "trade" : "trades"} · range {formatMUSD(s.low)} – {formatMUSD(s.high)}</p>}
                  </div>

                  {/* release progress */}
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#98a2c3]">Released for sale</span>
                      <span className="font-semibold text-white tabular-nums">{released.toLocaleString()} <span className="font-normal text-[#98a2c3]">· {pc(released).toFixed(1)}%</span></span>
                    </div>
                    <div role="img" aria-label={`${pc(released).toFixed(1)} percent released`} className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-[#3f4045]">
                      <div style={{ width: `${pc(released)}%`, background: "#fbbf24" }} />
                      <div style={{ width: `${pc(free)}%`, background: "#38bdf8" }} />
                    </div>
                    <p className="mt-1.5 text-xs text-[#98a2c3]"><span className="text-sky-300">{free.toLocaleString()}</span> free to release · {supply.toLocaleString()} tokens in total</p>
                  </div>

                  <Link to={to} className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-sm font-semibold text-white">
                    {free > 0 ? "Release tokens" : "View"} <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
