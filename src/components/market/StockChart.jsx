import { useEffect, useMemo, useRef, useState } from "react";
import { UP, DOWN, FLAT, colorOf, arrowOf, pctText, summarize, candlesFrom, pickBucket, niceTicks } from "../../lib/marketStats";

const RANGES = [["1D", 864e5], ["1W", 7 * 864e5], ["1M", 30 * 864e5], ["ALL", Infinity]];
const C = { grid: "#1b2440", axis: "#29345a", muted: "#6b7599", ink: "#ffffff", ink2: "#c3cae2", approved: "#4ade80", ask: "#fbbf24", surface: "#0b1124" };
const PRICE_H = 270, VOL_H = 64, GAP = 12;
const M = { top: 12, right: 74, bottom: 26, left: 8 };
const H = M.top + PRICE_H + GAP + VOL_H + M.bottom;

const stamp = (t) => new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function timeTicks(t0, t1, count) {
  const span = t1 - t0;
  const fmt = span < 2 * 864e5
    ? (t) => new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : span < 120 * 864e5
      ? (t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : (t) => new Date(t).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  return Array.from({ length: count }, (_, i) => { const t = t0 + (span * i) / (count - 1); return { t, label: fmt(t) }; });
}

/**
 * Stock-style chart for one property token, built only from completed marketplace trades.
 * `approved` is the on-chain approved value per token (mUSD) and `ask` the lowest open
 * offer; both are drawn as reference lines when they sit near the traded prices.
 * trades: [{ t, price, amount }] oldest first.
 */
export default function StockChart({ trades, approved = null, ask = null, formatMUSD, title = "Price" }) {
  const [range, setRange] = useState("ALL");
  const [mode, setMode] = useState("line");
  const [hover, setHover] = useState(null);
  const [W, setW] = useState(720);
  const wrap = useRef(null);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const now = useMemo(() => Date.now(), [trades]);
  const view = useMemo(() => {
    const span = RANGES.find(([k]) => k === range)[1];
    const first = trades[0]?.t ?? now;
    const start = span === Infinity ? first : now - span;
    const visible = trades.filter((t) => t.t >= start);
    const before = [...trades].reverse().find((t) => t.t < start);
    let t0 = span === Infinity ? first : start;
    let t1 = now;
    if (t1 - t0 < 3600e3) t0 = t1 - 3600e3;
    const bucket = pickBucket(t1 - t0);
    const candles = candlesFrom(visible, bucket, before?.price ?? null);
    if (candles.length) t1 = Math.max(t1, candles[candles.length - 1].t + bucket);
    const pad = (t1 - t0) * 0.03;
    const base = before?.price ?? visible[0]?.price ?? null;
    const last = visible[visible.length - 1]?.price ?? null;
    return {
      visible, candles, bucket, t0: t0 - pad, t1: t1 + pad, base, last,
      change: base && last != null ? (last / base - 1) * 100 : null,
      stats: summarize(visible),
    };
  }, [trades, range, now]);

  const { visible, candles, bucket, t0, t1, last, change, stats } = view;
  const iw = W - M.left - M.right;
  const x = (t) => M.left + ((t - t0) / (t1 - t0)) * iw;

  // Price scale covers the candles; reference lines are included only when they are close enough
  // not to flatten the chart.
  const traded = candles.flatMap((c) => [c.high, c.low]);
  let lo = traded.length ? Math.min(...traded) : null, hi = traded.length ? Math.max(...traded) : null;
  const near = (v) => v != null && (lo == null || (v >= lo * 0.5 && v <= hi * 2));
  const showApproved = near(approved), showAsk = near(ask);
  for (const v of [showApproved ? approved : null, showAsk ? ask : null]) {
    if (v == null) continue;
    lo = lo == null ? v : Math.min(lo, v);
    hi = hi == null ? v : Math.max(hi, v);
  }
  const hasScale = lo != null;
  if (hasScale && hi - lo < hi * 0.02) { lo = lo * 0.99; hi = hi * 1.01; }
  const padY = hasScale ? (hi - lo) * 0.1 : 0;
  const yMin = hasScale ? Math.max(0, lo - padY) : 0, yMax = hasScale ? hi + padY : 1;
  const y = (v) => M.top + PRICE_H - ((v - yMin) / (yMax - yMin)) * PRICE_H;
  const maxVol = Math.max(1, ...candles.map((c) => c.volume));
  const vy = (v) => M.top + PRICE_H + GAP + VOL_H - (v / maxVol) * VOL_H;
  const cw = Math.max(3, Math.min(26, (bucket / (t1 - t0)) * iw * 0.7));
  const trend = colorOf(change);
  const xTicks = timeTicks(t0, t1, W < 520 ? 3 : 5);

  const onMove = (e) => {
    const items = mode === "line" ? visible : candles;
    if (!items.length) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const py = ((e.clientY - r.top) / r.height) * H;
    let best = 0, bestD = Infinity;
    items.forEach((it, i) => {
      const dx = x(mode === "line" ? it.t : it.t + bucket / 2) - px;
      const dy = mode === "line" ? y(it.price) - py : 0;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = i; }
    });
    setHover(best);
  };
  const onKey = (e) => {
    const n = (mode === "line" ? visible : candles).length;
    if (e.key === "ArrowRight") { e.preventDefault(); setHover((h) => Math.min(n - 1, h == null ? 0 : h + 1)); }
    if (e.key === "ArrowLeft") { e.preventDefault(); setHover((h) => Math.max(0, h == null ? n - 1 : h - 1)); }
    if (e.key === "Escape") setHover(null);
  };
  const hc = mode === "candles" && hover != null ? candles[hover] : null;
  const hp = mode === "line" && hover != null ? visible[hover] : null;
  const hpPrev = hp && hover > 0 ? visible[hover - 1].price : null;

  const linePath = visible.map((p, i) => `${i ? "L" : "M"}${x(p.t)},${y(p.price)}`).join("");
  const areaPath = visible.length > 1 ? `${linePath}L${x(visible[visible.length - 1].t)},${M.top + PRICE_H}L${x(visible[0].t)},${M.top + PRICE_H}Z` : "";
  const lastY = last != null ? y(last) : null;
  // keep the "Lowest ask" label clear of the first trade line
  // and every other segment: slide the label along until its box touches no part of the line
  let askLabelX = M.left + 4;
  if (ask != null && visible.length) {
    const LW = 130, top = y(ask) - 18, bot = y(ask) + 2;
    const segs = visible.map((p, i) => { const q = visible[Math.max(0, i - 1)]; return [Math.min(x(q.t), x(p.t)), Math.max(x(q.t), x(p.t)), Math.min(y(q.price), y(p.price)), Math.max(y(q.price), y(p.price))]; });
    const free = (lx) => segs.every(([x0, x1, y0, y1]) => x1 < lx - 6 || x0 > lx + LW + 6 || y1 < top || y0 > bot);
    let found = null;
    for (let lx = M.left + 4; lx + LW < W - M.right; lx += 10) if (free(lx)) { found = lx; break; }
    askLabelX = found ?? M.left + 4;
  }

  return (
    <section className="rounded-2xl border border-[#1b2440] bg-[#0b1124] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#98a2c3]">{title}</p>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-3xl font-bold text-white">{last != null ? formatMUSD(last) : "No trades yet"}</span>
            {last != null && <span className="text-sm text-[#98a2c3]">per token</span>}
            {change != null && (
              <span className="text-base font-semibold" style={{ color: trend }}>
                {arrowOf(change)} {pctText(change)} <span className="text-xs font-normal text-[#98a2c3]">{range === "ALL" ? "since first trade" : `past ${range === "1D" ? "day" : range === "1W" ? "week" : "month"}`}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div role="group" aria-label="Chart type" className="flex rounded-xl border border-[#1b2440] overflow-hidden">
            {[["candles", "Candles"], ["line", "Line"]].map(([k, label]) => (
              <button key={k} onClick={() => setMode(k)} aria-pressed={mode === k}
                className={`px-3 py-1.5 text-xs font-semibold ${mode === k ? "bg-indigo-600 text-white" : "text-[#98a2c3] hover:text-white"}`}>{label}</button>
            ))}
          </div>
          <div role="group" aria-label="Time range" className="flex rounded-xl border border-[#1b2440] overflow-hidden">
            {RANGES.map(([k]) => (
              <button key={k} onClick={() => { setRange(k); setHover(null); }} aria-pressed={range === k}
                className={`px-3 py-1.5 text-xs font-semibold ${range === k ? "bg-indigo-600 text-white" : "text-[#98a2c3] hover:text-white"}`}>{k}</button>
            ))}
          </div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
        {[
          ["High", stats.high != null ? formatMUSD(stats.high) : "—"],
          ["Low", stats.low != null ? formatMUSD(stats.low) : "—"],
          ["Volume", `${stats.volume.toLocaleString()} tokens`],
          ["Trades", stats.count.toLocaleString()],
          ["Lowest selling price", ask != null ? formatMUSD(ask) : "None"],
          ["Approved value", approved != null ? formatMUSD(approved) : "—"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-[#0e1426] px-3 py-2"><dt className="text-[11px] uppercase tracking-wide text-[#6b7599]">{k}</dt><dd className="font-semibold text-white truncate">{v}</dd></div>
        ))}
      </dl>

      {!trades.length ? (
        <div className="mt-5 rounded-xl border border-dashed border-[#29345a] px-5 py-10 text-center">
          <p className="font-semibold text-white">Be the first to trade this property</p>
          <p className="text-sm text-[#98a2c3] mt-1 max-w-md mx-auto">The chart starts with the first purchase. Until then, this is where the price stands:</p>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left">
            <div className="rounded-xl bg-[#0e1426] px-4 py-3"><p className="text-xs text-[#98a2c3]">Approved value</p><p className="text-lg font-bold text-white tabular-nums">{approved != null ? formatMUSD(approved) : "—"}</p></div>
            <div className="rounded-xl bg-[#0e1426] px-4 py-3"><p className="text-xs text-[#98a2c3]">Lowest selling price</p><p className="text-lg font-bold text-white tabular-nums">{ask != null ? formatMUSD(ask) : "No offers"}</p></div>
            <div className="rounded-xl bg-[#0e1426] px-4 py-3"><p className="text-xs text-[#98a2c3]">Selling price vs approved</p>
              {ask != null && approved ? (() => { const g = (ask / approved - 1) * 100; return <p className="text-lg font-bold tabular-nums" style={{ color: Math.abs(g) < 1 ? "var(--ink-2)" : g < 0 ? "var(--down)" : "var(--up)" }}>{g > 0 ? "▲ +" : g < 0 ? "▼ " : ""}{g.toFixed(1)}%</p>; })() : <p className="text-lg font-bold text-[#98a2c3]">—</p>}
            </div>
          </div>
        </div>
      ) : !visible.length ? (
        <div className="mt-5 rounded-xl border border-dashed border-[#29345a] py-12 text-center">
          <p className="text-sm text-[#98a2c3]">No trades in this period.</p>
          <button onClick={() => setRange("ALL")} className="mt-2 text-sm font-semibold text-indigo-300 hover:text-indigo-200">Show all trades</button>
        </div>
      ) : (
        <div ref={wrap} className="relative mt-4 select-none">
          <svg width={W} height={H} role="img" tabIndex={0} onKeyDown={onKey} onPointerMove={onMove} onPointerLeave={() => setHover(null)}
            aria-label={`Price chart: last ${formatMUSD(last)} per token, ${pctText(change)}. Use arrow keys to step through candles.`}
            className="block outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg">
            <defs>
              <linearGradient id="stockArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={trend} stopOpacity="0.28" /><stop offset="100%" stopColor={trend} stopOpacity="0" />
              </linearGradient>
            </defs>

            {niceTicks(yMin, yMax).map((v, i) => (
              <g key={i}>
                <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} stroke={C.grid} />
                <text x={W - M.right + 8} y={y(v)} dy="0.32em" fontSize="11" fill={C.muted}>{formatMUSD(v)}</text>
              </g>
            ))}
            <line x1={M.left} x2={W - M.right} y1={M.top + PRICE_H + GAP + VOL_H} y2={M.top + PRICE_H + GAP + VOL_H} stroke={C.axis} />
            {xTicks.map((tk, i) => <text key={i} x={x(tk.t)} y={H - 8} textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"} fontSize="11" fill={C.muted}>{tk.label}</text>)}
            <text x={M.left} y={M.top + PRICE_H + GAP + 10} fontSize="10" fill={C.muted}>Volume</text>

            {showApproved && (
              <g>
                <line x1={M.left} x2={W - M.right} y1={y(approved)} y2={y(approved)} stroke={C.approved} strokeDasharray="5 4" strokeWidth="1.25" />
                <text x={W - M.right - 4} y={y(approved) - 5} textAnchor="end" fontSize="11" fontWeight="600" fill={C.approved}>Approved value</text>
              </g>
            )}
            {showAsk && (
              <g>
                <line x1={M.left} x2={W - M.right} y1={y(ask)} y2={y(ask)} stroke={C.ask} strokeDasharray="2 4" strokeWidth="1.25" />
                <text x={askLabelX} y={y(ask) - 5} fontSize="11" fontWeight="600" fill={C.ask}>Lowest selling price</text>
                <rect x={W - M.right + 2} y={y(ask) - 9} width={M.right - 4} height="18" rx="4" fill={C.surface} stroke={C.ask} />
                <text x={W - M.right + 2 + (M.right - 4) / 2} y={y(ask)} dy="0.34em" textAnchor="middle" fontSize="11" fontWeight="700" fill={C.ask}>{formatMUSD(ask)}</text>
              </g>
            )}

            {mode === "line" ? (
              <g>
                {areaPath && <path d={areaPath} fill="url(#stockArea)" />}
                {visible.slice(1).map((p, i) => {
                  const q = visible[i];
                  return <line key={i} x1={x(q.t)} y1={y(q.price)} x2={x(p.t)} y2={y(p.price)} stroke={colorOf(p.price - q.price)} strokeWidth="2.25" strokeLinecap="round" />;
                })}
                {visible.length <= 40 && visible.map((p, i) => <circle key={i} cx={x(p.t)} cy={y(p.price)} r={hover === i ? 6 : 3.5} fill={i === 0 ? FLAT : colorOf(p.price - visible[i - 1].price)} stroke={hover === i ? C.ink : C.surface} strokeWidth="1.5" />)}
              </g>
            ) : candles.map((c, i) => {
              const color = c.close > c.open ? UP : c.close < c.open ? DOWN : FLAT;
              const cx = x(c.t + bucket / 2);
              const top = y(Math.max(c.open, c.close)), bot = y(Math.min(c.open, c.close));
              return (
                <g key={c.t} opacity={hover == null || hover === i ? 1 : 0.55}>
                  <line x1={cx} x2={cx} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth="1.5" />
                  <rect x={cx - cw / 2} y={top} width={cw} height={Math.max(2, bot - top)} fill={color} rx="1" />
                </g>
              );
            })}

            {candles.map((c, i) => {
              const color = c.close > c.open ? UP : c.close < c.open ? DOWN : FLAT;
              const cx = x(c.t + bucket / 2);
              return <rect key={`v${c.t}`} x={cx - cw / 2} y={vy(c.volume)} width={cw} height={Math.max(1, M.top + PRICE_H + GAP + VOL_H - vy(c.volume))} fill={color} opacity={hover == null || hover === i ? 0.75 : 0.35} rx="1" />;
            })}

            {lastY != null && (
              <g>
                <line x1={M.left} x2={W - M.right} y1={lastY} y2={lastY} stroke={trend} strokeDasharray="1 3" opacity="0.7" />
                <rect x={W - M.right + 2} y={lastY - 10} width={M.right - 4} height="20" rx="4" fill={trend} />
                <text x={W - M.right + 2 + (M.right - 4) / 2} y={lastY} dy="0.34em" textAnchor="middle" fontSize="11" fontWeight="700" fill="#06101f">{formatMUSD(last)}</text>
              </g>
            )}

            {hp && (
              <g pointerEvents="none">
                <line x1={x(hp.t)} x2={x(hp.t)} y1={M.top} y2={M.top + PRICE_H + GAP + VOL_H} stroke={C.ink2} strokeWidth="1" strokeDasharray="3 3" />
                <line x1={M.left} x2={W - M.right} y1={y(hp.price)} y2={y(hp.price)} stroke={C.ink2} strokeWidth="1" strokeDasharray="3 3" />
                <circle cx={x(hp.t)} cy={y(hp.price)} r="6" fill="none" stroke={C.ink} strokeWidth="1.5" />
              </g>
            )}
            {hc && (
              <g pointerEvents="none">
                <line x1={x(hc.t + bucket / 2)} x2={x(hc.t + bucket / 2)} y1={M.top} y2={M.top + PRICE_H + GAP + VOL_H} stroke={C.ink2} strokeWidth="1" strokeDasharray="3 3" />
                <line x1={M.left} x2={W - M.right} y1={y(hc.close)} y2={y(hc.close)} stroke={C.ink2} strokeWidth="1" strokeDasharray="3 3" />
              </g>
            )}
            <rect x={M.left} y={M.top} width={iw} height={PRICE_H + GAP + VOL_H} fill="transparent" />
          </svg>

          {hp && (
            <div role="status" className="pointer-events-none absolute z-10 rounded-xl border border-[#29345a] bg-[#070b18] px-3 py-2 text-xs shadow-xl min-w-[170px]"
              style={{ left: x(hp.t) > W / 2 ? Math.max(0, x(hp.t) - 190) : Math.min(x(hp.t) + 14, W - 180), top: M.top + 6 }}>
              <p className="text-[#98a2c3] mb-1.5">{stamp(hp.t)}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                <dt className="text-[#98a2c3]">Price</dt><dd className="text-right font-semibold" style={{ color: hpPrev != null ? colorOf(hp.price - hpPrev) : FLAT }}>{formatMUSD(hp.price)}</dd>
                <dt className="text-[#98a2c3]">Tokens</dt><dd className="text-right text-white">{Number(hp.amount).toLocaleString()}</dd>
                {hpPrev != null && <><dt className="text-[#98a2c3]">Change</dt><dd className="text-right text-white">{pctText((hp.price / hpPrev - 1) * 100)}</dd></>}
              </dl>
            </div>
          )}
          {hc && (
            <div role="status" className="pointer-events-none absolute z-10 rounded-xl border border-[#29345a] bg-[#070b18] px-3 py-2 text-xs shadow-xl min-w-[170px]"
              style={{ left: x(hc.t + bucket / 2) > W / 2 ? Math.max(0, x(hc.t + bucket / 2) - 190) : Math.min(x(hc.t + bucket / 2) + 14, W - 180), top: M.top + 6 }}>
              <p className="text-[#98a2c3] mb-1.5">{stamp(hc.t)}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                <dt className="text-[#98a2c3]">Open</dt><dd className="text-right text-white">{formatMUSD(hc.open)}</dd>
                <dt className="text-[#98a2c3]">High</dt><dd className="text-right text-white">{formatMUSD(hc.high)}</dd>
                <dt className="text-[#98a2c3]">Low</dt><dd className="text-right text-white">{formatMUSD(hc.low)}</dd>
                <dt className="text-[#98a2c3]">Close</dt><dd className="text-right font-semibold" style={{ color: colorOf(hc.close - hc.open) }}>{formatMUSD(hc.close)}</dd>
                <dt className="text-[#98a2c3]">Volume</dt><dd className="text-right text-white">{hc.volume.toLocaleString()} tokens</dd>
                <dt className="text-[#98a2c3]">Trades</dt><dd className="text-right text-white">{hc.count}</dd>
              </dl>
            </div>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-[#6b7599]">
        <span style={{ color: UP }}>▲ Green</span> candles closed higher than they opened, <span style={{ color: DOWN }}>▼ red</span> lower. Every point is a completed purchase on the blockchain.
      </p>
    </section>
  );
}
