import { useEffect, useMemo, useState } from "react";
import { useCurrency } from "../../context/CurrencyContext";
import { loadTradeHistory } from "../../services/tokenSales";
import { isActiveOffer } from "../../lib/marketplaceData";
import StockChart from "./StockChart";
import OrderBook from "./OrderBook";

// Chart + order book for one property, reloaded whenever its offers change.
export default function MarketPanel({ asset, listings, referenceLKR, wallet }) {
  const { formatMUSD, convert } = useCurrency();
  const [trades, setTrades] = useState(null);
  const [error, setError] = useState("");
  const offers = useMemo(() => listings.filter((o) => Number(o.assetId) === Number(asset.tokenId) && isActiveOffer(o)), [listings, asset.tokenId]);
  const key = listings.map((l) => `${l.listingId}:${l.amount}:${l.status}`).join(",");

  useEffect(() => {
    let cancelled = false;
    setError("");
    loadTradeHistory(asset.tokenId)
      .then((rows) => { if (!cancelled) setTrades(rows.map((r) => ({ t: r.at.getTime(), price: r.price, amount: r.amount }))); })
      .catch(() => { if (!cancelled) { setTrades((t) => t || []); setError("Trade history could not be loaded from the blockchain."); } });
    return () => { cancelled = true; };
  }, [asset.tokenId, key]);

  const approved = referenceLKR != null ? convert(referenceLKR, "LKR", "USD") : null;
  const ask = offers.length ? Math.min(...offers.map((o) => o.pricePerTokenFormatted)) : null;

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
      {trades == null
        ? <p className="rounded-2xl border border-[#1b2440] bg-[#0b1124] p-6 text-[#98a2c3]">Loading market…</p>
        : <>
            <StockChart trades={trades} approved={approved} ask={ask} formatMUSD={formatMUSD} title={`${asset.name} · price per token`} />
            <OrderBook offers={offers} trades={trades} wallet={wallet} formatMUSD={formatMUSD} ownerWallet={asset.ownerWallet} />
          </>}
    </div>
  );
}
