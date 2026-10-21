import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Wallet, RefreshCw, ShoppingBag, Tag, Receipt, PlusCircle, Building2, TrendingUp, Info } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { resolveUserWallet } from "../lib/walletResolver";
import { summarizeHoldings, pct } from "../lib/portfolioSummary";
import { arrowOf } from "../lib/marketStats";
import { getPaymentTokenBalance } from "../services/contractService";
import { fetchVerifiedAssets } from "../services/tokenizationService";
import { loadInvestorReturns } from "../services/investorReturns";
import AddWalletModal from "../components/AddWalletModal";
import { Card, PageHeader, ActionButton, Stat, Badge, Empty, Skeleton, pageClass } from "../components/ui/dash";

// Colours that tell properties apart in the "where your money is" bar.
const SLICES = ["#1fe06f", "#38bdf8", "#fbbf24", "#f472b6", "#a78bfa", "#fb923c", "#2dd4bf"];

// "+$1,200.00 ▲ 4.20%" style gain text. Colour plus arrow plus sign, never colour alone.
function Change({ amount, percent, format }) {
  if (amount == null) return <span className="text-[#98a2c3]">Can't be worked out</span>;
  const c = amount > 0 ? "var(--up)" : amount < 0 ? "var(--down)" : "var(--ink-3)";
  return (
    <span style={{ color: c }} className="font-semibold tabular-nums">
      {arrowOf(amount)} {amount > 0 ? "+" : ""}{format(amount)}
      {percent != null && <span className="ml-1.5 text-[0.85em] opacity-90">({pct(percent)})</span>}
    </span>
  );
}

