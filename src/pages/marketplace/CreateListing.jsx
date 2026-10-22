import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ethers } from "ethers";
import { ChevronRight, Building2, CheckCircle2, AlertTriangle, Wallet, ArrowRight, Info, MapPin } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCurrency } from "../../context/CurrencyContext";
import { resolveUserWallet } from "../../lib/walletResolver";
import { useMarketplaceData, isActiveOffer } from "../../lib/marketplaceData";
import { getContracts, trackTxGas } from "../../services/contractService";
import { ordersAPI } from "../../lib/api";
import { loadTradeHistory } from "../../services/tokenSales";
import { arrowOf, pctText, dirOf } from "../../lib/marketStats";
import StockChart from "../../components/market/StockChart";
import { Card, Skeleton, Badge, pageClass, fmtDate } from "../../components/ui/dash";

const PRICE_WARNING_RATIO = 0.5;
const DURATIONS = [7, 30, 60, 90];
// Allocation colours must stay distinct from each other (green is the action colour, so "kept" uses sky).
const ALLOC = { already: "#fbbf24", now: "#1fe06f", kept: "#38bdf8", others: "#3f4045" };
const inputCls = "w-full px-4 py-3 rounded-xl border border-[#1b2440] bg-[#0e1426] text-white text-lg font-semibold tabular-nums outline-none focus:border-indigo-500";
const chip = "px-3.5 py-1.5 rounded-full border text-sm font-semibold border-[#1b2440] bg-[#0e1426] text-[#c3cae2] hover:text-white hover:border-[#29345a] disabled:opacity-40 disabled:cursor-not-allowed";

// Wording for the two ways into this page: any holder creating a sale offer, or an
// owner releasing tokens of their own tokenized asset right after tokenization.
const COPY = {
  sell: {
    crumbs: [["/marketplace", "Marketplace"]], here: "Sell tokens", title: "Sell your tokens",
    intro: "Pick a property, choose how many tokens to sell and set a price. Your tokens stay in your wallet until someone buys them.",
    pick: "Choose a property", pickSub: "Properties where your wallet holds tokens.",
    none: "Your wallet does not hold any property tokens on the current blockchain.",
    summary: "Your offer", submit: "Publish offer", done: "is live", verb: "sell", past: "offered",
  },
  release: {
    crumbs: [["/owner/assets", "My assets"], ["/owner/release", "Release tokens"]], here: "Release", title: "Release tokens to the marketplace",
    intro: "Choose how many of your property's tokens investors can buy and set the price. Released tokens stay in your wallet until someone buys them.",
    pick: "Choose a property", pickSub: "Your tokenized properties.",
    none: "You have no tokenized properties with tokens in your wallet yet.",
    summary: "Your release", submit: "Release tokens", done: "released to the marketplace", verb: "release", past: "released",
  },
};

