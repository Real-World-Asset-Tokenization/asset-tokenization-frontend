import { useEffect, useState } from "react";
import { getContracts } from "../services/contractService";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { resolveUserWallet } from "../lib/walletResolver";
import { UP, DOWN, FLAT, colorOf, arrowOf, pctText } from "../lib/marketStats";

// Chart box. Points sit inside the axis so their labels never run into the price scale or the edge.
const L = 78, T = 44, B = 250, EDGE = 776, PAD_LEFT = 64, PAD_RIGHT = 84;
const when = (t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const clock = (t) => new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const label = (i) => (i === 0 ? "Tokenized" : `Revaluation ${i}`);

export default function PropertyValueChart() {
  const { user } = useAuth();
  const wallet = resolveUserWallet(user);
  const { formatLKR } = useCurrency();
  const [assets, setAssets] = useState([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(""); setAssets([]);
      if (!wallet) { setLoading(false); return; }
      let runner;
      try {
        const contracts = await getContracts(false);
        runner = contracts.runner;
        const { registryContract, tokenContract } = contracts;
        const block = await runner.getBlockNumber();
        const [ids, registrations, changes] = await Promise.all([
          registryContract.getAllAssetIds({ blockTag: block }),
          registryContract.queryFilter("AssetRegistered", 0, block),
          registryContract.queryFilter("AssetValuationUpdated", 0, block),
        ]);
        const dates = new Map();
        async function date(number) {
          if (!dates.has(number)) dates.set(number, runner.getBlock(number).then(b => Number(b.timestamp) * 1000));
          return dates.get(number);
        }
        const rows = [];
        for (const id of ids) {
          const balance = Number(await tokenContract.balanceOf(wallet, id, { blockTag: block }));
          if (!balance) continue;
          const asset = await registryContract.getAsset(id, { blockTag: block });
          const events = [
            ...registrations.filter(e => e.args.assetId === id).map(e => ({ log: e, value: Number(e.args.valuationLKR) })),
            ...changes.filter(e => e.args.assetId === id).map(e => ({ log: e, value: Number(e.args.newValuationLKR) })),
          ].sort((a, b) => a.log.blockNumber - b.log.blockNumber || a.log.index - b.log.index);
          const points = await Promise.all(events.map(async e => ({
            time: await date(e.log.blockNumber), value: e.value * balance / Number(asset.totalShares), hash: e.log.transactionHash,
          })));
          rows.push({ id: String(id), name: asset.name, balance, supply: Number(asset.totalShares), points });
        }
        if (!cancelled) { setAssets(rows); setSelected(prev => rows.some(r => r.id === prev) ? prev : rows[0]?.id || ""); }
      } catch (e) { if (!cancelled) setError(e.shortMessage || e.message); }
      finally { runner?.destroy(); if (!cancelled) setLoading(false); }
    }
    load();
    const refresh = () => setVersion(v => v + 1);
    window.addEventListener("focus", refresh);
    return () => { cancelled = true; window.removeEventListener("focus", refresh); };
  }, [wallet, version]);

  useEffect(() => setHover(null), [selected]);

  const asset = assets.find(a => a.id === selected);
  const points = asset?.points || [];
  const n = points.length;
  const first = points[0], last = points[n - 1];
  const change = first && last ? last.value - first.value : 0;
  const changePct = first && first.value > 0 ? change / first.value * 100 : null;
  const values = points.map(p => p.value);
  const low = n ? Math.min(...values) : 0;
  const high = n ? Math.max(...values) : 1;
  // The axis never goes below zero: a property cannot be worth less than nothing.
  const pad = Math.max((high - low) * 0.18, high * 0.04, 1);
  const yMin = Math.max(0, low - pad), yMax = high + pad;
  const firstX = L + PAD_LEFT, lastX = EDGE - PAD_RIGHT;
  const colW = n > 1 ? (lastX - firstX) / (n - 1) : 120;
  const x = i => (n > 1 ? firstX + (i / (n - 1)) * (lastX - firstX) : (firstX + lastX) / 2);
  const y = v => B - (v - yMin) / (yMax - yMin) * (B - T);
  const move = i => (i === 0 ? 0 : points[i].value - points[i - 1].value);
  const movePct = i => (i > 0 && points[i - 1].value > 0 ? move(i) / points[i - 1].value * 100 : null);
  const overall = colorOf(change);
  const showAllLabels = n <= 7;
  const hp = hover != null ? points[hover] : null;

  const tile = "rounded-2xl bg-[#1b1c1f] px-4 py-3 min-w-0";
  const steps = points.map((p, i) => (i === 0 ? `M${x(0)},${y(p.value)}` : `H${x(i)}V${y(p.value)}`)).join("");
  const tipOnRight = hover != null && x(hover) < 400;

  return <section className="rounded-3xl border border-[#2c2d31] bg-[#232427] p-5 sm:p-6 space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white">Your properties: value up or down</h2>
        <p className="mt-0.5 text-sm text-[#98a2c3]">Recorded property valuations, scaled to the tokens you own today.</p>
      </div>
      <button type="button" onClick={() => setVersion(v => v + 1)} className="rounded-xl border border-[#3a3b40] px-3.5 py-1.5 text-sm font-semibold text-[#d4d4d8] hover:bg-[#2c2d31] hover:text-white">Refresh chart</button>
    </div>
    {loading ? <p role="status" className="text-sm text-[#98a2c3]">Loading your properties and valuation history…</p> : error ? <p role="alert" className="text-sm text-amber-300">{error}</p> : !assets.length ? <p className="text-sm text-[#98a2c3]">No property tokens found in your linked wallet.</p> : <>
      <div role="tablist" aria-label="Property" className="flex flex-wrap gap-2">
        {assets.map(a => (
          <button key={a.id} type="button" role="tab" aria-selected={a.id === selected} onClick={() => setSelected(a.id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${a.id === selected ? "border-[#1fe06f] bg-[#1fe06f] text-[#04130a]" : "border-[#2c2d31] text-[#c3cae2] hover:text-white"}`}>
            {a.name} <span className="opacity-70">· {a.balance.toLocaleString()} tokens</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={tile}><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#98a2c3]">Your share today</p><p className="mt-1.5 truncate text-2xl font-bold tabular-nums text-white">{last ? formatLKR(last.value) : "Unavailable"}</p></div>
        <div className={tile}><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#98a2c3]">Since tokenization</p><p style={{ color: overall }} className="mt-1.5 truncate text-2xl font-bold tabular-nums">{n > 1 ? `${arrowOf(change)} ${pctText(changePct)}` : "No change yet"}</p>{n > 1 && <p style={{ color: overall }} className="mt-0.5 truncate text-xs tabular-nums">{change > 0 ? "+" : ""}{formatLKR(change)}</p>}</div>
        <div className={tile}><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#98a2c3]">Latest revaluation</p><p style={{ color: n > 1 ? colorOf(move(n - 1)) : FLAT }} className="mt-1.5 truncate text-2xl font-bold tabular-nums">{n > 1 ? `${arrowOf(move(n - 1))} ${pctText(movePct(n - 1))}` : "None"}</p>{n > 1 && <p className="mt-0.5 truncate text-xs text-[#98a2c3]">{when(last.time)}</p>}</div>
        <div className={tile}><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#98a2c3]">Highest / lowest</p>{n > 1 ? <p className="mt-1.5 truncate text-lg font-bold tabular-nums"><span style={{ color: UP }}>{formatLKR(high)}</span> <span className="text-[#6b7280]">/</span> <span style={{ color: DOWN }}>{formatLKR(low)}</span></p> : <p className="mt-1.5 text-2xl font-bold text-[#98a2c3]">—</p>}</div>
      </div>

      {n > 0 && <div className="relative rounded-2xl bg-[#1b1c1f] p-2 sm:p-3">
        <svg viewBox="0 0 800 330" role="img" aria-label={`${asset.name}: ${n} recorded valuations, current holding reference value ${formatLKR(last.value)}${changePct != null ? `, ${pctText(changePct)} since tokenization` : ""}`} className="w-full min-h-60" onPointerLeave={() => setHover(null)}>
          <defs>
            <linearGradient id="pv-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={overall} stopOpacity="0.20" /><stop offset="100%" stopColor={overall} stopOpacity="0" /></linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map(t => <g key={t}>
            <line x1={L} x2={EDGE} y1={B - t * (B - T)} y2={B - t * (B - T)} stroke={t === 0 ? "#3a3b40" : "#2c2d31"} strokeDasharray={t === 0 ? "" : "3 5"} />
            <text x={L - 10} y={B - t * (B - T) + 4} textAnchor="end" fill="#98a2c3" fontSize="11">{formatLKR(yMin + (yMax - yMin) * t, { compact: true })}</text>
          </g>)}

          {n > 1 && <g>
            <line x1={L} x2={EDGE} y1={y(first.value)} y2={y(first.value)} stroke={FLAT} strokeOpacity="0.5" strokeDasharray="2 6" />
            <text x={EDGE} y={y(first.value) + (last.value >= first.value ? 16 : -8)} textAnchor="end" fill={FLAT} fontSize="10.5">Start</text>
          </g>}

          {n > 1 && <path d={`${steps}H${EDGE}V${B}H${firstX}Z`} fill="url(#pv-area)" />}

          {points.map((p, i) => {
            const nextX = i < n - 1 ? x(i + 1) : EDGE;
            return <g key={`s${i}`}>
              <line x1={x(i)} x2={nextX} y1={y(p.value)} y2={y(p.value)} stroke={i === 0 ? FLAT : colorOf(move(i))} strokeWidth="3" strokeLinecap="round" />
              {i < n - 1 && <line x1={nextX} x2={nextX} y1={y(p.value)} y2={y(points[i + 1].value)} stroke={colorOf(move(i + 1))} strokeWidth="3" strokeLinecap="round" />}
            </g>;
          })}

          {hover != null && <line x1={x(hover)} x2={x(hover)} y1={T - 8} y2={B} stroke="#ffffff" strokeOpacity="0.18" strokeDasharray="3 4" />}

          {points.map((p, i) => {
            const c = i === 0 ? FLAT : colorOf(move(i));
            const showLabel = showAllLabels || i === 0 || i === n - 1 || hover === i;
            const above = i === 0 ? last.value >= first.value || n === 1 : move(i) >= 0;
            const vy = y(p.value) + (above ? -16 : 26);
            return <g key={`d${i}`}>
              <circle cx={x(i)} cy={y(p.value)} r={i === n - 1 || hover === i ? 8 : 6} fill={c} stroke="#1b1c1f" strokeWidth="3" />
              {showLabel && <g>
                <text x={x(i)} y={vy} textAnchor="middle" fill="#f4f4f5" fontSize="13" fontWeight="700">{formatLKR(p.value)}</text>
                {i > 0 && <text x={x(i)} y={vy + (above ? -15 : 15)} textAnchor="middle" fill={c} fontSize="11.5" fontWeight="700">{arrowOf(move(i))} {pctText(movePct(i))}</text>}
              </g>}
              <text x={x(i)} y={B + 22} textAnchor="middle" fill="#e4e4e7" fontSize="11.5" fontWeight="600">{label(i)}</text>
              <text x={x(i)} y={B + 38} textAnchor="middle" fill="#98a2c3" fontSize="10.5">{when(p.time)}</text>
              <text x={x(i)} y={B + 52} textAnchor="middle" fill="#6b7280" fontSize="10">{clock(p.time)}</text>
              <rect x={x(i) - Math.max(colW, 90) / 2} y={T - 24} width={Math.max(colW, 90)} height={B - T + 80} fill="transparent" onPointerEnter={() => setHover(i)} onPointerMove={() => setHover(i)} />
            </g>;
          })}

          <g>
            <rect x={EDGE - 40} y={y(last.value) - 33} width="40" height="18" rx="9" fill={overall} fillOpacity="0.16" />
            <text x={EDGE - 20} y={y(last.value) - 20.5} textAnchor="middle" fill={overall} fontSize="10.5" fontWeight="700">now</text>
          </g>
        </svg>
        {hp && <div role="status" className="pointer-events-none absolute top-3 z-10 w-56 rounded-xl border border-[#3a3b40] bg-[#17181a]/95 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur" style={tipOnRight ? { right: "4%" } : { left: "11%" }}>
          <p className="font-semibold text-white">{label(hover)}</p>
          <p className="text-[#98a2c3]">{new Date(hp.time).toLocaleString()}</p>
          <p className="mt-1.5 text-base font-bold tabular-nums text-white">{formatLKR(hp.value)}</p>
          {hover > 0 && <p style={{ color: colorOf(move(hover)) }} className="mt-0.5 font-semibold">{arrowOf(move(hover))} {move(hover) > 0 ? "+" : ""}{formatLKR(move(hover))} ({pctText(movePct(hover))}) vs previous</p>}
        </div>}
      </div>}

      {n === 1 && <p className="text-sm text-[#98a2c3]">Only the original valuation is recorded. A trend will appear after an authorized valuation update.</p>}
      <p className="text-xs leading-relaxed text-[#8e8f98]"><span style={{ color: UP }}>▲ Green</span> steps are valuation increases, <span style={{ color: DOWN }}>▼ red</span> steps are decreases, and grey is the starting valuation. This is the valuation history of your current token quantity, not your historical account balance or investment profit. Purchases, sales, dividends and gas are excluded. Hover over a step for its date and value.</p>
      <details className="rounded-2xl bg-[#1b1c1f] px-4 py-3 text-sm">
        <summary className="cursor-pointer font-semibold text-[#1fe06f]">View recorded values</summary>
        <ul className="mt-3 divide-y divide-[#2c2d31]">{points.map((p, i) => <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span className="text-[#d4d4d8]"><span className="font-semibold text-white">{label(i)}</span> · {new Date(p.time).toLocaleString()}</span>
          <span className="tabular-nums text-white">{formatLKR(p.value)}{i > 0 && <span style={{ color: colorOf(move(i)) }} className="ml-2 font-semibold">{arrowOf(move(i))} {pctText(movePct(i))}</span>}</span>
        </li>)}</ul>
      </details>
    </>}
  </section>;
}
