import { colorOf } from "../../lib/marketStats";

// Tiny trend line of recent trade prices. Green when the last move was up, red when down.
export default function Sparkline({ prices, width = 96, height = 30 }) {
  if (!prices || prices.length < 2) {
    return <span className="text-xs text-[#6b7599]" aria-label="Not enough trades for a trend">—</span>;
  }
  const min = Math.min(...prices), max = Math.max(...prices);
  const span = max - min || 1;
  const pts = prices.map((p, i) => [(i / (prices.length - 1)) * (width - 4) + 2, height - 3 - ((p - min) / span) * (height - 6)]);
  const color = colorOf(prices[prices.length - 1] - prices[0]);
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={width} height={height} role="img" aria-label={`Trend over the last ${prices.length} trades`}>
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="2.5" fill={color} />
    </svg>
  );
}
