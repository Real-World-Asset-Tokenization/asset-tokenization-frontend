import { UP, DOWN, FLAT, colorOf, arrowOf, pctText } from "../../lib/marketStats";
import { sellerKind } from "../../lib/marketplaceData";

const time = (t) => new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
const day = (t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/**
 * Order book for one property. Sellers post asking prices (this marketplace has no bid
 * orders), so the book lists open offers by price with running depth, and the tape
 * below lists the latest completed trades, newest first.
 * offers: active listings; trades: [{ t, price, amount }] oldest first.
 */
export default function OrderBook({ offers, trades, wallet, formatMUSD, ownerWallet }) {
  const asks = [...offers].sort((a, b) => a.pricePerTokenFormatted - b.pricePerTokenFormatted);
  let running = 0;
  const rows = asks.map((o) => { running += Number(o.amount); return { ...o, depth: running }; });
  const maxDepth = running || 1;
  const last = trades.length ? trades[trades.length - 1].price : null;
  const prev = trades.length > 1 ? trades[trades.length - 2].price : null;
  const lastChange = prev ? (last / prev - 1) * 100 : null;
  const spread = last && asks.length ? (asks[0].pricePerTokenFormatted / last - 1) * 100 : null;
  const tape = [...trades].reverse().slice(0, 12);

  return (
    <section className="rounded-2xl border border-[#1b2440] bg-[#0b1124] p-5 sm:p-6">
      <h2 className="text-lg font-bold text-white">Order book</h2>
      <p className="text-sm text-[#98a2c3]">Open offers from sellers, highest price first. Bars show how many tokens are available up to that price.</p>

      <div className="mt-4 text-sm">
        <div className="grid grid-cols-3 px-2 pb-1.5 text-[11px] uppercase tracking-wide text-[#6b7599]">
          <span>Ask price</span><span className="text-right">Tokens</span><span className="text-right">Total tokens</span>
        </div>
        {!rows.length ? <p className="rounded-lg bg-[#0e1426] px-3 py-4 text-[#98a2c3]">No open offers. Nobody is selling this property right now.</p> : (
          <ul className="space-y-0.5">
            {[...rows].reverse().map((o, i, arr) => (
              <li key={o.listingId} className="relative grid grid-cols-3 items-center rounded px-2 py-1.5 overflow-hidden">
                <span aria-hidden className="absolute inset-y-0 right-0 bg-rose-500/10" style={{ width: `${(o.depth / maxDepth) * 100}%` }} />
                <span className="relative font-semibold" style={{ color: DOWN }}>
                  {formatMUSD(o.pricePerTokenFormatted)}
                  {i === arr.length - 1 && <span className="ml-1.5 text-[10px] font-medium text-[#98a2c3]">best ask</span>}
                  {wallet && o.seller.toLowerCase() === wallet.toLowerCase() && <span className="ml-1.5 text-[10px] font-medium text-amber-300">yours</span>}
                  <span className="ml-1.5 text-[10px] font-medium" style={{ color: sellerKind(o, ownerWallet) === "owner" ? "#38bdf8" : "#a78bfa" }}>{sellerKind(o, ownerWallet) === "owner" ? "owner" : "investor"}</span>
                </span>
                <span className="relative text-right text-white">{Number(o.amount).toLocaleString()}</span>
                <span className="relative text-right text-[#c3cae2]">{o.depth.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="my-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1b2440] bg-[#0e1426] px-3 py-2.5">
          <span className="flex flex-wrap items-baseline gap-2">
            <span className="text-lg font-bold" style={{ color: colorOf(lastChange) }}>{last != null ? formatMUSD(last) : "—"}</span>
            <span className="text-xs text-[#98a2c3]">last trade</span>
            {lastChange != null && <span className="text-xs font-semibold" style={{ color: colorOf(lastChange) }}>{arrowOf(lastChange)} {pctText(lastChange)}</span>}
          </span>
          {spread != null && <span className="text-xs text-[#98a2c3]">Best ask is <b className="text-white">{spread >= 0 ? "+" : ""}{spread.toFixed(1)}%</b> vs last trade</span>}
        </div>
      </div>

      <h3 className="mt-5 text-sm font-semibold text-white">Recent trades</h3>
      {!tape.length ? <p className="mt-2 text-sm text-[#98a2c3]">No trades yet.</p> : (
        <table className="mt-2 w-full text-sm">
          <thead><tr className="text-[11px] uppercase tracking-wide text-[#6b7599]"><th className="py-1 text-left font-medium">Time</th><th className="py-1 text-right font-medium">Price</th><th className="py-1 text-right font-medium">Tokens</th></tr></thead>
          <tbody>
            {tape.map((tr, i) => {
              const before = trades[trades.length - 2 - i];
              const move = before ? tr.price - before.price : 0;
              return (
                <tr key={`${tr.t}-${i}`} className="border-t border-[#1b2440]">
                  <td className="py-1.5 text-[#98a2c3] whitespace-nowrap">{day(tr.t)} {time(tr.t)}</td>
                  <td className="py-1.5 text-right font-semibold whitespace-nowrap" style={{ color: move > 0 ? UP : move < 0 ? DOWN : FLAT }}>{arrowOf(move)} {formatMUSD(tr.price)}</td>
                  <td className="py-1.5 text-right text-white">{tr.amount.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
