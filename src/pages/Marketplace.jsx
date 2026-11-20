import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ethers } from "ethers";
import { Tag, Coins, Layers, Store, Building2, AlertTriangle, CheckCircle2, X, RefreshCw, Wallet, Percent } from "lucide-react";
import { AssetDetail, InvestorCatalog } from "../components/AssetExplorer";
import { getContracts, trackTxGas, getPaymentTokenBalance } from "../services/contractService";
import { ordersAPI } from "../lib/api";
import { useRole } from "../context/RoleContext";
import { BestDeals, MyPurchases, gapInfo } from "../components/market/InvestorViews";
import { InvestorShop } from "../components/market/InvestorShop";
import { loadMyTrades } from "../services/tokenSales";
import { useAllTrades } from "../lib/useAllTrades";
import MarketWatch from "../components/market/MarketWatch";
import { useCurrency } from "../context/CurrencyContext";
import { useAuth } from "../context/AuthContext";
import { resolveUserWallet } from "../lib/walletResolver";
import { useMarketplaceData, isActiveOffer, sellerKind } from "../lib/marketplaceData";
import { PageHeader, ActionButton, Stat, Badge, SellerTag, cardClass, pageClass, fmtDate } from "../components/ui/dash";

// How far a price may stray from the approved reference price before we warn.
const PRICE_WARNING_RATIO = 0.5;
// Owners and issuers manage sales; investors mostly buy, so they get a buy-first layout.
const OWNER_TABS = [["market", "Market"], ["browse", "Buy tokens"], ["offers", "All offers"], ["mine", "My sales"]];
const INVESTOR_TABS = [["browse", "Invest"], ["mine", "Sell or exit"]];

