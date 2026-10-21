import { useCallback, useEffect, useState } from "react";
import PropertyValueChart from "../../components/PropertyValueChart";
import { Link } from "react-router-dom";
import { Wallet, TrendingUp, Banknote, ShoppingBag, ArrowRight, Tag, RefreshCw, Building2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCurrency } from "../../context/CurrencyContext";
import { kycAPI } from "../../lib/api";
import { resolveUserWallet } from "../../lib/walletResolver";
import { summarizeHoldings, pct } from "../../lib/portfolioSummary";
import { kycSteps } from "../../lib/ownerData";
import { getPaymentTokenBalance } from "../../services/contractService";
import { loadInvestorReturns } from "../../services/investorReturns";
import { loadMyOffers, loadMyTrades, isLive } from "../../services/tokenSales";
import { useMarketplaceData } from "../../lib/marketplaceData";
import { useAllTrades } from "../../lib/useAllTrades";
import MarketWatch from "../../components/market/MarketWatch";
import { Card, CardLink, PageHeader, ActionButton, Stat, Badge, ProgressRing, Empty, ago, fmtDate, pageClass } from "../../components/ui/dash";

// Investor home: portfolio value, profit/loss, cash, holdings, trades and KYC.
// Everything is read from the blockchain or the backend; nothing is estimated.
export default function InvestorHome() {
  const { user } = useAuth();
  const wallet = resolveUserWallet(user);
  const { formatMUSD, convert } = useCurrency();
  const [data, setData] = useState(null);
  const [errors, setErrors] = useState([]);
  const market = useMarketplaceData({ wallet });
  const offersKey = market.listings.map((l) => `${l.listingId}:${l.amount}:${l.status}`).join(",");
  const marketTrades = useAllTrades(offersKey);

  const load = useCallback(async () => {
    setData(null); setErrors([]);
    const errs = [];
    const safe = (p, label, fallback) => p.catch(() => { errs.push(label); return fallback; });
    const [rows, cash, offers, trades, kyc] = await Promise.all([
      wallet ? safe(loadInvestorReturns(wallet), "holdings", []) : [],
      wallet ? safe(getPaymentTokenBalance(wallet), "cash balance", null) : null,
      wallet ? safe(loadMyOffers(wallet), "sale offers", { offers: [] }) : { offers: [] },
      wallet ? safe(loadMyTrades(wallet), "trades", []) : [],
      kycAPI.getKYCStatus().then((r) => r.data?.data || null).catch((e) => { if (e.response?.status !== 404) errs.push("KYC"); return null; }),
    ]);
    setErrors(errs);
    setData({ rows, cash, offers: offers.offers, trades, kyc });
  }, [wallet]);

  useEffect(() => { load(); }, [load]);

  const loading = data == null;
  const summary = data ? summarizeHoldings(data.rows.filter((r) => r.balance > 0 || r.hasHistory), [], convert) : null;
  const t = summary?.totals;
  const held = summary ? summary.holdings.filter((h) => h.balance > 0).sort((a, b) => b.valueUSD - a.valueUSD) : [];
  const liveOffers = (data?.offers || []).filter(isLive);
  const steps = kycSteps(data?.kyc);
  const kycPercent = Math.round((steps.filter((s) => s.done).length / steps.length) * 100);
  const kycApproved = data?.kyc?.verificationStatus === "approved";
  const firstName = (user?.name || "").split(" ")[0];
  const v = (x) => (loading ? "…" : x);

  return (
    <div className={pageClass}>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        subtitle="Your property tokens and returns at a glance."
        actions={<>
          <ActionButton to="/marketplace" primary icon={ShoppingBag}>Browse marketplace</ActionButton>
        </>}
      />

      {!wallet && (
        <Card title="Link a wallet to start" subtitle="Your holdings and returns are read from your blockchain wallet.">
          <ActionButton to="/portfolio" primary icon={Wallet}>Add wallet</ActionButton>
        </Card>
      )}

      {errors.length > 0 && (
        <p role="alert" className="text-sm text-amber-300 flex flex-wrap items-center gap-2">
          Could not load: {errors.join(", ")}.
          <button onClick={load} className="underline inline-flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Retry</button>
        </p>
      )}

      {wallet && (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          <Stat label="Portfolio value" icon={Wallet} to="/portfolio"
            value={v(formatMUSD(t?.currentValue ?? 0))}
            note={loading ? "" : `Invested ${formatMUSD(t.invested)} · by land-value change`} />
          <Stat label="Unrealized profit / loss" icon={TrendingUp} to="/profit-dashboard"
            tone={!t ? undefined : t.unrealized > 0 ? "up" : t.unrealized < 0 ? "down" : undefined}
            value={v(formatMUSD(t?.unrealized ?? 0))}
            note={loading ? "" : t.invested > 0 ? `${pct((t.unrealized / t.invested) * 100)} on cost` : "No purchase cost recorded"} />
          <Stat label="Cash balance" icon={Banknote}
            value={v(data?.cash == null ? "Unavailable" : formatMUSD(data.cash))}
            note="mUSD in your wallet" />
        </div>
      )}

      <PropertyValueChart />
      <Card title="Market watch" subtitle="Live prices from completed trades. Properties you hold come first." padded={false}
        action={<CardLink to="/marketplace?tab=market">Open market</CardLink>}>
        <MarketWatch compact limit={6} assets={market.assets} trades={marketTrades.trades} listings={market.listings} reference={market.reference}
          loading={market.assetsLoading || market.listingsLoading || marketTrades.trades == null} error={marketTrades.error || market.assetsError} />
      </Card>
      <div className="grid xl:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <Card title="Your holdings" subtitle="Valued at each property's latest approved valuation." padded={false}
            action={<CardLink to="/portfolio">View portfolio</CardLink>}>
            {loading ? <p className="px-6 pb-6 text-[#98a2c3]">Loading holdings…</p> : !held.length ? (
              <div className="px-6 pb-6"><Empty>You don't hold any property tokens yet. <Link to="/marketplace" className="text-indigo-300">Find a property →</Link></Empty></div>
            ) : (
              <ul>
                {held.slice(0, 5).map((h) => (
                  <li key={h.id} className="border-t border-[#1b2440] first:border-t-0">
                    <div className="flex items-center gap-3 sm:gap-4 px-5 sm:px-6 py-4">
                      <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-900/60 to-[#141c33] flex items-center justify-center shrink-0"><Building2 className="w-5 h-5 text-indigo-300" /></span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold truncate">{h.name}</span>
                        <span className="block text-sm text-[#98a2c3]">{h.balance.toLocaleString()} tokens · {((h.balance / h.supply) * 100).toFixed(2)}%</span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className="block font-semibold">{formatMUSD(h.valueUSD)}</span>
                        <span className={`block text-xs ${h.unrealizedUSD == null ? "text-[#6b7599]" : h.unrealizedUSD < 0 ? "text-rose-300" : "text-emerald-300"}`}>
                          {h.unrealizedUSD == null ? "Cost unknown" : `${h.unrealizedUSD >= 0 ? "+" : ""}${formatMUSD(h.unrealizedUSD)} (${pct(h.unrealizedPct)})`}
                        </span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Recent trades" subtitle="Completed marketplace purchases and sales." padded={false}>
            {loading ? <p className="px-6 pb-6 text-[#98a2c3]">Loading…</p> : !data.trades.length ? (
              <div className="px-6 pb-6"><Empty>No trades yet.</Empty></div>
            ) : (
              <ul>
                {data.trades.slice(0, 6).map((tr) => (
                  <li key={`${tr.txHash}-${tr.side}`} className="border-t border-[#1b2440] first:border-t-0 flex items-center gap-3 px-5 sm:px-6 py-3 text-sm">
                    <Badge tone={tr.side === "Bought" ? "info" : "good"}>{tr.side}</Badge>
                    <span className="flex-1 min-w-0 truncate">{tr.amount.toLocaleString()} × {tr.name}</span>
                    <span className="text-right shrink-0">
                      <span className="block font-semibold">{formatMUSD(tr.side === "Sold" ? tr.received : tr.total)}</span>
                      <span className="block text-xs text-[#6b7599]">{ago(tr.at)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Identity verification">
            {loading ? <Empty>Loading…</Empty> : (
              <div className="flex items-center gap-4">
                <ProgressRing percent={kycPercent} size={96} />
                <div className="min-w-0 space-y-2">
                  <Badge tone={kycApproved ? "good" : data.kyc?.verificationStatus === "rejected" ? "bad" : data.kyc ? "warn" : "muted"}>
                    {kycApproved ? "Verified" : data.kyc?.verificationStatus === "rejected" ? "Rejected" : data.kyc ? "In progress" : "Not started"}
                  </Badge>
                  <p className="text-sm text-[#98a2c3]">
                    {kycApproved ? `Verified${data.kyc.verifiedAt ? ` on ${fmtDate(data.kyc.verifiedAt)}` : ""}.` : `Next: ${steps.find((s) => !s.done)?.label.toLowerCase()}.`}
                  </p>
                  <Link to="/investor/kyc" className="inline-flex items-center gap-1 text-sm text-indigo-300">
                    {kycApproved ? "View details" : "Continue"} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </Card>

          <Card title="Selling" action={<CardLink to="/marketplace?tab=mine">My sales</CardLink>}>
            {loading ? <Empty>Loading…</Empty> : (
              <div className="flex items-center gap-3 text-sm">
                <Tag className="w-5 h-5 text-indigo-300" />
                <span className="text-[#c3cae2]">
                  {liveOffers.length
                    ? `${liveOffers.length} open sale offer${liveOffers.length === 1 ? "" : "s"} · ${liveOffers.reduce((s, o) => s + o.amount, 0).toLocaleString()} tokens listed`
                    : "No open sale offers."}
                </span>
              </div>
            )}
          </Card>

          {!loading && held.length > 0 && (
            <Card title="Total return">
              <p className={`text-2xl font-bold ${t.totalReturn < 0 ? "text-rose-300" : t.totalReturn > 0 ? "text-emerald-300" : "text-white"}`}>{formatMUSD(t.totalReturn)}</p>
              <p className="text-sm text-[#98a2c3] mt-1">{pct(t.totalReturnPct)} · unrealized + realized</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, strong }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[#98a2c3]">{k}</dt>
      <dd className={strong ? "font-bold text-amber-300" : "font-semibold text-white"}>{v}</dd>
    </div>
  );
}
