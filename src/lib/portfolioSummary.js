// Profit / loss maths shared by the portfolio and Profit & Yield pages.
// All money is returned in USD (mUSD is pegged 1:1); callers format it.
//
//   current value     = what you paid × (land valuation now ÷ land valuation when you bought),
//                       both valuations read from the chain; tokens with no purchase price
//                       use latest valuation × tokens held ÷ total tokens
//   unrealized P/L    = current value − average cost of the tokens still held
//   realized P/L      = sale proceeds (after platform fee) − average cost of tokens sold
//   dividend income   = dividends claimed + dividends ready to claim
//   total return      = unrealized + realized + dividend income
//   dividend yield    = dividend income ÷ cost of tokens held
export function summarizeHoldings(rows, dividends, convert) {
  const dividendsByAsset = new Map();
  for (const d of dividends || []) {
    const entry = dividendsByAsset.get(d.assetId) || { received: 0, claimable: 0 };
    if (d.isClaimed) entry.received += d.amount;
    else if (d.claimable) entry.claimable += d.amount;
    dividendsByAsset.set(d.assetId, entry);
  }

  const holdings = rows.map((row) => {
    // Bought tokens: cost moved by the land-value change since purchase.
    // Tokens with no purchase price (e.g. received at tokenization): share of the valuation.
    const valueUSD = row.valueByChangeUSD != null && row.balance > 0 ? row.valueByChangeUSD : convert(row.valueLKR, "LKR", "USD");
    const unrealizedUSD = row.costUSD == null ? null : valueUSD - row.costUSD;
    const div = dividendsByAsset.get(row.id) || { received: 0, claimable: 0 };
    const income = div.received + div.claimable;
    const totalReturnUSD = unrealizedUSD == null || row.realizedUSD == null ? null : unrealizedUSD + row.realizedUSD + income;
    return {
      ...row,
      valueUSD,
      unrealizedUSD,
      unrealizedPct: unrealizedUSD != null && row.costUSD > 0 ? (unrealizedUSD / row.costUSD) * 100 : null,
      dividendsReceivedUSD: div.received,
      dividendsClaimableUSD: div.claimable,
      totalReturnUSD,
      yieldPct: row.costUSD > 0 ? (income / row.costUSD) * 100 : null,
    };
  });

  const known = holdings.filter((h) => h.costUSD != null);
  const sum = (list, key) => list.reduce((total, h) => total + (h[key] || 0), 0);
  const invested = sum(known, "costUSD");
  const unrealized = sum(known, "unrealizedUSD");
  const realized = sum(holdings.filter((h) => h.realizedUSD != null), "realizedUSD");
  const received = (dividends || []).filter((d) => d.isClaimed).reduce((t, d) => t + d.amount, 0);
  const claimable = (dividends || []).filter((d) => d.claimable).reduce((t, d) => t + d.amount, 0);
  const totalReturn = unrealized + realized + received + claimable;

  return {
    holdings,
    totals: {
      currentValue: sum(holdings, "valueUSD"),
      knownValue: sum(known, "valueUSD"),
      invested,
      unrealized,
      realized,
      received,
      claimable,
      totalReturn,
      totalReturnPct: invested > 0 ? (totalReturn / invested) * 100 : null,
      yieldPct: invested > 0 ? ((received + claimable) / invested) * 100 : null,
      unknownCostCount: holdings.length - known.length,
    },
  };
}

export const signClass = (n) => (n == null ? "text-zinc-400" : n < 0 ? "text-rose-300" : n > 0 ? "text-emerald-300" : "text-zinc-200");
export const pct = (n) => (n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(2)}%`);
