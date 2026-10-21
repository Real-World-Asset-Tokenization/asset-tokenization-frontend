import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Coins, Receipt, Tag, TrendingUp, RefreshCw, ShoppingBag } from "lucide-react";
import { useCurrency } from "../../context/CurrencyContext";
import { loadMyTrades, loadMyOffers, isLive } from "../../services/tokenSales";
import { Card, Stat, Skeleton, ActionButton, ago } from "../ui/dash";

const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");
const RANGES = [["7D", 7], ["30D", 30], ["ALL", Infinity]];
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const GREEN = "#1fe06f";

// Earnings graph: cumulative line, or daily bars, drawn from real completed sales.
function EarningsChart({ days, mode, formatMUSD }) {
  const W = 720, H = 240, L = 58, R = 14, T = 14, B = 30;
  if (!days.length) return null;
  const vals = days.map((d) => (mode === "total" ? d.cumulative : d.earned));
  const max = Math.max(...vals, 0.0001);
  const x = (i) => L + (days.length === 1 ? (W - L - R) / 2 : (i / (days.length - 1)) * (W - L - R));
  const y = (v) => T + (1 - v / max) * (H - T - B);
  const barW = Math.max(4, Math.min(36, ((W - L - R) / days.length) * 0.62));
  const ticks = [0, 0.5, 1].map((f) => max * f);
  const label = (d) => d.date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const line = days.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(vals[i]).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
      aria-label={`${mode === "total" ? "Total earned" : "Daily earnings"} from ${label(days[0])} to ${label(days[days.length - 1])}, reaching ${formatMUSD(vals[vals.length - 1])}`}>
      <defs>
        <linearGradient id="earnFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GREEN} stopOpacity="0.32" /><stop offset="100%" stopColor={GREEN} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity="0.12" strokeDasharray="4 5" />
          <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="currentColor" fillOpacity="0.65">{formatMUSD(t, { compact: true })}</text>
        </g>
      ))}
      {mode === "total" ? (
        <>
          <path d={`${line} L${x(days.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="url(#earnFill)" />
          <path d={line} fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {days.map((d, i) => d.earned > 0 && (
            <circle key={i} cx={x(i)} cy={y(vals[i])} r="4" fill={GREEN} stroke="#17181a" strokeWidth="1.5">
              <title>{`${label(d)}: +${formatMUSD(d.earned)} (total ${formatMUSD(d.cumulative)})`}</title>
            </circle>
          ))}
        </>
      ) : days.map((d, i) => (
        <rect key={i} x={x(i) - barW / 2} y={y(d.earned)} width={barW} height={Math.max(0, y(0) - y(d.earned))} rx="3" fill={d.earned > 0 ? GREEN : "currentColor"} fillOpacity={d.earned > 0 ? 0.9 : 0.12}>
          <title>{`${label(d)}: ${formatMUSD(d.earned)} from ${d.tokens.toLocaleString()} tokens`}</title>
        </rect>
      ))}
      {[0, Math.floor((days.length - 1) / 2), days.length - 1].filter((v, i, a) => a.indexOf(v) === i).map((i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"} fontSize="11" fill="currentColor" fillOpacity="0.65">{label(days[i])}</text>
      ))}
    </svg>
  );
}

// Sales and earnings for an asset owner: every completed purchase of their released tokens.
export default function OwnerSales({ wallet }) {
  const { formatMUSD } = useCurrency();
  const [state, setState] = useState({ trades: null, offers: null, error: "", at: null });
  const [range, setRange] = useState("30D");
  const [mode, setMode] = useState("total");

  const load = useCallback(async () => {
    if (!wallet) return;
    try {
      const [trades, offers] = await Promise.all([loadMyTrades(wallet), loadMyOffers(wallet).then((r) => r.offers).catch(() => null)]);
      setState({ trades, offers, error: "", at: new Date() });
    } catch {
      setState((s) => ({ ...s, trades: s.trades || [], error: "Your sales could not be read from the blockchain.", at: new Date() }));
    }
  }, [wallet]);

  // Load now, then every 30 seconds so a new purchase shows up without a reload.
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const sales = useMemo(() => (state.trades || []).filter((t) => t.side === "Sold").sort((a, b) => a.at - b.at), [state.trades]);
  const stats = useMemo(() => {
    const tokens = sales.reduce((s, t) => s + t.amount, 0);
    const earned = sales.reduce((s, t) => s + (t.received || 0), 0);
    const gross = sales.reduce((s, t) => s + t.total, 0);
    const onSale = state.offers == null ? null : state.offers.filter(isLive).reduce((s, o) => s + o.amount, 0);
    return { tokens, earned, gross, fee: gross - earned, avg: tokens ? gross / tokens : null, onSale };
  }, [sales, state.offers]);

  const days = useMemo(() => {
    if (!sales.length) return [];
    const span = RANGES.find(([k]) => k === range)[1];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const first = new Date(sales[0].at); first.setHours(0, 0, 0, 0);
    const start = span === Infinity ? first : new Date(today.getTime() - (span - 1) * 86400e3);
    const byDay = new Map();
    for (const t of sales) {
      const k = dayKey(t.at); const cur = byDay.get(k) || { earned: 0, tokens: 0 };
      byDay.set(k, { earned: cur.earned + (t.received || 0), tokens: cur.tokens + t.amount });
    }
    let cumulative = sales.filter((t) => t.at < start).reduce((s, t) => s + (t.received || 0), 0);
    const out = [];
    for (let d = new Date(start); d <= today; d = new Date(d.getTime() + 86400e3)) {
      const e = byDay.get(dayKey(d)) || { earned: 0, tokens: 0 };
      cumulative += e.earned;
      out.push({ date: new Date(d), ...e, cumulative });
    }
    return out;
  }, [sales, range]);

  const byProperty = useMemo(() => {
    const m = new Map();
    for (const t of sales) { const c = m.get(t.assetId) || { name: t.name, tokens: 0, earned: 0 }; m.set(t.assetId, { ...c, tokens: c.tokens + t.amount, earned: c.earned + (t.received || 0) }); }
    return [...m.values()].sort((a, b) => b.earned - a.earned);
  }, [sales]);
  const recent = [...sales].reverse().slice(0, 6);
  const dayAgo = Date.now() - 86400e3;
  const newToday = sales.filter((t) => t.at.getTime() > dayAgo);

  if (!wallet) {
    return <Card title="Sales & earnings" subtitle="Link a wallet to see what buyers purchase from you." />;
  }
  const loading = state.trades == null;
  const v = (x) => (loading ? "…" : x);

  return (
    <section aria-labelledby="sales-h" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="sales-h" className="text-xl font-bold text-white">Sales & earnings</h2>
          <p className="text-sm text-[#98a2c3]">What buyers have purchased from your released tokens, and what you earned after the platform fee.</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#98a2c3]">
          {state.at && <span>Updated {state.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
          <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-[#1b2440] bg-[#0e1426] px-3 py-1.5 font-semibold text-[#c3cae2] hover:text-white"><RefreshCw className="w-3.5 h-3.5" />Refresh</button>
        </div>
      </div>

      {state.error && <p role="alert" className="text-sm text-amber-300">{state.error} <button type="button" onClick={load} className="underline">Retry</button></p>}

      {newToday.length > 0 && (
        <p role="status" className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <ShoppingBag className="w-4 h-4" />
          <span><b>{newToday.length} new {newToday.length === 1 ? "sale" : "sales"}</b> in the last 24 hours: {newToday.reduce((s, t) => s + t.amount, 0).toLocaleString()} tokens, <b>{formatMUSD(newToday.reduce((s, t) => s + (t.received || 0), 0))}</b> earned.</span>
        </p>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Stat icon={TrendingUp} label="You earned" value={v(formatMUSD(stats.earned))} tone={stats.earned > 0 ? "up" : undefined} note="After the platform fee" />
        <Stat icon={Coins} label="Tokens sold" value={v(stats.tokens.toLocaleString())} note={`${sales.length} ${sales.length === 1 ? "sale" : "sales"}`} />
        <Stat icon={Receipt} label="Average price" value={v(stats.avg != null ? formatMUSD(stats.avg) : "—")} note="Per token sold" />
        <Stat icon={Tag} label="Still for sale" value={v(stats.onSale == null ? "—" : stats.onSale.toLocaleString())} note="Tokens in open offers" to="/owner/release" />
      </div>

      {loading ? <Skeleton className="h-72 w-full rounded-2xl" /> : !sales.length ? (
        <Card title="No sales yet" subtitle="When a buyer purchases tokens you released, the sale, the buyer and your earnings appear here.">
          <ActionButton to="/owner/release" primary icon={Tag}>Release tokens</ActionButton>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_380px] items-start">
          <div className="rounded-2xl border border-[#1b2440] bg-[#0b1124] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">{mode === "total" ? "Total earned over time" : "Earned each day"}</h3>
                <p className="text-xs text-[#98a2c3]">{mode === "total" ? "Runs up with every sale." : "How much each day's sales brought in."}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div role="group" aria-label="Chart type" className="flex gap-1 rounded-xl bg-[#1b1c1f] p-1">
                  {[["total", "Total"], ["daily", "Daily"]].map(([k, l]) => (
                    <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${mode === k ? "bg-[#1fe06f] text-[#04130a]" : "text-[#a1a1aa] hover:text-white"}`}>{l}</button>
                  ))}
                </div>
                <div role="group" aria-label="Date range" className="flex gap-1 rounded-xl bg-[#1b1c1f] p-1">
                  {RANGES.map(([k]) => (
                    <button key={k} type="button" aria-pressed={range === k} onClick={() => setRange(k)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${range === k ? "bg-[#1fe06f] text-[#04130a]" : "text-[#a1a1aa] hover:text-white"}`}>{k}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 text-[#98a2c3]"><EarningsChart days={days} mode={mode} formatMUSD={formatMUSD} /></div>
            <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-[#1b2440] pt-3 text-sm">
              <div><dt className="text-xs text-[#98a2c3]">Buyers paid</dt><dd className="font-semibold text-white tabular-nums">{formatMUSD(stats.gross)}</dd></div>
              <div><dt className="text-xs text-[#98a2c3]">Platform fee</dt><dd className="font-semibold tabular-nums" style={{ color: "var(--down)" }}>− {formatMUSD(stats.fee)}</dd></div>
              <div><dt className="text-xs text-[#98a2c3]">You received</dt><dd className="font-semibold tabular-nums" style={{ color: "var(--up)" }}>{formatMUSD(stats.earned)}</dd></div>
            </dl>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[#1b2440] bg-[#0b1124] p-5">
              <h3 className="text-base font-semibold text-white">Latest sales</h3>
              <ul className="mt-3 divide-y divide-[#1b2440]">
                {recent.map((t) => (
                  <li key={`${t.txHash}-${t.listingId}`} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{t.name}</p>
                        <p className="text-xs text-[#98a2c3]">Bought by <span className="font-mono">{short(t.buyer)}</span> · {ago(t.at)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold tabular-nums" style={{ color: "var(--up)" }}>+ {formatMUSD(t.received)}</p>
                        <p className="text-xs text-[#98a2c3] tabular-nums">{t.amount.toLocaleString()} tokens @ {formatMUSD(t.amount ? t.total / t.amount : 0)}</p>
                      </div>
                    </div>
                    {t.at.getTime() > dayAgo && <span className="mt-1 inline-block rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">New</span>}
                  </li>
                ))}
              </ul>
              <Link to="/marketplace?tab=mine" className="mt-3 inline-block text-sm font-semibold text-indigo-300 hover:underline">All sales →</Link>
            </div>

            {byProperty.length > 0 && (
              <div className="rounded-2xl border border-[#1b2440] bg-[#0b1124] p-5">
                <h3 className="text-base font-semibold text-white">Earnings by property</h3>
                <ul className="mt-3 space-y-3">
                  {byProperty.map((p) => (
                    <li key={p.name}>
                      <div className="flex items-center justify-between gap-3 text-sm"><span className="truncate text-[#c3cae2]">{p.name}</span><span className="font-semibold text-white tabular-nums">{formatMUSD(p.earned)}</span></div>
                      <div className="mt-1.5 h-2 rounded-full bg-[#3f4045] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${stats.earned ? (p.earned / stats.earned) * 100 : 0}%`, background: GREEN }} /></div>
                      <p className="mt-1 text-xs text-[#98a2c3]">{p.tokens.toLocaleString()} tokens sold</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
