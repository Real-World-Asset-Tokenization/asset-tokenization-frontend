import { useCurrency } from "../context/CurrencyContext";
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Building2, ArrowRight, MapPin, Search, ChevronRight } from "lucide-react";
import { tokenAllocation, tokensForPercent } from "../lib/tokenAllocation";
import { isActiveOffer, sellerKind } from "../lib/marketplaceData";
import { Badge, SellerTag, cardClass } from "./ui/dash";
import ValuationPanel from "./ValuationPanel";
import PriceHistoryChart from "./PriceHistoryChart";
import MarketPanel from "./market/MarketPanel";
import PropertyCover from "./market/PropertyCover";

const activeOffers = (asset, listings) => listings.filter((o) => Number(o.assetId) === Number(asset.tokenId) && isActiveOffer(o));
const inputCls = "px-3.5 py-2.5 rounded-xl border border-[#1b2440] bg-[#0b1124] text-white outline-none focus:border-indigo-500";

export function AssetPhoto({ asset, large = false }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-[#141c33] via-indigo-950 to-[#070b18] ${large ? "h-64 sm:h-96" : "h-48"}`}>
      {asset.imageUrl && !failed
        ? <img src={asset.imageUrl} onError={() => setFailed(true)} alt={asset.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        : <PropertyCover asset={asset} className="absolute inset-0" />}
    </div>
  );
}

// Properties that have at least one open sale offer right now.
export function InvestorCatalog({ assets, listings, loadingOffers, offersError, reference = {}, wallet }) {
  const { formatMUSD, convert } = useCurrency();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") || "");
  useEffect(() => { setSearch(params.get("q") || ""); }, [params]);
  const [type, setType] = useState("");
  const [sort, setSort] = useState("name");
  const available = (asset) => (!loadingOffers && !offersError ? activeOffers(asset, listings) : []);
  const lowest = (asset) => Math.min(...available(asset).map((o) => o.pricePerTokenFormatted));
  const forSale = assets.filter((a) => available(a).length > 0);
  const types = [...new Set(forSale.map((a) => a.propertyType || a.assetType).filter(Boolean))];
  const filtered = forSale
    .filter((a) => `${a.name} ${a.location}`.toLowerCase().includes(search.toLowerCase()) && (!type || (a.propertyType || a.assetType) === type))
    .sort((a, b) => (sort === "price" ? lowest(a) - lowest(b) : a.name.localeCompare(b.name)));

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row gap-3">
        <label className="relative flex-1">
          <span className="sr-only">Search properties</span>
          <Search className="w-4 h-4 text-[#6b7599] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or location" className={`${inputCls} w-full pl-10`} />
        </label>
        <select aria-label="Property type" value={type} onChange={(e) => setType(e.target.value)} className={`${inputCls} md:w-56`}>
          <option value="">All property types</option>
          {types.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className={`${inputCls} md:w-48`}>
          <option value="name">Sort by name</option>
          <option value="price">Lowest token price</option>
        </select>
      </div>

      {offersError && <p role="alert" className="text-amber-300 text-sm">Sale offers could not be loaded from the blockchain. Refresh to try again.</p>}
      {loadingOffers ? <p className="py-12 text-center text-[#98a2c3]">Loading properties for sale…</p> : !offersError && !filtered.length ? (
        <div className={`${cardClass} py-14 text-center`}>
          <Building2 className="w-10 h-10 text-[#29345a] mx-auto mb-3" />
          <p className="text-[#98a2c3]">{forSale.length ? "No properties for sale match these filters." : "No property tokens are for sale right now. Check back later."}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-[#98a2c3]">{filtered.length} {filtered.length === 1 ? "property" : "properties"} for sale</p>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((asset) => {
              const offers = available(asset);
              const tokens = offers.reduce((s, o) => s + Number(o.amount), 0);
              const ref = reference[Number(asset.tokenId)];
              const mine = wallet ? offers.filter((o) => o.seller.toLowerCase() === wallet.toLowerCase()).length : 0;
              return (
                <article key={asset.tokenId} className={`group ${cardClass} overflow-hidden flex flex-col hover:border-indigo-500/60 transition-colors`}>
                  <Link to={`/marketplace/assets/${asset.assetId}`} aria-label={`View ${asset.name}`} className="relative block">
                    <AssetPhoto asset={asset} />
                    <span className="absolute top-3 left-3 flex gap-1.5"><Badge tone="good">{offers.length} {offers.length === 1 ? "offer" : "offers"}</Badge>{mine > 0 && <Badge tone="warn">{mine === offers.length ? "Your offer" : `${mine} yours`}</Badge>}</span>
                  </Link>
                  <div className="p-5 flex flex-col gap-4 flex-1">
                    <div>
                      <Link to={`/marketplace/assets/${asset.assetId}`} className="font-bold text-lg text-white hover:text-indigo-300">{asset.name}</Link>
                      <p className="flex gap-1.5 text-sm text-[#98a2c3] mt-1"><MapPin size={15} className="shrink-0 mt-0.5" /><span className="line-clamp-1">{asset.location || "Location not provided"}</span></p>
                    </div>
                    <dl className="grid grid-cols-3 gap-2 border-y border-[#1b2440] py-3 text-sm">
                      <div><dt className="text-[11px] uppercase tracking-wide text-[#6b7599]">From</dt><dd className="font-bold text-white mt-0.5">{formatMUSD(lowest(asset))}</dd></div>
                      <div><dt className="text-[11px] uppercase tracking-wide text-[#6b7599]">Approved</dt><dd className="text-[#c3cae2] mt-0.5">{ref != null ? formatMUSD(convert(ref, "LKR", "USD")) : "—"}</dd></div>
                      <div><dt className="text-[11px] uppercase tracking-wide text-[#6b7599]">On offer</dt><dd className="text-[#c3cae2] mt-0.5">{tokens.toLocaleString()}</dd></div>
                    </dl>
                    <p className="text-xs text-[#98a2c3] -mt-1">{offers.filter((o) => sellerKind(o, asset.ownerWallet) === "owner").length} from the owner · {offers.filter((o) => sellerKind(o, asset.ownerWallet) === "investor").length} from investors</p>
                    <Link to={`/marketplace/assets/${asset.assetId}`} className="mt-auto flex justify-center items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 font-semibold text-sm text-white">View &amp; buy<ArrowRight size={16} /></Link>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function PurchaseOffer({ offer, kind, best, totalSupply, account, buying, onBuy }) {
  const { formatMUSD } = useCurrency();
  const [quantity, setQuantity] = useState(Number(offer.amount));
  const isSeller = account && offer.seller.toLowerCase() === account.toLowerCase();
  const percent = totalSupply > 0 ? (quantity / totalSupply) * 100 : 0;
  const maxPercent = totalSupply > 0 ? (Number(offer.amount) / totalSupply) * 100 : 0;
  const valid = Number.isSafeInteger(quantity) && quantity > 0 && quantity <= Number(offer.amount);
  return (
    <div className="rounded-xl border border-[#1b2440] bg-[#0e1426] p-4 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <div>
          <p className="text-xs text-[#98a2c3]">Offer #{offer.listingId} · price per token</p>
          <p className="text-2xl font-bold text-white tabular-nums leading-tight">{formatMUSD(offer.pricePerTokenFormatted)}</p>
        </div>
        {isSeller
          ? <Link to="/marketplace?tab=mine" className="rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">Your offer · manage</Link>
          : best && <span className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ color: "var(--up)", borderColor: "color-mix(in srgb, var(--up) 50%, transparent)", background: "color-mix(in srgb, var(--up) 12%, transparent)" }}>Best price</span>}
      </div>
      <p className="text-white"><b>{Number(offer.amount).toLocaleString()}</b> tokens available <span className="text-[#98a2c3] text-sm">· {maxPercent.toFixed(2)}% of the property</span></p>
      <input aria-label={`Token quantity slider for offer ${offer.listingId}`} type="range" min="1" max={Number(offer.amount)} step="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full accent-indigo-500" />
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs text-[#98a2c3]">Tokens
          <input aria-label={`Tokens to buy from offer ${offer.listingId}`} type="number" min="1" max={Number(offer.amount)} step="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-[#1b2440] bg-[#070b18] p-2 text-white" />
        </label>
        <label className="block text-xs text-[#98a2c3]">% of property
          <input aria-label={`Asset percentage for offer ${offer.listingId}`} type="number" min="0" max={maxPercent} step="any" value={Number(percent.toFixed(4))} onChange={(e) => setQuantity(tokensForPercent(totalSupply, e.target.value))} className="mt-1 w-full rounded-lg border border-[#1b2440] bg-[#070b18] p-2 text-white" />
        </label>
      </div>
      {!valid && <p className="text-xs text-rose-300">Choose a whole number between 1 and {Number(offer.amount).toLocaleString()}.</p>}
      <div className="flex justify-between border-t border-[#1b2440] pt-3"><span className="text-[#98a2c3]">Total</span><strong className="text-emerald-300">{formatMUSD(Math.max(0, quantity) * offer.pricePerTokenFormatted, { showCode: true })}</strong></div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#98a2c3]">
        <SellerTag kind={kind} mine={isSeller} />
        <span className="font-mono">{offer.seller.slice(0, 6)}…{offer.seller.slice(-4)}</span>
        <span>· {offer.expiresAt ? `expires ${new Date(offer.expiresAt * 1000).toLocaleDateString()}` : "no expiry"}</span>
      </p>
      <button onClick={() => onBuy({ ...offer, amount: quantity, availableAmount: Number(offer.amount) })} disabled={buying || Boolean(isSeller) || !valid}
        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-white">
        {isSeller ? "Your own offer" : `Buy ${valid ? quantity.toLocaleString() : ""} tokens`}
      </button>
    </div>
  );
}

export function AssetDetail({ asset, listings, loadingOffers, offersError, account, buying, onBuy, onRetry, reference = {} }) {
  const { formatMUSD, convert } = useCurrency();
  const [sellerFilter, setSellerFilter] = useState("all");
  const offers = offersError || loadingOffers ? [] : activeOffers(asset, listings);
  const kindOf = (o) => sellerKind(o, asset.ownerWallet);
  const byPrice = [...offers].sort((a, b) => a.pricePerTokenFormatted - b.pricePerTokenFormatted);
  const fromOwner = byPrice.filter((o) => kindOf(o) === "owner");
  const fromInvestors = byPrice.filter((o) => kindOf(o) === "investor");
  const shownOffers = sellerFilter === "owner" ? fromOwner : sellerFilter === "investor" ? fromInvestors : byPrice;
  const SELLER_FILTERS = [["all", "All", byPrice.length], ["owner", "From the owner", fromOwner.length], ["investor", "From investors", fromInvestors.length]];
  const allocation = tokenAllocation(asset, listings);
  const viewer = asset.ownership?.viewerBalance;
  const lowestAsk = offers.length ? Math.min(...offers.map((o) => o.pricePerTokenFormatted)) : null;
  const refLkr = reference[Number(asset.tokenId)];
  const approvedUsd = refLkr != null ? convert(refLkr, "LKR", "USD") : null;
  const onOffer = offers.reduce((s, o) => s + Number(o.amount), 0);
  // Gap vs approved follows the price rule: above = green ▲, below = red ▼, level = grey.
  const gap = lowestAsk != null && approvedUsd ? (lowestAsk / approvedUsd - 1) * 100 : null;
  const gapColor = gap == null ? "var(--ink-3)" : Math.abs(gap) < 1 ? "var(--ink-2)" : gap < 0 ? "var(--down)" : "var(--up)";
  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-[#98a2c3]">
        <Link to="/marketplace" className="hover:text-white">Marketplace</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-white truncate">{asset.name}</span>
      </nav>
      <section className={`${cardClass} overflow-hidden grid md:grid-cols-[300px_1fr]`}>
        <div className="group"><AssetPhoto key={asset.assetId} asset={asset} /></div>
        <div className="p-5 sm:p-6 flex flex-col gap-5 min-w-0">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{asset.name}</h1>
              <Badge tone="muted">Token #{asset.tokenId}</Badge>
              {viewer > 0 && <Badge tone="brand">You hold {viewer.toLocaleString()}</Badge>}
            </div>
            <p className="text-[#98a2c3] mt-2 flex items-center gap-2"><MapPin size={16} className="shrink-0" /><span className="truncate">{asset.location || "Location not provided"}</span></p>
          </div>
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-[#0e1426] px-4 py-3">
              <dt className="text-xs text-[#98a2c3]">Lowest price</dt>
              <dd className="mt-1 text-xl font-bold text-white tabular-nums">{lowestAsk != null ? formatMUSD(lowestAsk) : "None"}</dd>
              {gap != null && <dd className="text-xs font-semibold mt-0.5" style={{ color: gapColor }}>{gap <= 0 ? "▼" : "▲"} {Math.abs(gap).toFixed(1)}% {gap <= 0 ? "below" : "above"} approved</dd>}
            </div>
            <div className="rounded-xl bg-[#0e1426] px-4 py-3">
              <dt className="text-xs text-[#98a2c3]">Approved value</dt>
              <dd className="mt-1 text-xl font-bold text-white tabular-nums">{approvedUsd != null ? formatMUSD(approvedUsd) : "—"}</dd>
              <dd className="text-xs text-[#98a2c3] mt-0.5">per token</dd>
            </div>
            <div className="rounded-xl bg-[#0e1426] px-4 py-3">
              <dt className="text-xs text-[#98a2c3]">Released for sale</dt>
              <dd className="mt-1 text-xl font-bold text-white tabular-nums">{onOffer.toLocaleString()} <span className="text-sm font-medium text-[#98a2c3]">tokens</span></dd>
              <dd className="text-xs mt-0.5 tabular-nums"><strong style={{ color: "var(--up)" }}>{Number(asset.totalShares) > 0 ? (onOffer / Number(asset.totalShares) * 100).toFixed(2) : "0.00"}%</strong> <span className="text-[#98a2c3]">of the property</span></dd>
              <dd className="text-xs text-[#98a2c3] mt-0.5">{fromOwner.length} from the owner · {fromInvestors.length} from investors</dd>
            </div>
            <div className="rounded-xl bg-[#0e1426] px-4 py-3">
              <dt className="text-xs text-[#98a2c3]">Total tokens</dt>
              <dd className="mt-1 text-xl font-bold text-white tabular-nums">{Number(asset.totalShares).toLocaleString()}</dd>
              <dd className="text-xs text-[#98a2c3] mt-0.5">{(asset.propertyType || asset.assetType || "property").replace(/_/g, " ")}</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="grid xl:grid-cols-[1fr_400px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {!loadingOffers && !offersError && (
            <MarketPanel asset={asset} listings={listings} referenceLKR={reference[Number(asset.tokenId)]} wallet={account} />
          )}
          <div className="grid gap-4">
            <div className={`${cardClass} overflow-hidden h-60`}>
              {asset.location
                ? <iframe title={`Map of ${asset.location}`} src={`https://maps.google.com/maps?q=${encodeURIComponent(asset.location)}&z=14&output=embed`} className="w-full h-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                : <div className="h-full flex items-center justify-center text-[#6b7599] text-sm">No location provided</div>}
            </div>
          </div>

          <section className={`${cardClass} p-5 sm:p-6`}>
            <h2 className="text-lg font-bold text-white mb-3">About this property</h2>
            <p className="text-[#c3cae2] leading-relaxed">{asset.description || "The owner has not added a description."}</p>
            <dl className="grid sm:grid-cols-2 gap-x-10 mt-4 text-sm">
              <div className="flex justify-between py-2.5 border-b border-[#1b2440]"><dt className="text-[#98a2c3]">Property type</dt><dd className="text-white capitalize">{(asset.propertyType || asset.assetType || "—").replace(/_/g, " ")}</dd></div>
              <div className="flex justify-between py-2.5 border-b border-[#1b2440]"><dt className="text-[#98a2c3]">Total tokens</dt><dd className="text-white">{Number(asset.totalShares).toLocaleString()}</dd></div>
              <div className="flex justify-between py-2.5 border-b border-[#1b2440] sm:col-span-2 gap-4"><dt className="text-[#98a2c3]">Issuer wallet</dt><dd className="text-white font-mono text-xs break-all text-right">{asset.ownerWallet}</dd></div>
            </dl>
          </section>

          <PriceHistoryChart tokenId={asset.tokenId} supply={asset.totalShares} title="Approved value vs. trade price" />

          <ValuationPanel assetId={asset.tokenId} balance={viewer ?? null} title="Approved valuation & reference price" />

          <section className={`${cardClass} p-5 sm:p-6`}>
            <h2 className="text-lg font-bold text-white mb-4">Who holds the tokens</h2>
            {allocation ? (
              <div className="space-y-3 text-sm">
                <div role="img" aria-label="Share of tokens held by the issuer and by investors" className="h-3 rounded-full overflow-hidden bg-[#3f4045] flex">
                  <div className="h-full" style={{ background: "#38bdf8", width: `${allocation.percent(allocation.ownerBalance)}%` }} />
                  <div className="h-full" style={{ background: "#1fe06f", width: `${allocation.percent(allocation.otherHolders)}%` }} />
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-[#c3cae2]">
                  <span><span aria-hidden className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ background: "#38bdf8" }} />Issuer {allocation.percent(allocation.ownerBalance)}% · {allocation.ownerBalance.toLocaleString()}</span>
                  <span><span aria-hidden className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ background: "#1fe06f" }} />Investors {allocation.percent(allocation.otherHolders)}% · {allocation.otherHolders.toLocaleString()}</span>
                </div>
                {viewer != null && viewer > 0 && <p className="text-white font-semibold">You hold {allocation.percent(viewer)}% · {viewer.toLocaleString()} tokens</p>}
                <p className="text-xs text-[#6b7599]">Tokens listed for sale stay in the seller's wallet until bought.</p>
              </div>
            ) : <p className="text-[#98a2c3] text-sm">Live ownership is unavailable.</p>}
          </section>
        </div>

        <aside className={`${cardClass} p-5 sm:p-6 space-y-4 xl:sticky xl:top-24`}>
          <div>
            <h2 className="text-lg font-bold text-white">Buy tokens</h2>
            <p className="text-sm text-[#98a2c3]">Pick an offer, choose how many tokens, then confirm with your wallet.</p>
          </div>
          {loadingOffers ? <p role="status" className="text-sm text-[#98a2c3]">Loading sale offers…</p>
            : offersError ? <div role="alert" className="text-sm"><p className="text-amber-300">Unable to load offers.</p><button onClick={onRetry} className="mt-2 text-indigo-300 underline">Retry</button></div>
            : !offers.length ? <div className="rounded-xl border border-[#1b2440] bg-[#0e1426] p-4"><p className="font-semibold text-white">Nothing for sale right now</p><p className="text-sm text-[#98a2c3] mt-1">A token holder needs to create a sale offer first.</p></div>
            : <>
                <p className="text-sm text-[#98a2c3]">Tokens are sold by the property owner and by other investors reselling theirs.</p>
                <div role="group" aria-label="Filter offers by seller" className="flex flex-wrap gap-2">
                  {SELLER_FILTERS.map(([k, label, n]) => (
                    <button key={k} type="button" aria-pressed={sellerFilter === k} onClick={() => setSellerFilter(k)}
                      className={`px-3 py-1.5 rounded-full border text-sm font-semibold ${sellerFilter === k ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300" : "border-[#1b2440] text-[#98a2c3] hover:text-white"}`}>
                      {label} <span className="opacity-80">({n})</span>
                    </button>
                  ))}
                </div>
                {!shownOffers.length
                  ? <p className="rounded-xl border border-[#1b2440] bg-[#0e1426] p-4 text-sm text-[#98a2c3]">No offers from {sellerFilter === "owner" ? "the owner" : "investors"} right now.</p>
                  : shownOffers.map((offer) => <PurchaseOffer key={`${offer.listingId}-${offer.amount}`} offer={offer} kind={kindOf(offer)} best={offer.listingId === byPrice[0].listingId} totalSupply={Number(asset.totalShares)} account={account} buying={buying} onBuy={onBuy} />)}
              </>}
          <p className="text-xs text-[#6b7599]">Checkout uses demo mUSD tokens, not real cash. Network gas is paid separately.</p>
        </aside>
      </div>
    </div>
  );
}
