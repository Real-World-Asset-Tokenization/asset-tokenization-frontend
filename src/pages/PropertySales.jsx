import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { Building2, CheckCircle2, AlertTriangle, RefreshCw, Gavel, Vote, Wallet } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { resolveUserWallet } from "../lib/walletResolver";
import { salesAPI } from "../lib/api";
import { getContracts, trackTxGas } from "../services/contractService";
import { useMarketplaceData } from "../lib/marketplaceData";
import { Card, Badge, Skeleton, PageHeader, ActionButton, pageClass, fmtDate } from "../components/ui/dash";

const TONE = { Pending: "warn", Voting: "info", Approved: "good", Rejected: "bad", Settled: "good", Cancelled: "muted" };
const DURATIONS = [3, 7, 14, 30];
const inputCls = "w-full px-4 py-3 rounded-xl border border-[#1b2440] bg-[#0e1426] text-white font-semibold tabular-nums outline-none focus:border-indigo-500";
const btn = "px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
const primaryBtn = `${btn} bg-indigo-600 hover:bg-indigo-500 text-white`;
const ghostBtn = `${btn} border border-[#1b2440] bg-[#0e1426] hover:bg-[#141c33] text-white`;

const messageOf = (err) => err?.response?.data?.message || err.reason || err.shortMessage || err.message || "Something went wrong";

// Full-property sale: a buyer offers a price for the whole property, token holders vote (a signed
// vote costs the holder no gas), the platform confirms the legal transfer, and the price is paid
// out to every holder by the tokens they held when voting opened.
export default function PropertySales() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const wallet = resolveUserWallet(user);
  const { formatMUSD } = useCurrency();
  const { assets } = useMarketplaceData({ wallet });
  const [offers, setOffers] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      setOffers((await salesAPI.list()).data.data);
    } catch (err) {
      setOffers([]);
      setError(messageOf(err));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className={pageClass}>
      <PageHeader
        title="Property sales"
        subtitle="A buyer can offer to buy a whole property. Token holders vote, and the sale goes ahead only if more than half of ALL tokens vote yes. Everyone is then paid by the tokens they hold, whether or not they voted yes."
        actions={<ActionButton onClick={load} icon={RefreshCw}>Refresh</ActionButton>}
      />

      {error && <p role="alert" className="text-sm text-amber-300 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</p>}

      {!isAdmin && <MakeOffer assets={assets} wallet={wallet} onDone={load} />}

      {offers === null ? (
        <div className="space-y-4"><Skeleton className="h-56 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" /></div>
      ) : offers.length === 0 ? (
        <Card title="No sale offers yet" subtitle="When a buyer offers to buy a whole property it will appear here for token holders to vote on." />
      ) : (
        <div className="space-y-4">
          {offers.map((offer) => <OfferCard key={offer.offerId} offer={offer} wallet={wallet} isAdmin={isAdmin} formatMUSD={formatMUSD} onChanged={load} />)}
        </div>
      )}
    </div>
  );
}

