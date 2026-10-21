import { useEffect, useState } from "react";
import { getContracts } from "../services/contractService";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { resolveUserWallet } from "../lib/walletResolver";
import { UP, DOWN, FLAT, colorOf, arrowOf, pctText } from "../lib/marketStats";

const L = 96, R = 740, T = 36, B = 236, EDGE = 770;
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
  const lastX = n > 1 ? R - 40 : (L + R) / 2;
  const colW = n > 1 ? (lastX - L) / (n - 1) : 80;
  const x = i => (n > 1 ? L + (i / (n - 1)) * (lastX - L) : lastX);
  const y = v => B - (v - yMin) / (yMax - yMin) * (B - T);
  const move = i => (i === 0 ? 0 : points[i].value - points[i - 1].value);
  const movePct = i => (i > 0 && points[i - 1].value > 0 ? move(i) / points[i - 1].value * 100 : null);
  const overall = colorOf(change);
  const showAllLabels = n <= 7;
  const hp = hover != null ? points[hover] : null;

  return <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
    <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-bold">Your properties: value up or down</h2><p className="text-sm text-zinc-400">Recorded property valuations, scaled to the tokens you own today.</p></div><button onClick={() => setVersion(v => v + 1)} className="text-blue-300">Refresh chart</button></div>
    {loading ? <p role="status">Loading your properties and valuation history…</p> : error ? <p role="alert" className="text-amber-300">{error}</p> : !assets.length ? <p>No property tokens found in your linked wallet.</p> : <>
      <label className="block text-sm">Property<select value={selected} onChange={e => setSelected(e.target.value)} className="ml-3 p-2 rounded-lg bg-zinc-950 border border-zinc-700">{assets.map(a => <option key={a.id} value={a.id}>{a.name} · {a.balance.toLocaleString()} tokens</option>)}</select></label>
      <div className="flex flex-wrap gap-x-10 gap-y-3">
        <div><p className="text-xs text-zinc-400">Your current valuation share</p><strong className="text-2xl">{last ? formatLKR(last.value) : "Unavailable"}</strong></div>
        <div><p className="text-xs text-zinc-400">Change since tokenization</p><strong style={{ color: overall }} className="text-2xl">{n > 1 ? `${arrowOf(change)} ${change > 0 ? "+" : ""}${formatLKR(change)}${changePct != null ? ` (${pctText(changePct)})` : ""}` : "No changes recorded"}</strong></div>
        {n > 1 && <div><p className="text-xs text-zinc-400">Latest revaluation</p><strong style={{ color: colorOf(move(n - 1)) }} className="text-2xl">{arrowOf(move(n - 1))} {pctText(movePct(n - 1))}</strong></div>}
        {n > 1 && <div><p className="text-xs text-zinc-400">Highest / lowest</p><strong className="text-lg"><span style={{ color: UP }}>{formatLKR(high)}</span> <span className="text-zinc-500">/</span> <span style={{ color: DOWN }}>{formatLKR(low)}</span></strong></div>}
      </div>

      {n > 0 && <div className="relative">
        <svg viewBox="0 0 800 300" role="img" aria-label={`${asset.name}: ${n} recorded valuations, current holding reference value ${formatLKR(last.value)}${changePct != null ? `, ${pctText(changePct)} since tokenization` : ""}`} className="w-full min-h-56" onPointerLeave={() => setHover(null)}>
          <defs>{points.slice(1).map((p, i) => <linearGradient key={i} id={`pv${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={colorOf(move(i + 1))} stopOpacity="0.22" /><stop offset="100%" stopColor={colorOf(move(i + 1))} stopOpacity="0" /></linearGradient>)}</defs>
          {[0, 0.25, 0.5, 0.75, 1].map(t => <g key={t}><line x1={L} x2={EDGE} y1={B - t * (B - T)} y2={B - t * (B - T)} stroke={t === 0 ? "#52525b" : "#27272a"} strokeDasharray={t === 0 ? "" : "4 4"} /><text x={L - 8} y={B - t * (B - T) + 4} textAnchor="end" fill="#a1a1aa" fontSize="11">{formatLKR(yMin + (yMax - yMin) * t)}</text></g>)}

          {points.slice(1).map((p, i) => <path key={`f${i}`} d={`M${x(i)},${y(points[i].value)}H${x(i + 1)}V${y(p.value)}H${x(i + 1)}V${B}H${x(i)}Z`} fill={`url(#pv${i})`} />)}
          {points.map((p, i) => {
            const nextX = i < n - 1 ? x(i + 1) : EDGE;
            return <g key={`s${i}`}>
              <line x1={x(i)} x2={nextX} y1={y(p.value)} y2={y(p.value)} stroke={i === 0 ? FLAT : colorOf(move(i))} strokeWidth="3" strokeLinecap="round" />
              {i < n - 1 && <line x1={nextX} x2={nextX} y1={y(p.value)} y2={y(points[i + 1].value)} stroke={colorOf(move(i + 1))} strokeWidth="3" strokeLinecap="round" />}
            </g>;
          })}

          {points.map((p, i) => {
            const c = i === 0 ? FLAT : colorOf(move(i));
            const showLabel = showAllLabels || i === 0 || i === n - 1 || hover === i;
            const above = i === 0 || move(i) >= 0;
            return <g key={`d${i}`}>
              <circle cx={x(i)} cy={y(p.value)} r={i === n - 1 || hover === i ? 7 : 5.5} fill={c} stroke="#18181b" strokeWidth="2" />
              {showLabel && <g>
                <text x={x(i)} y={y(p.value) + (above ? -16 : 24)} textAnchor="middle" fill="#f4f4f5" fontSize="12" fontWeight="700">{formatLKR(p.value)}</text>
                {i > 0 && <text x={x(i)} y={y(p.value) + (above ? -30 : 38)} textAnchor="middle" fill={c} fontSize="11" fontWeight="700">{arrowOf(move(i))} {pctText(movePct(i))}</text>}
              </g>}
              <text x={x(i)} y={B + 20} textAnchor="middle" fill="#d4d4d8" fontSize="11" fontWeight="600">{label(i)}</text>
              <text x={x(i)} y={B + 35} textAnchor="middle" fill="#a1a1aa" fontSize="10.5">{when(p.time)}</text>
              <text x={x(i)} y={B + 48} textAnchor="middle" fill="#71717a" fontSize="10">{clock(p.time)}</text>
              <rect x={x(i) - colW / 2} y={T - 20} width={colW} height={B - T + 70} fill="transparent" onPointerEnter={() => setHover(i)} onPointerMove={() => setHover(i)} />
            </g>;
          })}
          <text x={EDGE} y={y(last.value) - 10} textAnchor="end" fill="#a1a1aa" fontSize="10.5">now</text>
        </svg>
        {hp && <div role="status" className="pointer-events-none absolute z-10 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs shadow-xl" style={{ left: `${Math.min(70, Math.max(2, x(hover) / 800 * 100 - 8))}%`, top: 4 }}>
          <p className="font-semibold text-white">{label(hover)}</p>
          <p className="text-zinc-400">{new Date(hp.time).toLocaleString()}</p>
          <p className="mt-1 text-white">{formatLKR(hp.value)}</p>
          {hover > 0 && <p style={{ color: colorOf(move(hover)) }} className="font-semibold">{arrowOf(move(hover))} {move(hover) > 0 ? "+" : ""}{formatLKR(move(hover))} ({pctText(movePct(hover))}) vs previous</p>}
        </div>}
      </div>}

      {n === 1 && <p className="text-sm text-zinc-400">Only the original valuation is recorded. A trend will appear after an authorized valuation update.</p>}
      <p className="text-xs text-zinc-500"><span style={{ color: UP }}>▲ Green</span> steps are valuation increases, <span style={{ color: DOWN }}>▼ red</span> steps are decreases, and grey is the starting valuation. This is the valuation history of your current token quantity, not your historical account balance or investment profit. Purchases, sales, dividends and gas are excluded. Hover over a step for its date and value.</p>
      <details className="text-sm"><summary className="cursor-pointer text-blue-300">View recorded values</summary><ul className="mt-3 space-y-2">{points.map((p, i) => <li key={i}>{label(i)} · {new Date(p.time).toLocaleString()} — {formatLKR(p.value)}{i > 0 && <span style={{ color: colorOf(move(i)) }}> ({arrowOf(move(i))} {pctText(movePct(i))})</span>}</li>)}</ul></details>
    </>}
  </section>;
}
