import { useEffect, useMemo, useRef, useState } from "react";
import { useCurrency } from "../context/CurrencyContext";
import { valuationApi } from "../services/valuationApi";
import { loadTradeHistory } from "../services/tokenSales";
import { cardClass } from "./ui/dash";

// Series colors validated (dataviz validate_palette, dark mode, surface #0b1124): all checks pass.
const C = {
  approved: "#4ade80",
  trade: "#e5612f",
  surface: "#0b1124",
  grid: "#1b2440",
  axis: "#29345a",
  ink: "#ffffff",
  ink2: "#c3cae2",
  muted: "#6b7599",
};
const moveColor = (d) => (d > 0 ? "#22e07a" : d < 0 ? "#ff5252" : C.trade);
const H = 300;
const M = { top: 48, right: 64, bottom: 36, left: 64 };

/**
 * Price history for one property token, on one axis (mUSD per token):
 *  - approved value per token: the published on-chain valuation ÷ supply, a step line
 *    that only moves when a revaluation is published (marked with a dotted line + label)
 *  - trade price per token: every completed marketplace purchase
 * Both series come from the blockchain; nothing is estimated.
 */
export default function PriceHistoryChart({ tokenId, supply, title = "Price history" }) {
  const { formatMUSD, convert } = useCurrency();
  const [raw, setRaw] = useState(null);
  const [error, setError] = useState("");
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRaw(null); setError("");
    Promise.all([valuationApi.history(tokenId), loadTradeHistory(tokenId)])
      .then(([history, trades]) => { if (!cancelled) setRaw({ history, trades }); })
      .catch((e) => { if (!cancelled) setError(e.message || "Price history could not be loaded."); });
    return () => { cancelled = true; };
  }, [tokenId]);

  const data = useMemo(() => {
    if (!raw || !supply) return null;
    const perToken = (lkr) => convert(Number(lkr) / Number(supply), "LKR", "USD");
    const versions = (raw.history?.entries || [])
      .filter((e) => e.effectiveDate || e.publishedAt)
      .map((e) => ({ t: new Date(e.publishedAt || e.effectiveDate).getTime(), v: perToken(e.approvedValue), version: e.version, change: e.changePercent }))
      .sort((a, b) => a.t - b.t);
    const trades = raw.trades.map((r) => ({ t: r.at.getTime(), v: r.price, amount: r.amount }));
    return { versions, trades };
  }, [raw, supply, convert]);

  return (
    <section className={`${cardClass} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <p className="text-sm text-[#98a2c3]">Approved value per token vs. what buyers actually paid, from the blockchain.</p>
        </div>
        {data && (data.versions.length > 0 || data.trades.length > 0) && (
          <button onClick={() => setShowTable((s) => !s)} className="text-sm text-indigo-300 hover:text-indigo-200 font-semibold">
            {showTable ? "Show chart" : "Show as table"}
          </button>
        )}
      </div>

      {error ? <p role="alert" className="mt-4 text-sm text-amber-300">{error}</p>
        : !data ? <p className="mt-4 text-sm text-[#98a2c3]">Loading price history…</p>
        : !data.versions.length && !data.trades.length ? <p className="mt-4 text-sm text-[#98a2c3]">No valuations or trades recorded yet.</p>
        : showTable ? <HistoryTable data={data} formatMUSD={formatMUSD} />
        : <Chart data={data} formatMUSD={formatMUSD} />}

      {data && (data.versions.length > 0 || data.trades.length > 0) && (
        <ul className="mt-4 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-[#c3cae2]" aria-label="Legend">
          <li className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: C.approved }} />Approved value / token</li>
          <li className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "#22e07a" }} />Trade price up<span className="w-2.5 h-2.5 rounded-full ml-3" style={{ background: "#ff5252" }} />Trade price down</li>
        </ul>
      )}
    </section>
  );
}

function niceMax(v) {
  if (!(v > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function timeTicks(t0, t1, count) {
  const span = t1 - t0;
  const fmt = span < 2 * 86400e3
    ? (t) => new Date(t).toLocaleTimeString(undefined, { hour: "numeric" }).toLowerCase()
    : span < 120 * 86400e3
      ? (t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : (t) => new Date(t).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  return Array.from({ length: count }, (_, i) => { const t = t0 + (span * i) / (count - 1); return { t, label: fmt(t) }; });
}

const stamp = (t) => new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function Chart({ data, formatMUSD }) {
  const wrap = useRef(null);
  const [W, setW] = useState(720);
  const [hover, setHover] = useState(null); // index into stops
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { versions, trades } = data;
  const now = Date.now();
  const allT = [...versions.map((p) => p.t), ...trades.map((p) => p.t)];
  let t0 = Math.min(...allT), t1 = Math.max(now, ...allT);
  if (t1 - t0 < 3600e3) { t0 -= 3600e3; t1 += 3600e3; }
  const pad = (t1 - t0) * 0.04;
  t0 -= pad; t1 += pad;
  const yMax = niceMax(Math.max(...versions.map((p) => p.v), ...trades.map((p) => p.v)) * 1.12);
  const iw = W - M.left - M.right, ih = H - M.top - M.bottom;
  const x = (t) => M.left + ((t - t0) / (t1 - t0)) * iw;
  const y = (v) => M.top + ih - (v / yMax) * ih;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);
  const xTicks = timeTicks(t0 + pad, t1 - pad, W < 520 ? 3 : 5);

  // Approved value is a step: it holds until the next published revaluation.
  const approvedAt = (t) => { let v = null; for (const p of versions) if (p.t <= t) v = p.v; return v; };
  const tradeAt = (t) => { let v = null; for (const p of trades) if (p.t <= t) v = p; return v; };
  let stepPath = "";
  versions.forEach((p, i) => {
    stepPath += i === 0 ? `M${x(p.t)},${y(p.v)}` : `H${x(p.t)}V${y(p.v)}`;
  });
  if (versions.length) stepPath += `H${x(Math.max(now, versions[versions.length - 1].t))}`;
  const revaluations = versions.filter((p) => p.version > 0);
  const lastApproved = versions[versions.length - 1];
  const lastTrade = trades[trades.length - 1];

  // Hover stops: every recorded event plus "now".
  const stops = [...new Set([...allT, now])].sort((a, b) => a - b);
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    stops.forEach((t, i) => { if (Math.abs(x(t) - px) < Math.abs(x(stops[best]) - px)) best = i; });
    setHover(best);
  };
  const onKey = (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); setHover((h) => Math.min(stops.length - 1, h == null ? 0 : h + 1)); }
    if (e.key === "ArrowLeft") { e.preventDefault(); setHover((h) => Math.max(0, h == null ? stops.length - 1 : h - 1)); }
    if (e.key === "Escape") setHover(null);
  };
  const ht = hover != null ? stops[hover] : null;
  const hv = ht != null ? { a: approvedAt(ht), tr: tradeAt(ht) } : null;

  // End labels only when the two line ends are far enough apart not to collide.
  const endA = lastApproved ? y(lastApproved.v) : null, endT = lastTrade ? y(lastTrade.v) : null;
  const showEnds = endA == null || endT == null || Math.abs(endA - endT) > 16;

  return (
    <div ref={wrap} className="relative mt-4 select-none">
      <svg width={W} height={H} role="img" tabIndex={0} onKeyDown={onKey}
        aria-label={`Price history: approved value ${lastApproved ? formatMUSD(lastApproved.v) : "n/a"} per token, last trade ${lastTrade ? formatMUSD(lastTrade.v) : "none"} per token. Use arrow keys to step through events.`}
        onPointerMove={onMove} onPointerLeave={() => setHover(null)} className="block outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg">
        {/* grid + axes */}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} stroke={v === 0 ? C.axis : C.grid} strokeWidth="1" />
            <text x={M.left - 10} y={y(v)} dy="0.32em" textAnchor="end" fontSize="11" fill={C.muted}>{formatMUSD(v)}</text>
          </g>
        ))}
        {xTicks.map((tk, i) => (
          <text key={i} x={x(tk.t)} y={H - 12} textAnchor="middle" fontSize="12" fill={i === xTicks.length - 1 ? C.ink : C.muted}>{tk.label}</text>
        ))}

        {/* revaluation markers */}
        {revaluations.map((p) => (
          <g key={p.version}>
            <line x1={x(p.t)} x2={x(p.t)} y1={M.top - 14} y2={M.top + ih} stroke={C.muted} strokeWidth="1" strokeDasharray="1 3" />
            <text x={x(p.t)} y={M.top - 22} textAnchor="middle" fontSize="13" fontWeight="700" fill={C.ink}>Revaluation v{p.version}</text>
            {p.change != null && (
              <g transform={`translate(${x(p.t) + (`Revaluation v${p.version}`.length * 7.4) / 2 + 22},${M.top - 38})`}>
                <rect x="-20" y="-9" width="40" height="18" rx="9" fill={C.ink} />
                <text textAnchor="middle" dy="0.35em" fontSize="10" fontWeight="700" fill={C.surface}>{Number(p.change) > 0 ? "+" : ""}{Number(p.change).toFixed(0)}%</text>
              </g>
            )}
            <circle cx={x(p.t)} cy={y(p.v)} r="16" fill="none" stroke={C.approved} strokeWidth="1.5" strokeDasharray="3 3" />
          </g>
        ))}

        {/* series */}
        {stepPath && <path d={stepPath} fill="none" stroke={C.approved} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {trades.slice(1).map((p, i) => <line key={`s${i}`} x1={x(trades[i].t)} y1={y(trades[i].v)} x2={x(p.t)} y2={y(p.v)} stroke={moveColor(p.v - trades[i].v)} strokeWidth="2" strokeLinecap="round" />)}
        {versions.map((p) => <circle key={`a${p.t}`} cx={x(p.t)} cy={y(p.v)} r="4" fill={C.approved} stroke={C.surface} strokeWidth="2" />)}
        {trades.map((p, i) => <circle key={`t${p.t}-${i}`} cx={x(p.t)} cy={y(p.v)} r="4.5" fill={i ? moveColor(p.v - trades[i - 1].v) : C.trade} stroke={C.surface} strokeWidth="2" />)}
        {lastTrade && <circle cx={x(lastTrade.t)} cy={y(lastTrade.v)} r="18" fill="none" stroke={C.trade} strokeWidth="1.5" strokeDasharray="3 3" />}

        {/* direct end labels (text in ink, never the series color) */}
        {showEnds && lastApproved && <text x={x(Math.max(now, lastApproved.t)) + 8} y={y(lastApproved.v)} dy="0.32em" fontSize="12" fontWeight="600" fill={C.ink2}>{formatMUSD(lastApproved.v)}</text>}
        {showEnds && lastTrade && <text x={x(lastTrade.t) + 24} y={y(lastTrade.v)} dy="0.32em" fontSize="12" fontWeight="600" fill={C.ink}>{formatMUSD(lastTrade.v)}</text>}

        {/* crosshair */}
        {ht != null && (
          <g pointerEvents="none">
            <line x1={x(ht)} x2={x(ht)} y1={M.top} y2={M.top + ih} stroke={C.ink2} strokeWidth="1" />
            {hv.a != null && <circle cx={x(ht)} cy={y(hv.a)} r="5" fill={C.approved} stroke={C.surface} strokeWidth="2" />}
            {hv.tr && <circle cx={x(hv.tr.t)} cy={y(hv.tr.v)} r="5" fill={C.trade} stroke={C.surface} strokeWidth="2" />}
          </g>
        )}
        <rect x={M.left} y={M.top} width={iw} height={ih} fill="transparent" />
      </svg>

      {ht != null && (
        <div role="status" className="pointer-events-none absolute z-10 rounded-xl border border-[#29345a] bg-[#070b18] px-3 py-2 text-xs shadow-xl min-w-[180px]"
          style={{ left: x(ht) > W / 2 ? Math.max(0, x(ht) - 202) : Math.min(x(ht) + 12, W - 190), top: M.top + 4 }}>
          <p className="text-[#98a2c3] mb-1.5">{ht === now ? "Now" : stamp(ht)}</p>
          <p className="flex items-center gap-2"><span className="inline-block w-3 h-0.5" style={{ background: C.approved }} /><b className="text-white">{hv.a != null ? formatMUSD(hv.a) : "—"}</b><span className="text-[#98a2c3]">approved</span></p>
          <p className="flex items-center gap-2 mt-1"><span className="inline-block w-3 h-0.5" style={{ background: C.trade }} /><b className="text-white">{hv.tr ? formatMUSD(hv.tr.v) : "—"}</b><span className="text-[#98a2c3]">{hv.tr ? `last trade · ${hv.tr.amount.toLocaleString()} tokens` : "no trades yet"}</span></p>
        </div>
      )}
    </div>
  );
}

function HistoryTable({ data, formatMUSD }) {
  const rows = [
    ...data.versions.map((p) => ({ t: p.t, kind: p.version === 0 ? "Valuation at tokenization" : `Revaluation v${p.version}${p.change != null ? ` (${Number(p.change) > 0 ? "+" : ""}${p.change}%)` : ""}`, value: p.v })),
    ...data.trades.map((p) => ({ t: p.t, kind: `Trade · ${p.amount.toLocaleString()} tokens`, value: p.v })),
  ].sort((a, b) => a.t - b.t);
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs uppercase tracking-wider text-[#98a2c3] border-b border-[#1b2440]"><th className="py-2 pr-4">When</th><th className="py-2 pr-4">Event</th><th className="py-2 text-right">Price / token</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[#1b2440] last:border-0">
              <td className="py-2 pr-4 text-[#c3cae2] whitespace-nowrap">{stamp(r.t)}</td>
              <td className="py-2 pr-4 text-white">{r.kind}</td>
              <td className="py-2 text-right text-white font-semibold">{formatMUSD(r.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