// Full-page flow to put tokens you hold up for sale. Tokens stay in your wallet
// (non-custodial) until a buyer completes the purchase.
export default function CreateListing({ mode = "sell" }) {
  const copy = COPY[mode] || COPY.sell;
  const release = mode === "release";
  const { user } = useAuth();
  const wallet = resolveUserWallet(user);
  const { formatLKR, formatMUSD, convert } = useCurrency();
  const [params, setParams] = useSearchParams();
  const { assetId: routeAsset } = useParams();
  const navigate = useNavigate();
  const { assets, listings, reference, feeBps, assetsLoading, listingsLoading, assetsError, listingsError, reload } = useMarketplaceData({ wallet });

  // Tokens this wallet can still offer: balance minus what is already in its active offers.
  const sellable = useMemo(() => assets
    .filter((a) => (a.ownership?.viewerBalance || 0) > 0)
    // Release mode: only assets this wallet issued (the owner's own tokenized assets).
    .filter((a) => !release || (wallet && (a.ownerWallet || "").toLowerCase() === wallet))
    .map((a) => {
      const offered = listings.filter((o) => Number(o.assetId) === Number(a.tokenId) && wallet && o.seller.toLowerCase() === wallet && isActiveOffer(o))
        .reduce((s, o) => s + Number(o.amount), 0);
      return { ...a, held: a.ownership.viewerBalance, offered, free: Math.max(0, a.ownership.viewerBalance - offered) };
    }), [assets, listings, wallet, release]);

  const [tokenId, setTokenIdState] = useState(routeAsset || params.get("asset") || "");
  // Release has one page per property, so switching property changes the address.
  const setTokenId = (id) => { setTokenIdState(id); if (release && id) navigate(`/owner/release/${id}`, { replace: true }); };
  useEffect(() => { if (routeAsset) setTokenIdState(routeAsset); }, [routeAsset]);
  const asset = sellable.find((a) => String(a.tokenId) === String(tokenId));
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState(30);
  const [priceMode, setPriceMode] = useState("approved"); // "approved" | "custom"
  // Sign the offer off-chain instead of publishing it as a transaction: no listing gas for the seller.
  const [gasless, setGasless] = useState(true);
  const [trades, setTrades] = useState(null);
  const [step, setStep] = useState(""); // "" | "approve" | "list" | "done"
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const refLkr = asset ? reference[Number(asset.tokenId)] : null;
  const refUsd = refLkr != null ? Number(convert(refLkr, "LKR", "USD").toFixed(2)) : null;
  const assetValuation = Number(asset?.valuationLKR ?? asset?.valuation ?? 0);

  // Pick the first sellable asset, and default the price to the approved reference price.
  useEffect(() => { if (!tokenId && sellable.length) setTokenId(String(sellable[0].tokenId)); }, [sellable, tokenId]);
  useEffect(() => { setPrice(refUsd != null ? String(refUsd) : ""); setPriceMode(refUsd != null ? "approved" : "custom"); }, [tokenId, refUsd]);
  // Trade history feeds the price chart; it reloads when the property or its offers change.
  const offersKey = listings.map((l) => `${l.listingId}:${l.amount}:${l.status}`).join(",");
  useEffect(() => {
    if (!tokenId) { setTrades(null); return undefined; }
    let cancelled = false;
    setTrades(null);
    loadTradeHistory(tokenId).then((rows) => { if (!cancelled) setTrades(rows.map((r) => ({ t: r.at.getTime(), price: r.price, amount: r.amount }))); })
      .catch(() => { if (!cancelled) setTrades([]); });
    return () => { cancelled = true; };
  }, [tokenId, offersKey]);
  useEffect(() => {
    // "Update price" in My sales sends the unsold amount here, so the seller only re-confirms the new price.
    const preset = params.get("amount");
    setAmount(preset || ""); setError("");
    if (preset) { const next = new URLSearchParams(params); next.delete("amount"); if (tokenId && !release) next.set("asset", tokenId); setParams(next, { replace: true }); }
    else if (tokenId && !release) { const next = new URLSearchParams(params); next.set("asset", tokenId); setParams(next, { replace: true }); }
  }, [tokenId]);

  const qty = Number(amount);
  const unit = Number(price);
  const qtyValid = Number.isSafeInteger(qty) && qty > 0 && asset && qty <= asset.free && !listingsLoading && !listingsError;
  const supply = Number(asset?.ownership?.total || asset?.totalShares || 0);
  const percent = (tokens) => supply > 0 ? `${(tokens / supply * 100).toFixed(2)}%` : "Unavailable";
  const newOffer = qtyValid ? qty : 0;
  const kept = asset ? Math.max(0, asset.free - newOffer) : 0;
  const selectPercent = (value) => {
    if (value === "") { setAmount(""); return; }
    const requested = Number(value);
    if (!Number.isFinite(requested) || requested < 0 || !supply || !asset) return;
    setAmount(String(Math.min(asset.free, Math.floor(supply * requested / 100 + 1e-9))));
  };
  const priceValid = unit > 0;
  const gross = qtyValid && priceValid ? qty * unit : 0;
  const fee = feeBps != null ? gross * feeBps / 10000 : null;
  const gap = refUsd && priceValid ? unit / refUsd - 1 : null;
  const busy = step === "approve" || step === "list";
  // At the approved price the offer has no fixed price: the contract works it out when someone buys,
  // so it moves with every revaluation. That needs a signed offer, so it is always gasless.
  const follow = priceMode === "approved" && refUsd != null;
  const useSigned = gasless || follow;
  const round2 = (n) => String(Math.max(0.01, Math.round(n * 100) / 100));

  const submit = async (e) => {
    e.preventDefault();
    if (!asset || !qtyValid || !priceValid) return;
    setError(""); setResult(null);
    try {
      setStep("approve");
      const { tokenMarketplaceContract, tokenContract, addrs, runner } = await getContracts(true);
      const signer = await runner.getAddress();

      if (useSigned) {
        if ((await tokenContract.balanceOf(signer, asset.tokenId)) < BigInt(qty)) {
          throw new Error("Your wallet no longer holds enough tokens. Refresh and reduce the quantity.");
        }
        // The marketplace needs permission to move the tokens once, when somebody buys.
        if (!(await tokenContract.isApprovedForAll(signer, addrs.tokenMarketplaceAddress))) {
          await (await tokenContract.setApprovalForAll(addrs.tokenMarketplaceAddress, true)).wait();
        }
        setStep("list");
        const order = {
          seller: signer,
          assetId: String(asset.tokenId),
          amount: String(qty),
          ...(follow
            ? { premiumBps: "0", floorPrice: "0" }
            : { pricePerToken: ethers.parseUnits(unit.toFixed(6), 6).toString() }),
          paymentToken: addrs.paymentTokenAddress,
          expiry: String(release ? 0 : Math.floor(Date.now() / 1000) + days * 86400),
          salt: String(BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000))),
        };
        const chainId = (await runner.provider.getNetwork()).chainId;
        const signature = await runner.signTypedData(
          { name: "TokenMarketplace", version: "1", chainId, verifyingContract: addrs.tokenMarketplaceAddress },
          follow
            ? {
              FollowOrder: [
                { name: "seller", type: "address" }, { name: "assetId", type: "uint256" }, { name: "amount", type: "uint256" },
                { name: "premiumBps", type: "int256" }, { name: "floorPrice", type: "uint256" }, { name: "paymentToken", type: "address" },
                { name: "expiry", type: "uint256" }, { name: "salt", type: "uint256" },
              ],
            }
            : {
              Order: [
                { name: "seller", type: "address" }, { name: "assetId", type: "uint256" }, { name: "amount", type: "uint256" },
                { name: "pricePerToken", type: "uint256" }, { name: "paymentToken", type: "address" },
                { name: "expiry", type: "uint256" }, { name: "salt", type: "uint256" },
              ],
            },
          order,
        );
        const saved = await ordersAPI.create(order, signature);
        setResult({ hash: saved.data.data.orderHash, listingId: null, offchain: true, qty, unit, name: asset.name, gross, fee });
        setStep("done");
        reload();
        return;
      }

      if ((await tokenMarketplaceContract.assetToken()).toLowerCase() !== addrs.tokenAddress.toLowerCase()) {
        throw new Error("The marketplace and token contracts do not match. Update the deployment configuration.");
      }
      const balance = await tokenContract.balanceOf(signer, asset.tokenId);
      const latestBlock = await runner.provider.getBlock("latest");
      const count = Number(await tokenMarketplaceContract.totalListings());
      let alreadyOffered = 0n;
      for (let id = 1; id <= count; id++) {
        const offer = await tokenMarketplaceContract.getListing(id);
        if (offer.assetId === BigInt(asset.tokenId) && offer.seller.toLowerCase() === signer.toLowerCase() &&
          Number(offer.status) === 0 && (!Number(offer.expiresAt) || Number(offer.expiresAt) > latestBlock.timestamp)) {
          alreadyOffered += offer.amount;
        }
      }
      if (balance < BigInt(qty) + alreadyOffered) {
        throw new Error(`Your wallet holds ${balance} tokens and ${alreadyOffered} are already ${release ? "released" : "offered"}. Refresh and reduce the quantity.`);
      }
      if (!(await tokenContract.isApprovedForAll(signer, addrs.tokenMarketplaceAddress))) {
        await (await tokenContract.setApprovalForAll(addrs.tokenMarketplaceAddress, true)).wait();
      }
      setStep("list");
      const tx = await tokenMarketplaceContract.createListing(
        asset.tokenId,
        qty,
        ethers.parseUnits(unit.toFixed(6), 6),
        addrs.paymentTokenAddress,
        release ? 0 : days * 86400,
      );
      const receipt = await tx.wait();
      let listingId = null;
      for (const log of receipt.logs) {
        try { const parsed = tokenMarketplaceContract.interface.parseLog(log); if (parsed?.args?.listingId != null) { listingId = Number(parsed.args.listingId); break; } } catch { /* other contract */ }
      }
      trackTxGas(receipt.hash, "MarketplaceListing", signer, user?.role === "investor" ? "Investor" : "Owner", asset.tokenId).catch(() => {});
      setResult({ hash: receipt.hash, listingId, qty, unit, name: asset.name, gross, fee });
      setStep("done");
      reload();
    } catch (err) {
      setError(err.reason || err.shortMessage || err.message || (release ? "The tokens could not be released." : "The offer could not be created."));
      setStep("");
    }
  };

  const loadingAll = assetsLoading || listingsLoading;
  const myOpen = asset ? listings.filter((o) => Number(o.assetId) === Number(asset.tokenId) && wallet && o.seller.toLowerCase() === wallet && isActiveOffer(o)) : [];
  const allAsks = asset ? listings.filter((o) => Number(o.assetId) === Number(asset.tokenId) && isActiveOffer(o)).map((o) => o.pricePerTokenFormatted) : [];
  const lowestAsk = allAsks.length ? Math.min(...allAsks) : null;
  const last = trades?.length ? trades[trades.length - 1].price : null;
  const prev = trades && trades.length > 1 ? trades[trades.length - 2].price : null;
  const lastChange = last != null && prev ? (last / prev - 1) * 100 : null;
  const tone = { up: "var(--up)", down: "var(--down)", flat: "var(--ink-3)" }[dirOf(lastChange)];
  const ready = qtyValid && priceValid;
  const Pill = ({ active, onClick, children, disabled }) => (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active}
      className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-40 ${active ? "bg-[#1fe06f] text-[#04130a]" : "text-[#a1a1aa] hover:text-white"}`}>{children}</button>
  );
  const well = "rounded-xl bg-[#1b1c1f] px-4 py-3";

  return (
    <div className={pageClass}>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-[#98a2c3]">
        {copy.crumbs.map(([to, label]) => <span key={to} className="flex items-center gap-1.5"><Link to={to} className="hover:text-white">{label}</Link><ChevronRight className="w-4 h-4" /></span>)}
        <span className="text-white">{copy.here}</span>
      </nav>

      {!wallet ? (
        <Card title="Connect your wallet first" subtitle={release ? "Tokens are released from the wallet saved on your account." : "Offers are created from the wallet saved on your account."}>
          <p className="text-sm text-[#98a2c3] flex items-center gap-2"><Wallet className="w-4 h-4" /> Use <b className="text-white">Connect wallet</b> in the top bar, then come back.</p>
        </Card>
      ) : step === "done" && result ? (
        <Card>
          <div className="flex flex-col items-center text-center gap-4 py-8">
            <span className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center justify-center"><CheckCircle2 className="w-9 h-9" /></span>
            <div>
              <h2 className="text-2xl font-bold text-white">{release ? `${result.qty.toLocaleString()} tokens ${copy.done}` : `Offer ${result.listingId != null ? `#${result.listingId} ` : ""}${copy.done}`}</h2>
              <p className="mt-1.5 text-[#98a2c3]">{result.qty.toLocaleString()} {result.name} tokens at {formatMUSD(result.unit)} each.</p>
            </div>
            {result.fee != null && (
              <dl className="w-full max-w-sm rounded-xl border border-[#1b2440] bg-[#0e1426] p-4 text-sm text-left space-y-2">
                <div className="flex justify-between"><dt className="text-[#98a2c3]">If everything sells, buyers pay</dt><dd className="text-white font-semibold">{formatMUSD(result.gross)}</dd></div>
                <div className="flex justify-between"><dt className="text-[#98a2c3]">Platform fee</dt><dd className="font-semibold text-rose-300">− {formatMUSD(result.fee)}</dd></div>
                <div className="flex justify-between border-t border-[#1b2440] pt-2"><dt className="text-white font-semibold">You would receive</dt><dd className="font-bold text-emerald-300">{formatMUSD(result.gross - result.fee)}</dd></div>
              </dl>
            )}
            <p className="text-xs text-[#98a2c3] font-mono break-all max-w-xl">{result.offchain ? "Order ID (signed off-chain, no listing transaction was sent): " : "Receipt (transaction ID): "}{result.hash}</p>
            <div className="flex flex-wrap justify-center gap-3 mt-1">
              <Link to="/marketplace?tab=mine" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm text-white">{release ? "See it on the marketplace" : "View my offers"}</Link>
              <button onClick={() => { setStep(""); setResult(null); setAmount(""); }} className="px-5 py-2.5 rounded-xl border border-[#1b2440] bg-[#0e1426] hover:bg-[#141c33] font-semibold text-sm text-white">{release ? "Release more" : "Create another"}</button>
            </div>
          </div>
        </Card>
      ) : loadingAll ? (
        <div className="grid xl:grid-cols-[1fr_400px] gap-5"><div className="space-y-5"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div><Skeleton className="h-[34rem] rounded-2xl" /></div>
      ) : assetsError ? (
        <Card><p role="alert" className="text-sm text-amber-300">{assetsError} <button type="button" onClick={reload} className="underline">Retry</button></p></Card>
      ) : !sellable.length ? (
        <Card title={copy.title} subtitle={copy.none}>{release && <Link to="/verified-assets" className="text-indigo-300 font-semibold underline">Tokenize an approved property</Link>}</Card>
      ) : (
        <form onSubmit={submit} className="grid xl:grid-cols-[1fr_400px] gap-5 items-start">
          {/* ---------- left: the market for this property ---------- */}
          <div className="space-y-5 min-w-0">
            <section className="rounded-3xl border border-[#1b2440] bg-[#0b1124] p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                <div className="min-w-0">
                  <label className="sr-only" htmlFor="property-pick">Property</label>
                  <select id="property-pick" value={tokenId} onChange={(e) => setTokenId(e.target.value)} disabled={busy}
                    className="max-w-full rounded-xl bg-[#1b2440]/0 border border-[#1b2440] px-3 py-2 text-lg font-bold text-white outline-none focus:border-indigo-500">
                    {sellable.map((a) => <option key={a.tokenId} value={a.tokenId}>{a.name}</option>)}
                  </select>
                  {asset?.location && <p className="mt-1 flex items-center gap-1.5 text-sm text-[#98a2c3]"><MapPin className="w-3.5 h-3.5" />{asset.location}</p>}
                </div>
                <div>
                  <p className="text-xs text-[#98a2c3]">Last price</p>
                  <p className="text-2xl font-bold tabular-nums" style={{ color: last != null ? tone : "var(--ink-3)" }}>{last != null ? formatMUSD(last) : "No trades"}</p>
                  {lastChange != null && <p className="text-xs font-semibold" style={{ color: tone }}>{arrowOf(lastChange)} {pctText(lastChange)}</p>}
                </div>
                {[["Approved price", refUsd != null ? formatMUSD(refUsd) : "—"], ["Lowest selling price", lowestAsk != null ? formatMUSD(lowestAsk) : "None"], ["Your free tokens", asset ? asset.free.toLocaleString() : "—"], [`Total ${copy.past}`, asset ? `${asset.offered.toLocaleString()} (${percent(asset.offered)})` : "—"], ["Total supply", supply.toLocaleString()]].map(([k, v]) => (
                  <div key={k}><p className="text-xs text-[#98a2c3]">{k}</p><p className="text-base font-semibold text-white tabular-nums">{v}</p></div>
                ))}
              </div>
            </section>

            {trades == null
              ? <Skeleton className="h-96 rounded-3xl" />
              : <StockChart trades={trades} approved={refUsd} ask={lowestAsk} formatMUSD={formatMUSD} title={`${asset?.name || "Property"} · price per token`} />}

            <section className="rounded-3xl border border-[#1b2440] bg-[#0b1124] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-lg font-semibold text-white">Your {release ? "releases" : "offers"} for this property</h2>
                <Link to="/marketplace?tab=mine" className="text-sm font-semibold text-indigo-300 hover:underline">Manage all</Link>
              </div>
              {!myOpen.length ? <p className="text-sm text-[#98a2c3]">Nothing is on sale from your wallet yet. Use the ticket on the right to put tokens on sale.</p> : (
                <ul className="space-y-3">
                  {myOpen.map((o) => (
                    <li key={o.listingId} className="rounded-2xl bg-[#1b1c1f] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-2 font-semibold text-white">Offer #{o.listingId} <Badge tone="good">Open</Badge></span>
                        <span className="text-sm text-[#98a2c3]">{o.expiresAt ? `Ends ${fmtDate(o.expiresAt * 1000)}` : "No end date"}</span>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div><dt className="text-xs text-[#98a2c3]">Tokens left</dt><dd className="font-semibold text-white tabular-nums">{Number(o.amount).toLocaleString()}</dd></div>
                        <div><dt className="text-xs text-[#98a2c3]">Share of property</dt><dd className="font-semibold text-white tabular-nums">{percent(Number(o.amount))}</dd></div>
                        <div><dt className="text-xs text-[#98a2c3]">Price per token</dt><dd className="font-semibold text-white tabular-nums">{formatMUSD(o.pricePerTokenFormatted)}</dd></div>
                        <div><dt className="text-xs text-[#98a2c3]">Worth if sold</dt><dd className="font-semibold tabular-nums" style={{ color: "var(--up)" }}>{formatMUSD(Number(o.amount) * o.pricePerTokenFormatted)}</dd></div>
                      </dl>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* ---------- right: the order ticket ---------- */}
          <aside className="rounded-3xl border border-[#1b2440] bg-[#0b1124] p-4 sm:p-5 space-y-4 xl:sticky xl:top-24" aria-label={copy.summary}>
            <div>
              <h1 className="text-xl font-bold text-white">{copy.title}</h1>
              <p className="mt-1 text-sm text-[#98a2c3] leading-relaxed">{copy.intro}</p>
            </div>

            <div role="group" aria-label="Price type" className="flex gap-1 rounded-2xl bg-[#1b1c1f] p-1">
              <Pill active={priceMode === "approved"} disabled={refUsd == null || busy} onClick={() => { setPriceMode("approved"); if (refUsd != null) setPrice(String(refUsd)); }}>Approved price</Pill>
              <Pill active={priceMode === "custom"} disabled={busy} onClick={() => setPriceMode("custom")}>Custom price</Pill>
            </div>

            <div className="rounded-2xl bg-[#17181a] p-3 space-y-3">
              <div>
                <label htmlFor="qty" className="text-xs text-[#98a2c3]">Tokens to {copy.verb}</label>
                <div className={`${well} mt-1 flex items-center justify-between gap-2`}>
                  <input id="qty" type="number" min="1" max={asset?.free || 0} step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" disabled={busy || !asset?.free} required
                    className="w-full bg-transparent text-xl font-semibold text-white tabular-nums outline-none" />
                  <span className="text-sm text-[#98a2c3] whitespace-nowrap">{qtyValid ? percent(qty) : "tokens"}</span>
                </div>
                {listingsError && <p role="alert" className="mt-1 text-xs text-amber-300">{listingsError}</p>}
                {qty > (asset?.free || 0) && <p className="mt-1 text-xs text-rose-300">You can {copy.verb} at most {(asset?.free || 0).toLocaleString()} tokens.</p>}
              </div>
              <div className="grid grid-cols-4 gap-2" role="group" aria-label="Quick amounts">
                {[25, 50, 75, 100].map((pc) => (
                  <button key={pc} type="button" disabled={busy || !asset?.free} onClick={() => setAmount(String(Math.max(1, Math.floor((asset.free * pc) / 100))))}
                    className="rounded-lg bg-[#232427] py-1.5 text-sm font-semibold text-[#d4d4d8] hover:text-white hover:bg-[#2c2d31] disabled:opacity-40">{pc}%</button>
                ))}
              </div>
              <input aria-label="Tokens slider" type="range" min="0" max={asset?.free || 0} step="1" value={Math.max(0, Math.min(asset?.free || 0, qty || 0))} onChange={(e) => setAmount(e.target.value)} disabled={busy || !asset?.free} className="w-full accent-indigo-500" />
              <div>
                <label htmlFor="price" className="text-xs text-[#98a2c3]">Price per token (mUSD)</label>
                <div className={`${well} mt-1 flex items-center justify-between gap-2`}>
                  <input id="price" type="number" min="0.01" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} disabled={busy || priceMode === "approved"} required
                    className="w-full bg-transparent text-xl font-semibold text-white tabular-nums outline-none disabled:opacity-70" />
                  {gap != null && <span className="text-xs font-semibold whitespace-nowrap tabular-nums" style={{ color: gap > 0 ? "var(--up)" : gap < 0 ? "var(--down)" : "var(--ink-3)" }}>{gap > 0 ? "▲" : gap < 0 ? "▼" : ""} {Math.abs(gap * 100).toFixed(0)}%</span>}
                </div>
                {priceMode === "approved" && refUsd != null && <p className="mt-1 text-xs text-[#98a2c3]">This offer follows the property's approved price. If the property is revalued, the price changes with it automatically. Buyers pay the approved price at the moment they buy.</p>}
                <p className="mt-1 text-xs text-[#98a2c3]">{priceValid ? `≈ ${formatMUSD(unit, { showCode: true })} per token${follow ? " today" : ""}` : "Enter a price above zero"}{gap != null && Math.abs(gap) > PRICE_WARNING_RATIO ? " · buyers will see a warning" : ""}</p>
              </div>
              {!release && (
                <div role="group" aria-label="Offer duration" className="flex gap-1 rounded-2xl bg-[#1b1c1f] p-1">
                  {DURATIONS.map((d) => <Pill key={d} active={days === d} disabled={busy} onClick={() => setDays(d)}>{d}d</Pill>)}
                </div>
              )}
            </div>

            <label className="flex items-start gap-3 rounded-2xl bg-[#17181a] p-3 cursor-pointer">
              <input type="checkbox" checked={useSigned} onChange={(e) => setGasless(e.target.checked)} disabled={busy || follow} className="mt-1 accent-indigo-500" />
              <span className="text-sm">
                <span className="block font-semibold text-white">Sign without paying gas</span>
                <span className="block text-xs text-[#98a2c3] leading-relaxed">You sign the offer in MetaMask and nothing is sent to the blockchain. The buyer pays the network fee when they buy. {follow ? "An offer at the approved price is always signed this way, so it can follow the price." : "Turn off to publish an on-chain offer instead."}</span>
              </span>
            </label>

            <dl className="space-y-2.5 text-sm px-1">
              <Row k="Buyers pay" v={ready ? formatMUSD(gross) : "—"} />
              <Row k={`Platform fee${feeBps != null ? ` (${(feeBps / 100).toFixed(2)}%)` : ""}`} v={fee != null && ready ? `− ${formatMUSD(fee)}` : fee == null ? "Unavailable" : "—"} loss />
              <Row k="You would still hold" v={qtyValid && asset ? `${(asset.held - qty).toLocaleString()} tokens` : "—"} />
              <Row k="Open for" v={release ? "Until sold or withdrawn" : `${days} days`} />
              <div className="flex items-baseline justify-between gap-3 border-t border-[#1b2440] pt-3">
                <dt className="font-semibold text-white">You receive</dt>
                <dd className="text-xl font-bold tabular-nums" style={{ color: fee != null && ready ? "var(--up)" : "var(--ink-3)" }}>{fee != null && ready ? formatMUSD(gross - fee) : "—"}</dd>
              </div>
            </dl>

            {busy && (
              <ol className="space-y-2 text-sm rounded-xl bg-[#1b1c1f] p-3.5" role="status">
                <Step on={step === "approve"} done={step === "list"}>Allow the marketplace to move your tokens when they sell</Step>
                <Step on={step === "list"}>{useSigned ? `Sign the ${release ? "release" : "offer"} in MetaMask (free, nothing is sent)` : `Publish the ${release ? "release" : "offer"} on the blockchain`}</Step>
              </ol>
            )}
            {error && <p role="alert" className="text-sm text-rose-300 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</p>}

            <button type="submit" disabled={busy || !ready}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 py-4 text-base font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed">
              {busy ? (useSigned ? "Sign in MetaMask…" : "Confirm in MetaMask…") : <>{copy.submit} <ArrowRight className="w-4 h-4" /></>}
            </button>

            {/* token usage, like margin usage */}
            {asset && (
              <div className="border-t border-[#1b2440] pt-4">
                <h2 className="text-base font-semibold text-white">Token usage</h2>
                <div role="img" aria-label="Your token usage" className="mt-3 flex h-2.5 overflow-hidden rounded-full" style={{ background: ALLOC.others }}>
                  {[[asset.offered, ALLOC.already], [newOffer, ALLOC.now], [kept, ALLOC.kept]].map(([n, c], i) => <div key={i} style={{ width: `${asset.held ? (n / asset.held) * 100 : 0}%`, background: c, transition: "width 0.25s ease" }} />)}
                </div>
                <dl className="mt-3 space-y-2 text-sm">
                  {[[`Already ${copy.past}`, asset.offered, ALLOC.already], [`This ${release ? "release" : "offer"}`, newOffer, ALLOC.now], [`Still free`, kept, ALLOC.kept]].map(([k, n, c]) => (
                    <div key={k} className="flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-2 text-[#98a2c3]"><span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />{k}</dt>
                      <dd className="text-white font-semibold tabular-nums">{n.toLocaleString()} <span className="font-normal text-[#98a2c3]">· {percent(n)}</span></dd>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-3 border-t border-[#1b2440] pt-2"><dt className="text-[#98a2c3]">You hold in total</dt><dd className="text-white font-semibold tabular-nums">{asset.held.toLocaleString()} <span className="font-normal text-[#98a2c3]">· {percent(asset.held)}</span></dd></div>
                </dl>
              </div>
            )}
            <p className="text-xs text-[#98a2c3] flex gap-2 leading-relaxed"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />Your tokens stay in your wallet until bought. {release ? "A release has no end date." : "You can cancel any time under “My sales”."} Network fees are paid separately.</p>
          </aside>
        </form>
      )}
    </div>
  );
}

function Row({ k, v, loss }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[#98a2c3]">{k}</dt>
      <dd className={`text-right font-semibold ${loss ? "text-rose-300" : "text-white"}`}>{v}</dd>
    </div>
  );
}

function Step({ on, done, children }) {
  return (
    <li className="flex items-center gap-2 text-[#c3cae2]">
      <span className={`w-2 h-2 rounded-full ${done ? "bg-emerald-400" : on ? "bg-amber-400 animate-pulse" : "bg-[#29345a]"}`} />
      {children}
    </li>
  );
}