export default function Marketplace() {
  const { assetId: detailAssetId } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { formatMUSD, convert } = useCurrency();
  const { user } = useAuth();
  const { isInvestor } = useRole();
  const TABS = isInvestor ? INVESTOR_TABS : OWNER_TABS;
  const wallet = resolveUserWallet(user);
  const data = useMarketplaceData({ wallet });
  const [cash, setCash] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setCash(null);
    if (isInvestor && wallet) getPaymentTokenBalance(wallet).then((b) => { if (!cancelled) setCash(b); }).catch(() => {});
    return () => { cancelled = true; };
  }, [isInvestor, wallet]);
  const { assets, listings, reference, assetsLoading, listingsLoading, assetsError, listingsError, reload, loadListings } = data;
  const tab = TABS.some(([k]) => k === params.get("tab")) ? params.get("tab") : TABS[0][0];
  const setTab = (k) => { const next = new URLSearchParams(params); next.set("tab", k); setParams(next, { replace: true }); };

  // Older links used ?sellAsset=<database id>; send them to the new sell page.
  useEffect(() => {
    const legacy = params.get("sellAsset");
    if (!legacy || assetsLoading) return;
    const a = assets.find((x) => String(x.assetId) === legacy);
    navigate(`/marketplace/sell${a ? `?asset=${a.tokenId}` : ""}`, { replace: true });
  }, [params, assets, assetsLoading, navigate]);

  const byToken = useMemo(() => new Map(assets.map((a) => [Number(a.tokenId), a])), [assets]);
  const refUsd = (tokenId) => (reference[Number(tokenId)] != null ? Number(convert(reference[Number(tokenId)], "LKR", "USD").toFixed(2)) : null);
  const gapOf = (tokenId, price) => { const r = refUsd(tokenId); return r && price > 0 ? price / r - 1 : null; };
  const mineFilter = (o) => wallet && o.seller.toLowerCase() === wallet;
  // Only offers for properties that exist on the current chain.
  const known = listings.filter((o) => byToken.has(Number(o.assetId)));
  const active = known.filter(isActiveOffer);
  const myOffers = known.filter(mineFilter);
  const forSale = new Set(active.map((o) => Number(o.assetId)));
  const holdings = assets.filter((a) => (a.ownership?.viewerBalance || 0) > 0);

  // Trade history for the market watch; reloads when any offer changes.
  const offersKey = listings.map((l) => `${l.listingId}:${l.amount}:${l.status}`).join(",");
  const market = useAllTrades(offersKey);

  // Completed sales come from on-chain purchase events, because an offer's own
  // token count drops to zero once it sells out.
  const [trades, setTrades] = useState(null);
  const [tradesError, setTradesError] = useState("");
  const loadTrades = useCallback(async () => {
    if (!wallet) { setTrades([]); return; }
    try {
      setTradesError("");
      setTrades(await loadMyTrades(wallet));
    } catch {
      setTradesError("Your sales history could not be loaded from the blockchain.");
      setTrades([]);
    }
  }, [wallet]);
  useEffect(() => { loadTrades(); }, [loadTrades, listings]);

  // ----- buy -----
  const [selected, setSelected] = useState(null);
  const [buying, setBuying] = useState(false);
  const [buyStep, setBuyStep] = useState("");
  const [txHash, setTxHash] = useState("");
  const [buyError, setBuyError] = useState("");
  const reviewPurchase = (offer) => { setBuyError(""); setBuyStep(""); setTxHash(""); setSelected(offer); };

  const handleBuy = async (listing) => {
    try {
      setBuyError(""); setBuying(true); setBuyStep("approving");
      const { tokenMarketplaceContract, paymentTokenContract, addrs, runner } = await getContracts(true);
      const signer = await runner.getAddress();
      if (signer.toLowerCase() === listing.seller.toLowerCase()) throw new Error("You cannot buy your own offer.");
      if (!Number.isSafeInteger(listing.amount) || listing.amount <= 0) throw new Error("Choose a positive whole number of tokens.");

      // A signed order was never written to the chain by the seller: this purchase verifies the
      // signature and settles in one transaction.
      if (listing.kind === "signed") {
        // An offer at the approved price is priced when it is bought. The buyer allows up to 2% above today's price,
        // so a revaluation that lands first cannot cost them more; the purchase fails instead.
        const follows = Boolean(listing.follow);
        const limit = follows ? (BigInt(listing.pricePerTokenBase) * 102n) / 100n : BigInt(listing.pricePerTokenBase);
        const cost = limit * BigInt(listing.amount);
        const fillName = follows ? "fillFollowOrder" : "fillSignedOrder";
        const fill = () => (follows
          ? tokenMarketplaceContract.fillFollowOrder(listing.order, listing.signature, listing.amount, limit)
          : tokenMarketplaceContract.fillSignedOrder(listing.order, listing.signature, listing.amount));
        const allowance = await paymentTokenContract.allowance(signer, addrs.tokenMarketplaceAddress);
        const canPermit = tokenMarketplaceContract.interface.hasFunction(`${fillName}WithPermit`) && paymentTokenContract.interface.hasFunction("permit");
        let signedTx;
        if (allowance >= cost) {
          setBuyStep("purchasing");
          signedTx = await fill();
        } else if (canPermit) {
          // Sign the payment allowance off-chain: one transaction instead of approve + buy.
          const chainId = (await runner.provider.getNetwork()).chainId;
          const deadline = Math.floor(Date.now() / 1000) + 3600;
          const permitSignature = ethers.Signature.from(await runner.signTypedData(
            { name: await paymentTokenContract.name(), version: "1", chainId, verifyingContract: addrs.paymentTokenAddress },
            { Permit: [
              { name: "owner", type: "address" }, { name: "spender", type: "address" }, { name: "value", type: "uint256" },
              { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" },
            ] },
            { owner: signer, spender: addrs.tokenMarketplaceAddress, value: cost, nonce: await paymentTokenContract.nonces(signer), deadline },
          ));
          setBuyStep("purchasing");
          signedTx = follows
            ? await tokenMarketplaceContract.fillFollowOrderWithPermit(
              listing.order, listing.signature, listing.amount, limit, deadline, permitSignature.v, permitSignature.r, permitSignature.s,
            )
            : await tokenMarketplaceContract.fillSignedOrderWithPermit(
              listing.order, listing.signature, listing.amount, deadline, permitSignature.v, permitSignature.r, permitSignature.s,
            );
        } else {
          await (await paymentTokenContract.approve(addrs.tokenMarketplaceAddress, cost)).wait();
          setBuyStep("purchasing");
          signedTx = await fill();
        }
        const signedReceipt = await signedTx.wait();
        setTxHash(signedReceipt.hash); setBuyStep("done");
        trackTxGas(signedReceipt.hash, "SignedOrderPurchase", signer, "Investor", listing.assetId).catch(() => {});
        reload();
        return;
      }

      const latest = await tokenMarketplaceContract.getListing(listing.listingId);
      if (Number(latest.status) !== 0 || BigInt(listing.amount) > latest.amount) throw new Error("This offer has changed. Refresh and choose an available quantity.");
      const partial = tokenMarketplaceContract.interface.hasFunction("buyListingAmount");
      if (!partial && BigInt(listing.amount) !== latest.amount) throw new Error("This marketplace deployment only supports buying whole offers.");
      const total = BigInt(listing.pricePerTokenBase) * BigInt(listing.amount);
      if ((await paymentTokenContract.allowance(signer, addrs.tokenMarketplaceAddress)) < total) {
        await (await paymentTokenContract.approve(addrs.tokenMarketplaceAddress, total)).wait();
      }
      setBuyStep("purchasing");
      const tx = partial ? await tokenMarketplaceContract.buyListingAmount(listing.listingId, listing.amount) : await tokenMarketplaceContract.buyListing(listing.listingId);
      const receipt = await tx.wait();
      setTxHash(receipt.hash); setBuyStep("done");
      trackTxGas(receipt.hash, "MarketplacePurchase", signer, "Investor", listing.assetId).catch(() => {});
      reload();
    } catch (err) {
      setBuyError(err.reason || err.shortMessage || err.message || "Purchase failed");
      setBuyStep("");
    } finally {
      setBuying(false);
    }
  };

  // ----- cancel -----
  const [cancelling, setCancelling] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [cancelError, setCancelError] = useState("");
  const handleCancel = async (listingId) => {
    setCancelling(listingId); setCancelError("");
    try {
      const { tokenMarketplaceContract } = await getContracts(true);
      const signedOffer = listings.find((o) => o.listingId === listingId && o.kind === "signed");
      if (signedOffer) {
        // Cancel on-chain so the signature is dead everywhere, then hide it from the order book.
        await (await (signedOffer.follow ? tokenMarketplaceContract.cancelFollowOrder(signedOffer.order) : tokenMarketplaceContract.cancelSignedOrder(signedOffer.order))).wait();
        await ordersAPI.cancel(signedOffer.orderHash).catch(() => {});
      } else {
        await (await tokenMarketplaceContract.cancelListing(listingId)).wait();
      }
      setConfirmCancel(null);
      loadListings();
      return true;
    } catch (err) {
      setCancelError(err.reason || err.shortMessage || err.message || "Cancellation failed");
      return false;
    } finally {
      setCancelling(null);
    }
  };

  // The approved price follows the property's valuation, but an offer keeps the price it was listed at.
  // "Update price" stops the offer and opens the sell page with the unsold tokens and the new approved price.
  const repriceOffer = async (o) => {
    if (!(await handleCancel(o.listingId))) return;
    const a = byToken.get(Number(o.assetId));
    navigate(`${isInvestor ? "/marketplace/sell" : `/owner/release/${o.assetId}`}?asset=${a.tokenId}&amount=${Number(o.amount)}`);
  };

  if (detailAssetId) {
    const detail = assets.find((a) => String(a.assetId) === detailAssetId);
    return (
      <div className={pageClass}>
        {assetsLoading ? <p className="text-[#98a2c3]">Loading property…</p>
          : assetsError ? <p role="alert" className="text-amber-300">{assetsError} <button onClick={reload} className="underline">Retry</button></p>
          : detail ? <AssetDetail asset={detail} listings={listings} loadingOffers={listingsLoading} offersError={listingsError} account={wallet} buying={buying} onBuy={reviewPurchase} onRetry={loadListings} reference={reference} />
          : <div className="py-16 text-center"><h1 className="text-2xl font-bold mb-3 text-white">Property not found</h1><Link to="/marketplace" className="text-indigo-300">Back to the marketplace</Link></div>}
        {selected && <BuyModal {...{ selected, buying, buyStep, txHash, buyError, handleBuy, formatMUSD, refUsd, gapOf, byToken }} onClose={() => setSelected(null)} />}
      </div>
    );
  }

  const loading = assetsLoading || listingsLoading;
  const v = (x) => (loading ? "…" : x);

  return (
    <div className={pageClass}>
      {isInvestor ? (
        <div className="rise relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 overflow-hidden rounded-3xl border border-[#2c2d31] p-6 sm:p-8" style={{ background: "radial-gradient(circle at 8% 0%, rgba(56,189,248,0.22), transparent 42%), radial-gradient(circle at 92% 100%, rgba(167,139,250,0.22), transparent 45%), radial-gradient(circle at 55% 0%, rgba(31,224,111,0.16), transparent 40%), #1b1c1f" }}>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1fe06f]">Marketplace</p>
            <h1 className="mt-1.5 text-3xl sm:text-4xl font-bold tracking-tight text-white">Invest in <span style={{ background: "linear-gradient(90deg,#1fe06f,#38bdf8,#a78bfa)", WebkitBackgroundClip: "text", color: "transparent" }}>real property</span></h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#98a2c3]">
              Own a share of real estate from a single token. Choose a property, decide how much to invest, and share in its sale proceeds. Every investment settles on the blockchain.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <ActionButton onClick={reload} icon={RefreshCw}>Refresh</ActionButton>
            <ActionButton to="/marketplace/sell" icon={Tag}>Sell tokens</ActionButton>
            <ActionButton to="/portfolio" primary icon={Wallet}>My portfolio</ActionButton>
          </div>
        </div>
      ) : (
        <PageHeader
          title="Token marketplace"
          subtitle="Trade fractional property tokens like shares. Prices move with every purchase, and every trade settles on the blockchain."
          actions={<>
            <ActionButton onClick={reload} icon={RefreshCw}>Refresh</ActionButton>
            <ActionButton to="/marketplace/sell" primary icon={Tag}>Sell tokens</ActionButton>
          </>}
        />
      )}

      {!isInvestor && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <Stat label="Properties for sale" icon={Building2} value={v(forSale.size)} note={loading ? "" : `of ${assets.length} tokenized`} />
          <Stat label="Active offers" icon={Store} value={v(active.length)} />
          <Stat label="Tokens on offer" icon={Layers} value={v(active.reduce((s, o) => s + Number(o.amount), 0).toLocaleString())} />
          <Stat label="Your open offers" icon={Tag} value={v(myOffers.filter(isActiveOffer).length)} note={wallet ? "" : "Connect a wallet to sell"} />
        </div>
      )}

      {(assetsError || listingsError) && (
        <p role="alert" className="text-sm text-amber-300 flex flex-wrap gap-2">{assetsError || listingsError}<button onClick={reload} className="underline">Retry</button></p>
      )}

      <div role="tablist" className="flex gap-1 border-b border-[#1b2440] overflow-x-auto">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px ${tab === k ? "border-indigo-500 text-white" : "border-transparent text-[#98a2c3] hover:text-white"}`}>
            {label}{k === "mine" && myOffers.filter(isActiveOffer).length ? <span className="ml-1.5 px-1.5 rounded bg-indigo-500/20 text-indigo-300 text-xs">{myOffers.filter(isActiveOffer).length}</span> : null}
          </button>
        ))}
      </div>

      {tab === "market" && (
        <MarketWatch assets={assets} trades={market.trades} listings={known} reference={reference}
          loading={assetsLoading || listingsLoading || market.trades == null} error={market.error} />
      )}

      {tab === "browse" && (isInvestor
        ? <InvestorShop assets={assets} offers={active} reference={reference} trades={market.trades} loading={assetsLoading || listingsLoading} error={assetsError || listingsError} onRetry={reload} cash={cash} wallet={wallet} onBuy={reviewPurchase} />
        : assetsLoading ? <p className="text-[#98a2c3]">Loading properties…</p>
          : <InvestorCatalog assets={assets} listings={known} loadingOffers={listingsLoading} offersError={listingsError} reference={reference} wallet={wallet} />
      )}

      {tab === "deals" && <BestDeals assets={assets} offers={active} reference={reference} loading={assetsLoading || listingsLoading} />}

      {tab === "purchases" && <MyPurchases wallet={wallet} trades={trades} error={tradesError} loading={assetsLoading} />}

      {tab === "offers" && (
        <OffersTable offers={active} byToken={byToken} wallet={wallet} loading={listingsLoading} formatMUSD={formatMUSD} gapOf={gapOf}
          empty="No active sale offers right now."
          action={(o) => mineFilter(o) ? <button onClick={() => setTab("mine")} className="text-xs font-semibold text-indigo-300 hover:text-indigo-200 whitespace-nowrap">Your offer · manage</button>
            : <button onClick={() => navigate(`/marketplace/assets/${byToken.get(Number(o.assetId)).assetId}`)} className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold">Buy</button>} />
      )}

      {tab === "mine" && (
        <MySales {...{ wallet, holdings, active, myOffers, trades, tradesError, byToken, formatMUSD, mineFilter, cancelError, refUsd, repriceOffer, cancelling }}
          loading={assetsLoading || listingsLoading}
          cancelAction={(o) => !isActiveOffer(o) ? null : confirmCancel === o.listingId ? (
            <span className="flex gap-2 justify-end">
              <button onClick={() => handleCancel(o.listingId)} disabled={cancelling === o.listingId} className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold disabled:opacity-50">{cancelling === o.listingId ? "Stopping…" : "Yes, stop"}</button>
              <button onClick={() => setConfirmCancel(null)} className="px-3 py-1.5 rounded-lg border border-[#1b2440] text-xs text-[#c3cae2]">Keep</button>
            </span>
          ) : <button onClick={() => setConfirmCancel(o.listingId)} className="px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-xs font-semibold whitespace-nowrap">Stop selling</button>} />
      )}

      {selected && <BuyModal {...{ selected, buying, buyStep, txHash, buyError, handleBuy, formatMUSD, refUsd, gapOf, byToken }} onClose={() => setSelected(null)} />}
    </div>
  );
}

function offerStatus(o, sold = 0) {
  if (o.status === 1) return ["Sold out", "good"];
  if (o.status === 2) return [sold ? "Stopped · part sold" : "Stopped", "muted"];
  if (!isActiveOffer(o)) return [sold ? "Expired · part sold" : "Expired", "warn"];
  return sold ? ["Partly sold", "good"] : ["For sale", "good"];
}

const short = (addr) => (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "—");
const th = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#98a2c3] whitespace-nowrap";
const td = "px-4 py-3 whitespace-nowrap";

// Everything a seller needs in one place: how selling works, what they can sell,
// each offer's progress (listed → sold → left) and every completed sale.
function MySales({ wallet, holdings, active, myOffers, trades, tradesError, loading, byToken, formatMUSD, mineFilter, cancelError, cancelAction, refUsd, repriceOffer, cancelling }) {
  if (!wallet) {
    return <section className={`${cardClass} p-6`}><p className="text-[#98a2c3]">Connect your wallet to see and manage your sales.</p></section>;
  }

  const sales = (trades || []).filter((t) => t.side === "Sold");
  const soldBy = new Map();
  for (const s of sales) {
    const cur = soldBy.get(s.listingId) || { tokens: 0, received: 0 };
    soldBy.set(s.listingId, { tokens: cur.tokens + s.amount, received: cur.received + (s.received || 0) });
  }
  const offers = [...myOffers].sort((a, b) => Number(isActiveOffer(b)) - Number(isActiveOffer(a)) || (b.createdAt || 0) - (a.createdAt || 0));
  const openOffers = offers.filter(isActiveOffer);
  const tokensForSale = openOffers.reduce((s, o) => s + Number(o.amount), 0);
  const tokensSold = sales.reduce((s, t) => s + t.amount, 0);
  const earned = sales.reduce((s, t) => s + (t.received || 0), 0);
  const tradesLoading = trades == null;
  const v = (x, wait = loading) => (wait ? "…" : x);

  return (
    <div className="space-y-6">
      <section className={`${cardClass} p-5 sm:p-6`}>
        <h2 className="text-lg font-bold text-white mb-4">How selling works</h2>
        <ol className="grid sm:grid-cols-3 gap-3">
          {[
            ["List your tokens", "Pick a property, choose how many tokens and your price. The tokens stay in your wallet."],
            ["Buyers see your offer", "It appears under “Invest” and on the property page. Buyers can take all or part of it."],
            ["You get paid automatically", "When someone buys, mUSD (minus the platform fee) arrives in your wallet and the tokens move to the buyer."],
          ].map(([title, text], i) => (
            <li key={title} className="rounded-xl border border-[#1b2440] bg-[#0e1426] p-4 flex gap-3">
              <span className="w-7 h-7 shrink-0 rounded-full bg-indigo-500/20 text-indigo-300 text-sm font-bold flex items-center justify-center">{i + 1}</span>
              <span><span className="block font-semibold text-white">{title}</span><span className="block text-sm text-[#98a2c3] mt-0.5">{text}</span></span>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Open offers" icon={Store} value={v(openOffers.length)} />
        <Stat label="Tokens for sale now" icon={Layers} value={v(tokensForSale.toLocaleString())} />
        <Stat label="Tokens sold" icon={Tag} value={v(tokensSold.toLocaleString(), tradesLoading)} />
        <Stat label="You earned" icon={Coins} value={v(formatMUSD(earned), tradesLoading)} note="after platform fee" />
      </div>

      <section className={`${cardClass} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">1. Tokens you can sell</h2>
            <p className="text-sm text-[#98a2c3]">Tokens in your wallet that aren't already in an open offer.</p>
          </div>
          <ActionButton to="/marketplace/sell" primary icon={Tag}>Sell tokens</ActionButton>
        </div>
        {loading ? <p className="text-sm text-[#98a2c3]">Reading your balances…</p>
          : !holdings.length ? <p className="text-sm text-[#98a2c3]">Your wallet doesn't hold any property tokens yet. Invest in a property under “Invest” first.</p>
          : (
            <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {holdings.map((a) => {
                const held = a.ownership.viewerBalance;
                const offered = active.filter((o) => mineFilter(o) && Number(o.assetId) === Number(a.tokenId)).reduce((s, o) => s + Number(o.amount), 0);
                const free = Math.max(0, held - offered);
                return (
                  <li key={a.tokenId} className="rounded-xl border border-[#1b2440] bg-[#0e1426] p-4 space-y-3">
                    <span className="block font-semibold text-white truncate">{a.name}</span>
                    <dl className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div><dt className="text-[11px] text-[#6b7599]">You hold</dt><dd className="font-semibold text-white">{held.toLocaleString()}</dd></div>
                      <div><dt className="text-[11px] text-[#6b7599]">For sale</dt><dd className="font-semibold text-amber-300">{offered.toLocaleString()}</dd></div>
                      <div><dt className="text-[11px] text-[#6b7599]">Free to sell</dt><dd className="font-semibold text-emerald-300">{free.toLocaleString()}</dd></div>
                    </dl>
                    {free > 0
                      ? <Link to={`/marketplace/sell?asset=${a.tokenId}`} className="block text-center rounded-lg bg-indigo-600 hover:bg-indigo-500 py-2 text-sm font-semibold text-white">Sell these tokens</Link>
                      : <p className="text-center text-xs text-[#98a2c3] py-2">All your tokens are already for sale.</p>}
                  </li>
                );
              })}
            </ul>
          )}
      </section>

      <section className={`${cardClass} overflow-hidden`}>
        <div className="px-5 sm:px-6 pt-5">
          <h2 className="text-lg font-bold text-white">2. Your sale offers</h2>
          <p className="text-sm text-[#98a2c3]">Each offer shows how many tokens you listed, how many have sold and how many are still for sale.</p>
        </div>
        {cancelError && <p role="alert" className="mx-5 sm:mx-6 mt-3 text-sm text-rose-300">{cancelError}</p>}
        {loading ? <p className="p-6 text-[#98a2c3]">Loading offers…</p>
          : !offers.length ? <p className="p-6 text-[#98a2c3]">You haven't listed any tokens yet. Use “Sell these tokens” above to create your first offer.</p>
          : (
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm min-w-[980px]">
                <thead className="border-b border-[#1b2440]"><tr>
                  <th className={th}>Property</th><th className={`${th} text-right`}>Price / token</th><th className={th}>vs approved</th>
                  <th className={`${th} text-right`}>Listed</th><th className={`${th} text-right`}>Sold</th><th className={`${th} text-right`}>Still for sale</th>
                  <th className={`${th} text-right`}>You earned</th><th className={th}>Status</th><th className={th}>Ends</th><th className={th}><span className="sr-only">Action</span></th>
                </tr></thead>
                <tbody>
                  {offers.map((o) => {
                    const sold = soldBy.get(o.listingId) || { tokens: 0, received: 0 };
                    const live = isActiveOffer(o);
                    const left = live ? Number(o.amount) : 0;
                    const listed = Number(o.amount) + sold.tokens;
                    const [label, tone] = offerStatus(o, sold.tokens);
                    return (
                      <tr key={o.listingId} className="border-b border-[#1b2440] last:border-0 hover:bg-[#0e1426]">
                        <td className={td}><span className="block font-semibold text-white">{byToken.get(Number(o.assetId))?.name || `Token #${o.assetId}`}</span><span className="block text-xs text-[#6b7599]">Offer #{o.listingId}</span></td>
                        <td className={`${td} text-right text-white`}>{formatMUSD(o.pricePerTokenFormatted)}</td>
                        <td className={td}>{(() => {
                          const ref = refUsd(o.assetId);
                          if (!live || !ref) return <span className="text-[#6b7599]">—</span>;
                          const gp = o.pricePerTokenFormatted / ref - 1;
                          const gi = gapInfo(gp);
                          return (
                            <span className="flex flex-col items-start gap-1">
                              <span className="text-xs font-semibold" style={{ color: gi.color }}>{gi.label}</span>
                              {Math.abs(gp) >= 0.01 && <button type="button" disabled={cancelling === o.listingId} onClick={() => repriceOffer(o)} className="text-xs font-semibold text-indigo-300 hover:text-indigo-200 disabled:opacity-50">{cancelling === o.listingId ? "Stopping…" : `Update to ${formatMUSD(ref)}`}</button>}
                            </span>
                          );
                        })()}</td>
                        <td className={`${td} text-right text-white`}>{tradesLoading ? "…" : listed.toLocaleString()}</td>
                        <td className={`${td} text-right text-emerald-300 font-semibold`}>{tradesLoading ? "…" : sold.tokens.toLocaleString()}</td>
                        <td className={`${td} text-right ${left ? "text-amber-300 font-semibold" : "text-[#6b7599]"}`}>{left.toLocaleString()}</td>
                        <td className={`${td} text-right text-white`}>{tradesLoading ? "…" : formatMUSD(sold.received)}</td>
                        <td className={td}><Badge tone={tone}>{label}</Badge></td>
                        <td className={`${td} text-[#c3cae2]`}>{!live ? "—" : o.expiresAt ? fmtDate(o.expiresAt * 1000) : "No end date"}</td>
                        <td className={`${td} text-right`}>{cancelAction(o)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        <p className="px-5 sm:px-6 py-4 text-xs text-[#6b7599]">“Stop selling” removes the unsold part of an offer. Tokens already sold stay sold.</p>
      </section>

      <section className={`${cardClass} overflow-hidden`}>
        <div className="px-5 sm:px-6 pt-5">
          <h2 className="text-lg font-bold text-white">3. Completed sales</h2>
          <p className="text-sm text-[#98a2c3]">Every purchase of your tokens, read from the blockchain.</p>
        </div>
        {tradesError && <p role="alert" className="mx-5 sm:mx-6 mt-3 text-sm text-amber-300">{tradesError}</p>}
        {tradesLoading ? <p className="p-6 text-[#98a2c3]">Loading sales…</p>
          : !sales.length ? <p className="p-6 text-[#98a2c3]">No one has bought your tokens yet.</p>
          : (
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="border-b border-[#1b2440]"><tr>
                  <th className={th}>Date</th><th className={th}>Property</th><th className={`${th} text-right`}>Tokens</th>
                  <th className={`${th} text-right`}>Price / token</th><th className={`${th} text-right`}>You received</th><th className={th}>Buyer</th><th className={th}>Transaction</th>
                </tr></thead>
                <tbody>
                  {sales.map((s) => (
                    <tr key={`${s.txHash}-${s.listingId}`} className="border-b border-[#1b2440] last:border-0 hover:bg-[#0e1426]">
                      <td className={`${td} text-[#c3cae2]`}>{s.at.toLocaleString()}</td>
                      <td className={td}><span className="block font-semibold text-white">{s.name}</span><span className="block text-xs text-[#6b7599]">Offer #{s.listingId}</span></td>
                      <td className={`${td} text-right text-white`}>{s.amount.toLocaleString()}</td>
                      <td className={`${td} text-right text-[#c3cae2]`}>{formatMUSD(s.amount ? s.total / s.amount : 0)}</td>
                      <td className={`${td} text-right text-emerald-300 font-semibold`}>{formatMUSD(s.received)}</td>
                      <td className={`${td} font-mono text-xs text-[#98a2c3]`}>{short(s.buyer)}</td>
                      <td className={`${td} font-mono text-xs text-[#6b7599]`} title={s.txHash}>{short(s.txHash)}</td>
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

function OffersTable({ offers, byToken, wallet, loading, formatMUSD, gapOf, action, empty, title, showStatus }) {
  return (
    <section className={`${cardClass} overflow-hidden`}>
      {title && <h2 className="px-5 sm:px-6 pt-5 text-lg font-bold text-white">{title}</h2>}
      {loading ? <p className="p-6 text-[#98a2c3]">Loading offers…</p> : !offers.length ? <p className="p-6 text-[#98a2c3]">{empty}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-[#98a2c3] border-b border-[#1b2440]">
                <th className="px-5 py-3.5">Property</th>
                <th className="px-5 py-3.5 text-right">Tokens</th>
                <th className="px-5 py-3.5 text-right">Price / token</th>
                <th className="px-5 py-3.5 text-right">vs approved value</th>
                <th className="px-5 py-3.5 text-right">Total</th>
                {showStatus ? <th className="px-5 py-3.5">Status</th> : <th className="px-5 py-3.5">Seller</th>}
                <th className="px-5 py-3.5">Expires</th>
                <th className="px-5 py-3.5 text-right relative"><span className="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => {
                const a = byToken.get(Number(o.assetId));
                const gap = gapOf(o.assetId, o.pricePerTokenFormatted);
                const [label, tone] = offerStatus(o);
                return (
                  <tr key={o.listingId} className="border-b border-[#1b2440] last:border-0 hover:bg-[#0e1426]">
                    <td className="px-5 py-3.5">
                      <span className="block font-semibold text-white">{a?.name || `Token #${o.assetId}`}</span>
                      <span className="block text-xs text-[#6b7599]">Offer #{o.listingId} · token #{o.assetId}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-white">{Number(o.amount).toLocaleString()}<span className="block text-xs text-[#6b7599]">{a ? `${((o.amount / a.totalShares) * 100).toFixed(2)}%` : ""}</span></td>
                    <td className="px-5 py-3.5 text-right text-white font-semibold whitespace-nowrap">{formatMUSD(o.pricePerTokenFormatted)}</td>
                    <td className={`px-5 py-3.5 text-right whitespace-nowrap ${gap == null ? "text-[#6b7599]" : Math.abs(gap) > PRICE_WARNING_RATIO ? "text-amber-300" : "text-[#c3cae2]"}`}>
                      {gap == null ? "—" : `${gap > 0 ? "+" : ""}${(gap * 100).toFixed(0)}%`}
                    </td>
                    <td className="px-5 py-3.5 text-right text-white whitespace-nowrap">{formatMUSD(o.amount * o.pricePerTokenFormatted)}</td>
                    {showStatus
                      ? <td className="px-5 py-3.5"><Badge tone={tone}>{label}</Badge></td>
                      : <td className="px-5 py-3.5"><SellerTag kind={sellerKind(o, a?.ownerWallet)} mine={Boolean(wallet && o.seller.toLowerCase() === wallet)} /><span className="block mt-1 font-mono text-xs text-[#98a2c3]">{o.seller.slice(0, 6)}…{o.seller.slice(-4)}</span></td>}
                    <td className="px-5 py-3.5 text-[#c3cae2] whitespace-nowrap">{o.expiresAt ? fmtDate(o.expiresAt * 1000) : "No expiry"}</td>
                    <td className="px-5 py-3.5 text-right">{action(o)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function BuyModal({ selected, buying, buyStep, txHash, buyError, handleBuy, formatMUSD, refUsd, gapOf, byToken, onClose }) {
  const name = byToken.get(Number(selected.assetId))?.name || selected.assetName;
  const total = selected.amount * selected.pricePerTokenFormatted;
  const ref = refUsd(selected.assetId);
  const gap = gapOf(selected.assetId, selected.pricePerTokenFormatted);
  const high = gap != null && gap > PRICE_WARNING_RATIO;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Buy tokens">
      <div className={`${cardClass} w-full max-w-md p-6 space-y-4 relative`}>
        {!buying && <button onClick={onClose} className="absolute top-4 right-4 text-[#98a2c3] hover:text-white" aria-label="Close"><X className="w-5 h-5" /></button>}
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-indigo-500/15 text-indigo-300 flex items-center justify-center">{buyStep === "done" ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <Coins className="w-6 h-6" />}</span>
          <div>
            <h3 className="text-lg font-bold text-white">{buyStep === "done" ? "Tokens purchased" : buying ? "Processing purchase" : "Review purchase"}</h3>
            <p className="text-sm text-[#98a2c3]">{name} · offer #{selected.listingId}</p>
          </div>
        </div>
        <dl className="rounded-xl border border-[#1b2440] bg-[#0e1426] p-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-[#98a2c3]">Tokens</dt><dd className="text-white font-semibold">{selected.amount.toLocaleString()}</dd></div>
          <div className="flex justify-between"><dt className="text-[#98a2c3]">Price per token</dt><dd className="text-white">{formatMUSD(selected.pricePerTokenFormatted, { showCode: true })}</dd></div>
          {ref != null && <div className="flex justify-between"><dt className="text-[#98a2c3]">Approved value per token</dt><dd className="text-white">{formatMUSD(ref, { showCode: true })}</dd></div>}
          <div className="flex justify-between border-t border-[#1b2440] pt-2"><dt className="text-white font-semibold">You pay</dt><dd className="text-emerald-300 font-bold">{formatMUSD(total, { showCode: true })}</dd></div>
        </dl>
        {high && <p className="text-xs rounded-xl p-3 border border-amber-500/40 bg-amber-500/5 text-amber-200 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />This price is {(gap * 100).toFixed(0)}% above the property's approved value.</p>}
        {buying && (
          <ol className="space-y-2 text-sm rounded-xl border border-[#1b2440] bg-[#0e1426] p-3.5 text-[#c3cae2]">
            <li className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${buyStep === "approving" ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />Allow the mUSD payment</li>
            <li className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${buyStep === "purchasing" ? "bg-amber-400 animate-pulse" : "bg-[#29345a]"}`} />Swap payment and tokens on-chain</li>
          </ol>
        )}
        {buyError && <p role="alert" className="text-sm text-rose-300">{buyError}</p>}
        {buyStep === "done" && <p role="status" className="text-xs text-emerald-300 break-all">Tokens are in your wallet. Transaction {txHash}</p>}
        {!buying && buyStep !== "done" && <button onClick={() => handleBuy(selected)} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">Confirm with wallet</button>}
        {!buying && <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-[#1b2440] text-[#c3cae2] hover:bg-[#141c33] text-sm font-semibold">{buyStep === "done" ? "Done" : "Cancel"}</button>}
        <p className="text-xs text-[#6b7599]">Payment uses demo mUSD tokens. Network gas is paid separately in ETH.</p>
      </div>
    </div>
  );
}