function MakeOffer({ assets, wallet, onDone }) {
  const { formatMUSD } = useCurrency();
  const [assetId, setAssetId] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  useEffect(() => { if (!assetId && assets.length) setAssetId(String(assets[0].tokenId)); }, [assets, assetId]);
  const amount = Number(price);
  const valid = assetId && amount > 0 && wallet;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setMsg({ type: "", text: "" });
    try {
      setBusy("approve");
      const { saleContract, paymentTokenContract, addrs, runner } = await getContracts(true);
      if (!saleContract) throw new Error("PropertySale is not deployed. Redeploy the contracts.");
      const signer = await runner.getAddress();
      const base = ethers.parseUnits(amount.toFixed(6), 6);
      if ((await paymentTokenContract.balanceOf(signer)) < base) throw new Error("Your wallet does not hold enough mUSD to escrow this offer.");
      if ((await paymentTokenContract.allowance(signer, addrs.propertySaleAddress)) < base) {
        await (await paymentTokenContract.approve(addrs.propertySaleAddress, base)).wait();
      }
      setBusy("offer");
      const receipt = await (await saleContract.createOffer(assetId, addrs.paymentTokenAddress, base, days * 86400)).wait();
      trackTxGas(receipt.hash, "SaleOffer", signer, "Investor", assetId).catch(() => {});
      setMsg({ type: "ok", text: `Offer sent. ${formatMUSD(amount)} is held in escrow until the platform opens voting.` });
      setPrice("");
      onDone();
    } catch (err) {
      setMsg({ type: "err", text: messageOf(err) });
    } finally {
      setBusy("");
    }
  };

  return (
    <Card title="Offer to buy a whole property" subtitle="Your price is held in escrow from the moment you offer. If the vote fails you can take it back.">
      {!wallet ? (
        <p className="text-sm text-[#98a2c3] flex items-center gap-2"><Wallet className="w-4 h-4" /> Link your wallet first (Connect wallet in the top bar).</p>
      ) : !assets.length ? (
        <p className="text-sm text-[#98a2c3]">No tokenized properties are available yet.</p>
      ) : (
        <form onSubmit={submit} className="grid md:grid-cols-[1fr_200px_160px_auto] gap-3 items-end">
          <label className="text-xs text-[#98a2c3]">Property
            <select value={assetId} onChange={(e) => setAssetId(e.target.value)} disabled={!!busy} className={`${inputCls} mt-1`}>
              {assets.map((a) => <option key={a.tokenId} value={a.tokenId}>{a.name}</option>)}
            </select>
          </label>
          <label className="text-xs text-[#98a2c3]">Price for the whole property (mUSD)
            <input type="number" min="0.01" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} disabled={!!busy} required className={`${inputCls} mt-1`} />
          </label>
          <label className="text-xs text-[#98a2c3]">Voting lasts
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} disabled={!!busy} className={`${inputCls} mt-1`}>
              {DURATIONS.map((d) => <option key={d} value={d}>{d} days</option>)}
            </select>
          </label>
          <button type="submit" disabled={!valid || !!busy} className={primaryBtn}>{busy === "approve" ? "Approve in MetaMask…" : busy === "offer" ? "Confirm in MetaMask…" : "Send offer"}</button>
        </form>
      )}
      {msg.text && (
        <p role={msg.type === "err" ? "alert" : "status"} className={`mt-3 text-sm flex gap-2 ${msg.type === "err" ? "text-rose-300" : "text-emerald-300"}`}>
          {msg.type === "err" ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}{msg.text}
        </p>
      )}
    </Card>
  );
}