export default function Portfolio() {
  const { user } = useAuth();
  const wallet = resolveUserWallet(user);
  const { formatMUSD, convert } = useCurrency();
  const [data, setData] = useState(null);
  const [errors, setErrors] = useState([]);
  const [showAddWallet, setShowAddWallet] = useState(false);

  const load = useCallback(async () => {
    if (!wallet) { setData({ rows: [], cash: null, details: new Map() }); return; }
    setData(null); setErrors([]);
    const errs = [];
    const safe = (p, label, fallback) => p.catch(() => { errs.push(label); return fallback; });
    const [rows, cash, verified] = await Promise.all([
      safe(loadInvestorReturns(wallet), "your holdings", []),
      safe(getPaymentTokenBalance(wallet), "cash balance", null),
      safe(fetchVerifiedAssets(), "property details", []),
    ]);
    // Location and type come from the backend, matched to the on-chain token id.
    const details = new Map((verified || []).map((a) => [Number(a.blockchainAssetId ?? a.assetId), a]));
    setErrors(errs);
    setData({ rows, cash, details });
  }, [wallet]);

  useEffect(() => {
    load();
    if (!window.ethereum?.on) return undefined;
    window.ethereum.on("accountsChanged", load);
    return () => window.ethereum.removeListener?.("accountsChanged", load);
  }, [load]);

  const loading = data == null;
  const summary = data ? summarizeHoldings(data.rows.filter((r) => r.balance > 0 || r.hasHistory), [], convert) : null;
  const t = summary?.totals;
  const held = summary ? summary.holdings.filter((h) => h.balance > 0).sort((a, b) => b.valueUSD - a.valueUSD) : [];
  const v = (x) => (loading ? "…" : x);
  const unrealizedPct = t && t.invested > 0 ? (t.unrealized / t.invested) * 100 : null;

  if (!wallet) {
    return (
      <div className={pageClass}>
        <PageHeader title="My portfolio" subtitle="The properties you own a share of, what they are worth now and what you have earned." />
        <Card title="Link a wallet to see your portfolio" subtitle="Your shares are stored in a digital wallet. Link yours once and your holdings, and gains will appear here.">
          <ActionButton primary icon={PlusCircle} onClick={() => setShowAddWallet(true)}>Link my wallet</ActionButton>
        </Card>
        <AddWalletModal isOpen={showAddWallet} onClose={() => setShowAddWallet(false)} onSuccess={load} />
      </div>
    );
  }

  return (
    <div className={pageClass}>
      <PageHeader
        title="My portfolio"
        subtitle="The properties you own a share of, what they are worth now and what you have earned."
        actions={<>
          <ActionButton onClick={load} icon={RefreshCw}>Refresh</ActionButton>
          <ActionButton to="/marketplace" primary icon={ShoppingBag}>Buy more</ActionButton>
        </>}
      />

      {errors.length > 0 && (
        <p role="alert" className="text-sm text-amber-300 flex flex-wrap items-center gap-2">
          Could not load {errors.join(", ")}. Some numbers below may be missing.
          <button onClick={load} className="underline inline-flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Retry</button>
        </p>
      )}

      {/* 1. The answer first: what is it worth, and am I up or down? */}
      <section className="rounded-2xl border border-[#1b2440] bg-[#0b1124] p-5 sm:p-7 grid gap-6 lg:grid-cols-[1.4fr_1fr] items-center" aria-live="polite">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2c3]">Your property shares are worth</p>
          <p className="mt-2 text-4xl sm:text-5xl font-bold tracking-tight tabular-nums text-white">
            {loading ? <Skeleton className="h-12 w-64" /> : formatMUSD(t.currentValue)}
          </p>
          <p className="mt-3 text-base">
            {loading ? <Skeleton className="h-5 w-72" /> : t.invested > 0
              ? <>You put in {formatMUSD(t.invested)}. Since then <Change amount={t.unrealized} percent={unrealizedPct} format={formatMUSD} /></>
              : <span className="text-[#98a2c3]">Your purchase prices were not recorded, so gains can't be worked out.</span>}
          </p>
        </div>
        <div className="rounded-xl border border-[#1b2440] bg-[#0e1426] p-4 sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2c3]">Total return including sales</p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums">
            {loading ? <Skeleton className="h-8 w-48" /> : t.invested > 0 ? <Change amount={t.totalReturn} percent={t.totalReturnPct} format={formatMUSD} /> : "—"}
          </p>
          <p className="mt-2 text-xs text-[#98a2c3]">Counts the change in property value and the money you made selling shares.</p>
        </div>
      </section>

      {/* 2. Four plain numbers */}
      <div className="grid grid-cols-2 xl:grid-cols-2 gap-3 sm:gap-4">
        <Stat icon={Building2} label="Properties you own" value={v(held.length)} note="Different properties you hold shares in" />
        <Stat icon={Wallet} label="Cash available" value={v(formatMUSD(data?.cash))} note="Ready to buy more shares" />
      </div>

      {/* 3. Where the money is */}
      {!loading && held.length > 0 && (
        <Card title="Where your money is" subtitle="Share of your total value in each property.">
          <div
            role="img"
            aria-label={`Your value split: ${held.map((h) => `${h.name} ${(h.valueUSD / t.currentValue * 100).toFixed(0)}%`).join(", ")}`}
            className="flex h-3 w-full overflow-hidden rounded-full bg-[#141c33]"
          >
            {held.map((h, i) => (
              <span key={h.id} style={{ width: `${(h.valueUSD / t.currentValue) * 100}%`, background: SLICES[i % SLICES.length] }} className="h-full border-r border-[#0b1124] last:border-0" />
            ))}
          </div>
          <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
            {held.map((h, i) => (
              <li key={h.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 min-w-0">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: SLICES[i % SLICES.length] }} />
                  <span className="truncate text-[#c3cae2]">{h.name}</span>
                </span>
                <span className="tabular-nums text-white font-medium">{(h.valueUSD / t.currentValue * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 4. Each property, one card, readable top to bottom */}
      <section aria-labelledby="holdings-h" className="space-y-3">
        <h2 id="holdings-h" className="text-lg font-semibold text-white">Your properties</h2>
        {loading ? (
          <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-44 w-full rounded-2xl" />)}</div>
        ) : held.length === 0 ? (
          <Card>
            <Empty>You don't own any property shares yet. <Link to="/marketplace" className="text-indigo-300 underline">Browse properties on the marketplace →</Link></Empty>
          </Card>
        ) : held.map((h, i) => {
          const info = data.details.get(h.id);
          const ownPct = (h.balance / h.supply) * 100;
          const gainPct = h.unrealizedPct;
          const dir = h.unrealizedUSD == null ? "flat" : h.unrealizedUSD > 0 ? "up" : h.unrealizedUSD < 0 ? "down" : "flat";
          return (
            <article key={h.id} className="rounded-2xl border border-[#1b2440] bg-[#0b1124] p-5 sm:p-6" style={{ borderLeft: `3px solid ${SLICES[i % SLICES.length]}` }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-white">{h.name}</h3>
                  {info && <p className="text-sm text-[#98a2c3] mt-0.5">{[info.location, info.propertyType].filter(Boolean).join(" · ")}</p>}
                </div>
                <Badge tone={dir === "up" ? "good" : dir === "down" ? "bad" : "muted"}>
                  {dir === "up" ? "Gaining value" : dir === "down" ? "Lost value" : "No change yet"}
                </Badge>
              </div>

              <p className="mt-3 text-sm text-[#c3cae2]">
                You own <strong className="text-white">{h.balance.toLocaleString()}</strong> of {h.supply.toLocaleString()} shares
                <span className="text-[#98a2c3]"> ({ownPct.toFixed(ownPct < 1 ? 2 : 1)}% of this property)</span>
              </p>
              <div aria-hidden className="mt-2 h-1.5 rounded-full bg-[#141c33] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.max(ownPct, 1.5)}%`, background: SLICES[i % SLICES.length] }} />
              </div>

              <dl className="mt-5 grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4">
                <div><dt className="text-xs text-[#98a2c3]">Worth now</dt><dd className="mt-1 text-lg font-semibold text-white tabular-nums">{formatMUSD(h.valueUSD)}</dd></div>
                <div><dt className="text-xs text-[#98a2c3]">You paid</dt><dd className="mt-1 text-lg font-semibold text-white tabular-nums">{h.costUSD == null ? <span className="text-sm font-normal text-[#98a2c3]">Not recorded</span> : formatMUSD(h.costUSD)}</dd></div>
                <div><dt className="text-xs text-[#98a2c3]">Gain or loss</dt><dd className="mt-1 text-base"><Change amount={h.unrealizedUSD} percent={gainPct} format={formatMUSD} /></dd></div>
              </dl>

              <div className="mt-5 flex flex-wrap gap-2">
                <ActionButton to="/marketplace" primary icon={ShoppingBag}>Buy more</ActionButton>
                <ActionButton to="/marketplace/sell" icon={Tag}>Sell shares</ActionButton>
                <ActionButton to={`/tokenization/status/${info?.assetId ?? h.id}`} icon={Receipt}>Ownership record</ActionButton>
              </div>
            </article>
          );
        })}
      </section>

      {/* 5. How the total return is made up */}
      {!loading && t.invested > 0 && (
        <Card title="What makes up your return" subtitle="Two separate things add together.">
          <ul className="divide-y divide-[#1b2440]">
            {[
              ["Property value change", "How much the land is now valued above or below when you bought. Not cash until you sell.", t.unrealized, TrendingUp],
              ["Profit from selling shares", "Money made on shares you already sold, after the platform fee.", t.realized, Tag],
            ].map(([label, hint, amount, Icon]) => (
              <li key={label} className="flex items-center justify-between gap-4 py-3.5">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="mt-0.5 w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-indigo-300" /></span>
                  <div className="min-w-0"><p className="font-medium text-white">{label}</p><p className="text-sm text-[#98a2c3]">{hint}</p></div>
                </div>
                <Change amount={amount} format={formatMUSD} />
              </li>
            ))}
            <li className="flex items-center justify-between gap-4 pt-3.5">
              <p className="font-semibold text-white">Total return</p>
              <span className="text-lg"><Change amount={t.totalReturn} percent={t.totalReturnPct} format={formatMUSD} /></span>
            </li>
          </ul>
          {t.unknownCostCount > 0 && <p className="mt-2 text-sm text-amber-300">{t.unknownCostCount} {t.unknownCostCount === 1 ? "holding has" : "holdings have"} no recorded purchase price (for example shares received as a gift), so {t.unknownCostCount === 1 ? "its" : "their"} gain is left out of these totals.</p>}
        </Card>
      )}

      <details className="rounded-2xl border border-[#1b2440] bg-[#0b1124] px-5 py-4 text-sm text-[#c3cae2]">
        <summary className="flex items-center gap-2 font-medium text-white"><Info className="w-4 h-4 text-indigo-300" /> How are these numbers worked out?</summary>
        <ul className="mt-3 space-y-2 list-disc pl-5 text-[#98a2c3] leading-relaxed">
          <li><strong className="text-[#c3cae2]">Worth now</strong> is what you paid, adjusted by how much the property's official valuation has changed since you bought. It is a paper value, not cash you can withdraw.</li>
          <li><strong className="text-[#c3cae2]">You paid</strong> is the average price of the shares you still hold, from recorded marketplace purchases.</li>
          <li><strong className="text-[#c3cae2]">Gain or loss</strong> is worth now minus what you paid.</li>
          <li>Amounts exclude network fees and use the app's indicative exchange rates. They are not guaranteed sale prices.</li>
        </ul>
      </details>

      <AddWalletModal isOpen={showAddWallet} onClose={() => setShowAddWallet(false)} onSuccess={load} />
    </div>
  );
}
