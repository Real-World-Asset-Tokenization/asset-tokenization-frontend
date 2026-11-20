import { useEffect, useState, useCallback } from "react";
import { Tag, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { resolveUserWallet } from "../lib/walletResolver";
import { checkAndSwitchNetwork } from "../services/contractService";
import { loadInvestorReturns } from "../services/investorReturns";
import { loadMyOffers, listTokensForSale, cancelOffer, tokensOnOffer, isLive } from "../services/tokenSales";
import { signClass } from "../lib/portfolioSummary";

// Lets an investor sell tokens they own on the marketplace and manage their offers.
export default function SellTokensPanel() {
  const { user } = useAuth();
  const wallet = resolveUserWallet(user);
  const { formatMUSD, convert } = useCurrency();
  const [holdings, setHoldings] = useState(null);
  const [offers, setOffers] = useState([]);
  const [feeRate, setFeeRate] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [selling, setSelling] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    if (!wallet) return;
    setError("");
    try {
      const [rows, mine] = await Promise.all([loadInvestorReturns(wallet), loadMyOffers(wallet)]);
      setHoldings(rows.filter((r) => r.balance > 0));
      setOffers(mine.offers);
      setFeeRate(mine.feeRate);
    } catch (e) {
      setError(e.message);
      setHoldings([]);
    }
  }, [wallet]);

  useEffect(() => { load(); }, [load]);
  // Arriving from the marketplace's "Sell my tokens" link.
  useEffect(() => {
    if (holdings && window.location.hash === "#sell") document.getElementById("sell")?.scrollIntoView({ behavior: "smooth" });
  }, [holdings]);

  const cancel = async (id) => {
    setBusy(id); setNotice(null);
    try {
      await checkAndSwitchNetwork();
      await cancelOffer(id);
      setNotice({ ok: true, text: `Offer #${id} cancelled. Those tokens are free to sell again.` });
      await load();
    } catch (e) {
      setNotice({ ok: false, text: e.reason || e.shortMessage || e.message });
    } finally { setBusy(null); }
  };

  if (!wallet) return null;
  const nameOf = (id) => holdings?.find((h) => h.id === id)?.name || `Asset #${id}`;
  const live = offers.filter((o) => isLive(o));

  return (
    <section id="sell" className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><Tag className="w-5 h-5 text-emerald-400" /> Sell my tokens</h2>
        <p className="text-sm text-zinc-400 mt-1">List tokens on the marketplace at your price. They stay in your wallet, and keep earning dividends, until a buyer pays. Then you receive mUSD automatically.</p>
      </div>
      {notice && <p role="status" className={`text-sm p-3 rounded-xl border ${notice.ok ? "border-emerald-500/30 text-emerald-300" : "border-rose-500/30 text-rose-300"}`}>{notice.text}</p>}
      {error && <p role="alert" className="text-amber-300 text-sm">{error}</p>}

      {holdings == null ? <p role="status" className="text-zinc-400 text-sm">Loading your tokens…</p> : !holdings.length ? (
        <p className="text-zinc-400 text-sm">You don't hold any tokens yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-zinc-400"><tr>{["Property", "You hold", "On sale", "Free to sell", ""].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
            <tbody>
              {holdings.map((h) => {
                const onSale = tokensOnOffer(offers, h.id);
                const free = h.balance - onSale;
                return (
                  <tr key={h.id} className="border-t border-zinc-800">
                    <td className="p-3">{h.name}</td>
                    <td className="p-3">{h.balance.toLocaleString()}</td>
                    <td className="p-3">{onSale.toLocaleString()}</td>
                    <td className="p-3">{free.toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <button disabled={free <= 0} onClick={() => { setNotice(null); setSelling({ ...h, free }); }}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-sm font-medium">Sell</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {offers.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">My sale offers</h3>
          <ul className="divide-y divide-zinc-800 text-sm">
            {offers.map((o) => (
              <li key={o.listingId} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <span>#{o.listingId} · {nameOf(o.assetId)} · {o.amount.toLocaleString()} tokens at {formatMUSD(o.priceUSD)} each
                  <span className="block text-xs text-zinc-500">
                    {isLive(o) ? (o.expiresAt ? `Open until ${new Date(o.expiresAt * 1000).toLocaleDateString()}` : "Open") : o.status === "Active" ? "Expired" : o.status}
                  </span>
                </span>
                {isLive(o) && (
                  <button disabled={busy != null} onClick={() => cancel(o.listingId)} className="px-3 py-1 rounded-lg border border-zinc-700 text-rose-300 hover:bg-zinc-800 disabled:opacity-50">
                    {busy === o.listingId ? "Cancelling…" : "Cancel"}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {live.length > 0 && <p className="text-xs text-zinc-500 mt-2">A buyer may take all or part of an offer. Whatever is unsold stays listed.</p>}
        </div>
      )}

      {selling && (
        <SellModal holding={selling} feeRate={feeRate} formatMUSD={formatMUSD} convert={convert}
          onClose={() => setSelling(null)}
          onDone={async (text) => { setSelling(null); setNotice({ ok: true, text }); await load(); }} />
      )}
    </section>
  );
}

function SellModal({ holding, feeRate, formatMUSD, convert, onClose, onDone }) {
  // Suggested price = latest approved valuation per token, in mUSD.
  const referenceUSD = Number(convert(holding.valuationLKR / holding.supply, "LKR", "USD").toFixed(2));
  const [amount, setAmount] = useState(holding.free);
  const [price, setPrice] = useState(referenceUSD);
  const [days, setDays] = useState(30);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const qty = Number(amount) || 0;
  const gross = qty * (Number(price) || 0);
  const fee = gross * feeRate;
  const net = gross - fee;
  // Average cost of the tokens being sold (same method the portfolio uses).
  const cost = holding.costUSD == null ? null : holding.costUSD * qty / holding.balance;
  const profit = cost == null ? null : net - cost;
  const vsValuation = referenceUSD > 0 ? ((Number(price) / referenceUSD - 1) * 100) : null;

  const submit = async (e) => {
    e.preventDefault();
    setWorking(true); setError("");
    try {
      await checkAndSwitchNetwork();
      await listTokensForSale({ assetId: holding.id, amount: qty, priceUSD: Number(price), days: Number(days) });
      onDone(`Listed ${qty} ${holding.name} tokens at ${formatMUSD(Number(price))} each. You'll be paid when a buyer purchases.`);
    } catch (err) {
      setError(err.reason || err.shortMessage || err.message || "Listing failed");
    } finally { setWorking(false); }
  };

  const input = "w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500";
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 relative">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white" aria-label="Close"><X className="w-5 h-5" /></button>
        <div>
          <h3 className="text-lg font-bold">Sell {holding.name} tokens</h3>
          <p className="text-xs text-zinc-400">You can sell up to {holding.free.toLocaleString()} tokens.</p>
        </div>

        <label className="block text-xs text-zinc-300">Number of tokens
          <input className={input} type="number" min="1" max={holding.free} step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        <label className="block text-xs text-zinc-300">Price per token (mUSD)
          <input className={input} type="number" min="0.01" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
          <span className="text-zinc-500">
            Valuation price: {formatMUSD(referenceUSD)} · <button type="button" className="text-blue-300" onClick={() => setPrice(referenceUSD)}>use it</button>
            {vsValuation != null && Number(price) > 0 && ` · yours is ${vsValuation >= 0 ? "+" : ""}${vsValuation.toFixed(1)}%`}
          </span>
        </label>
        <label className="block text-xs text-zinc-300">Keep the offer open for (days)
          <input className={input} type="number" min="1" max="90" value={days} onChange={(e) => setDays(e.target.value)} required />
        </label>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm space-y-1.5">
          <Row label="Sale price" value={formatMUSD(gross)} />
          <Row label={`Platform fee (${(feeRate * 100).toFixed(2)}%)`} value={`− ${formatMUSD(fee)}`} />
          <Row label="You receive" value={formatMUSD(net)} bold />
          <div className="border-t border-zinc-800 pt-1.5 space-y-1.5">
            <Row label="What these tokens cost you" value={cost == null ? "Unknown" : formatMUSD(cost)} />
            <Row label={profit != null && profit < 0 ? "Loss if sold" : "Profit if sold"} value={profit == null ? "—" : formatMUSD(profit)} cls={signClass(profit)} bold />
          </div>
          {cost == null && <p className="text-xs text-zinc-500">No purchase price is recorded for these tokens (e.g. received as a transfer), so profit can't be worked out.</p>}
        </div>

        {error && <p role="alert" className="text-xs text-rose-300 p-3 rounded-xl border border-rose-500/20">{error}</p>}
        <p className="text-xs text-zinc-500">MetaMask may ask twice: once to allow the marketplace to move your tokens (first sale only), then to create the offer. Gas is paid in ETH.</p>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-zinc-800 rounded-xl text-sm">Cancel</button>
          <button disabled={working} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-medium disabled:opacity-50">{working ? "Confirm in MetaMask…" : "List for sale"}</button>
        </div>
      </form>
    </div>
  );
}

function Row({ label, value, bold, cls = "" }) {
  return <div className={`flex justify-between ${bold ? "font-semibold text-white" : "text-zinc-400"}`}><span>{label}</span><span className={cls}>{value}</span></div>;
}