function OfferCard({ offer, wallet, isAdmin, formatMUSD, onChanged }) {
  const [viewer, setViewer] = useState(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  const loadViewer = useCallback(async () => {
    if (!wallet) { setViewer(null); return; }
    try { setViewer((await salesAPI.get(offer.offerId, wallet)).data.viewer); } catch { setViewer(null); }
  }, [offer.offerId, wallet, offer.status, offer.yesVotes, offer.noVotes]);
  useEffect(() => { loadViewer(); }, [loadViewer]);

  const run = async (label, fn, okText) => {
    setBusy(label); setMsg({ type: "", text: "" });
    try {
      const result = await fn();
      setMsg({ type: "ok", text: typeof okText === "function" ? okText(result) : okText });
      await onChanged();
      await loadViewer();
    } catch (err) {
      setMsg({ type: "err", text: messageOf(err) });
    } finally {
      setBusy("");
    }
  };

  const signVote = (support) => run("vote", async () => {
    const { saleContract, addrs, runner } = await getContracts(true);
    if (!saleContract) throw new Error("PropertySale is not deployed. Redeploy the contracts.");
    const chainId = (await runner.provider.getNetwork()).chainId;
    const signature = await runner.signTypedData(
      { name: "PropertySale", version: "1", chainId, verifyingContract: addrs.propertySaleAddress },
      { Vote: [{ name: "offerId", type: "uint256" }, { name: "support", type: "uint8" }] },
      { offerId: offer.offerId, support },
    );
    return salesAPI.vote(offer.offerId, support, signature);
  }, "Vote signed. The platform submits it for you, so it costs you no gas.");

  const voteOnChain = (support) => run("vote", async () => {
    const { saleContract, runner } = await getContracts(true);
    const receipt = await (await saleContract.castVote(offer.offerId, support)).wait();
    trackTxGas(receipt.hash, "SaleVote", await runner.getAddress(), "Investor", offer.assetId).catch(() => {});
  }, "Vote recorded on the blockchain.");

  const withdraw = () => run("withdraw", async () => {
    const { saleContract } = await getContracts(true);
    await (await saleContract.withdrawOffer(offer.offerId)).wait();
  }, "Your escrowed price was returned.");

  const claim = () => run("claim", async () => {
    const { saleContract, runner } = await getContracts(true);
    const signer = await runner.getAddress();
    const { data } = await salesAPI.payout(offer.offerId, signer);
    const receipt = await (await saleContract.claim(offer.offerId, data.data.amount, data.data.proof)).wait();
    trackTxGas(receipt.hash, "SaleClaim", signer, "Investor", offer.assetId).catch(() => {});
  }, "Your share of the sale was paid to your wallet.");

  const admin = (label, call, text) => run(label, () => call(offer.offerId), text);

  const half = offer.totalShares / 2;
  const yesPct = offer.totalShares ? (offer.yesVotes / offer.totalShares) * 100 : 0;
  const noPct = offer.totalShares ? (offer.noVotes / offer.totalShares) * 100 : 0;
  const now = Date.now() / 1000;
  const votingOpen = offer.statusLabel === "Voting" && offer.votingEndsAt > now;
  const isBuyer = wallet && offer.buyer.toLowerCase() === wallet;
  const canVote = votingOpen && viewer && viewer.votingWeight > 0 && !viewer.hasVotedOnChain && !viewer.signedVote;
  const finalizable = offer.statusLabel === "Voting" && (offer.yesVotes > half || offer.noVotes >= half || offer.votingEndsAt <= now);

  return (
    <Card
      title={`Offer #${offer.offerId}: ${offer.assetName}`}
      subtitle={`${formatMUSD(offer.price)} for the whole property · from ${offer.buyer.slice(0, 6)}…${offer.buyer.slice(-4)}${isBuyer ? " (you)" : ""}`}
      action={<Badge tone={TONE[offer.statusLabel] || "muted"}>{offer.statusLabel}</Badge>}
    >
      <div className="space-y-4">
        {["Voting", "Approved", "Settled", "Rejected"].includes(offer.statusLabel) && (
          <div>
            <div className="flex justify-between text-xs text-[#98a2c3] mb-1.5">
              <span>Yes {offer.yesVotes.toLocaleString()} · No {offer.noVotes.toLocaleString()} of {offer.totalShares.toLocaleString()} tokens</span>
              <span>Needs more than {half.toLocaleString()} yes</span>
            </div>
            <div className="relative h-3 rounded-full bg-[#1b2440] overflow-hidden" role="img" aria-label={`${yesPct.toFixed(1)}% yes, ${noPct.toFixed(1)}% no of all tokens`}>
              <div className="absolute inset-y-0 left-0 bg-emerald-400" style={{ width: `${yesPct}%` }} />
              <div className="absolute inset-y-0 bg-rose-400" style={{ left: `${yesPct}%`, width: `${noPct}%` }} />
              <div className="absolute inset-y-0 w-0.5 bg-white" style={{ left: "50%" }} />
            </div>
            {offer.votingEndsAt > 0 && (
              <p className="text-xs text-[#98a2c3] mt-1.5">{votingOpen ? `Voting ends ${fmtDate(offer.votingEndsAt * 1000)}` : `Voting ended ${fmtDate(offer.votingEndsAt * 1000)}`}
                {offer.pendingSignedVotes > 0 ? ` · ${offer.pendingSignedVotes} signed vote${offer.pendingSignedVotes === 1 ? "" : "s"} waiting for the platform to submit` : ""}</p>
            )}
          </div>
        )}

        {offer.statusLabel === "Pending" && <p className="text-sm text-[#98a2c3]">The price is in escrow. The platform reviews the offer and then opens voting. Trading of this property's tokens is not paused until voting opens.</p>}
        {offer.statusLabel === "Voting" && <p className="text-sm text-[#98a2c3] flex gap-2"><Building2 className="w-4 h-4 shrink-0 mt-0.5" />Token transfers for this property are paused while voting is open, so everyone's share is fixed.</p>}
        {offer.statusLabel === "Approved" && <p className="text-sm text-[#98a2c3]">The vote passed. The sale completes only after the platform confirms the legal transfer and payment conditions.</p>}

        {viewer && votingOpen && (
          <p className="text-sm text-[#c3cae2]">
            {viewer.votingWeight > 0 ? `Your voting power: ${viewer.votingWeight.toLocaleString()} tokens (${((viewer.votingWeight / offer.totalShares) * 100).toFixed(2)}%). ` : "Your wallet held no tokens when voting opened, so you cannot vote. "}
            {viewer.signedVote ? `You signed a ${viewer.signedVote.support === 1 ? "yes" : "no"} vote${viewer.signedVote.relayed ? " and it was counted." : "; it will be counted when the platform submits it."}` : viewer.hasVotedOnChain ? "You have voted." : ""}
          </p>
        )}

        {viewer?.payout && (
          <p className="text-sm text-emerald-300">Your payout: {formatMUSD(viewer.payout.amount)} {viewer.payout.claimed ? "(claimed)" : ""}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {canVote && (
            <>
              <button disabled={!!busy} onClick={() => signVote(1)} className={primaryBtn}><Vote className="inline w-4 h-4 mr-1.5" />Vote yes (free)</button>
              <button disabled={!!busy} onClick={() => signVote(2)} className={ghostBtn}>Vote no (free)</button>
              <button disabled={!!busy} onClick={() => voteOnChain(1)} className={ghostBtn}>Vote yes on-chain (pays gas)</button>
              <button disabled={!!busy} onClick={() => voteOnChain(2)} className={ghostBtn}>Vote no on-chain (pays gas)</button>
            </>
          )}
          {isBuyer && ["Pending", "Rejected"].includes(offer.statusLabel) && (
            <button disabled={!!busy} onClick={withdraw} className={ghostBtn}>{busy === "withdraw" ? "Withdrawing…" : "Take my escrow back"}</button>
          )}
          {offer.statusLabel === "Settled" && viewer?.payout && !viewer.payout.claimed && (
            <button disabled={!!busy} onClick={claim} className={primaryBtn}>{busy === "claim" ? "Claiming…" : `Claim ${formatMUSD(viewer.payout.amount)}`}</button>
          )}
        </div>

        {isAdmin && (
          <div className="rounded-xl border border-[#1b2440] bg-[#0e1426] p-3.5 space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#98a2c3] flex items-center gap-1.5"><Gavel className="w-3.5 h-3.5" />Platform actions</p>
            <div className="flex flex-wrap gap-2">
              {offer.statusLabel === "Pending" && <button disabled={!!busy} onClick={() => admin("open", salesAPI.open, "Voting is open and transfers are paused.")} className={primaryBtn}>{busy === "open" ? "Opening…" : "Open voting"}</button>}
              {offer.statusLabel === "Voting" && (
                <>
                  <button disabled={!!busy || offer.pendingSignedVotes === 0} onClick={() => admin("relay", salesAPI.relayVotes, (r) => `Submitted ${r.data.relayed} signed votes in one transaction (${r.data.counted} counted).`)} className={primaryBtn}>
                    {busy === "relay" ? "Submitting…" : `Submit ${offer.pendingSignedVotes} signed vote${offer.pendingSignedVotes === 1 ? "" : "s"}`}
                  </button>
                  <button disabled={!!busy || !finalizable} onClick={() => admin("finalize", salesAPI.finalize, (r) => `Result: ${r.data.status}.`)} className={ghostBtn}>{busy === "finalize" ? "Finalizing…" : "Finalize vote"}</button>
                </>
              )}
              {offer.statusLabel === "Approved" && (
                <button disabled={!!busy} onClick={() => admin("confirm", salesAPI.confirm, (r) => `Sale confirmed. Payouts published for ${r.data.holders} holders.`)} className={primaryBtn}>{busy === "confirm" ? "Confirming…" : "Confirm legal transfer & publish payouts"}</button>
              )}
              {["Pending", "Voting", "Approved"].includes(offer.statusLabel) && (
                <button disabled={!!busy} onClick={() => admin("cancel", salesAPI.cancel, "Offer cancelled and the escrow returned to the buyer.")} className={`${btn} border border-rose-500/40 text-rose-300 hover:bg-rose-500/10`}>{busy === "cancel" ? "Cancelling…" : "Cancel offer & refund buyer"}</button>
              )}
            </div>
            {offer.statusLabel === "Voting" && !finalizable && <p className="text-xs text-[#98a2c3]">Finalizing is possible once yes passes half of all tokens, no makes approval impossible, or the voting time ends.</p>}
          </div>
        )}

        {msg.text && (
          <p role={msg.type === "err" ? "alert" : "status"} className={`text-sm flex gap-2 ${msg.type === "err" ? "text-rose-300" : "text-emerald-300"}`}>
            {msg.type === "err" ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}{msg.text}
          </p>
        )}
      </div>
    </Card>
  );
}
