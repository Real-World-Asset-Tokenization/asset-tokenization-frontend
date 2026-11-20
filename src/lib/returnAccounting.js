// Average acquisition cost for supported marketplace trades. A transfer with no
// recorded purchase price makes cost unknown; it is never treated as free.
//
// Each purchase also carries the property's on-chain valuation at the block it was
// bought (event.entryValuation). The tokens still held are then valued by how much the
// land value has moved since purchase:
//   value now = Σ lot cost × (current valuation ÷ valuation when that lot was bought)
// "units" below is Σ cost ÷ entry valuation, so value now = units × current valuation.
export function calculateCostBasis(events, wallet, currentBalance) {
  let quantity = 0, cost = 0, realized = 0, known = true;
  let units = 0, unitsKnown = true;
  for (const event of events) {
    const incoming = event.to.toLowerCase() === wallet.toLowerCase();
    const outgoing = event.from.toLowerCase() === wallet.toLowerCase();
    if (incoming && outgoing) continue;
    if (incoming) {
      quantity += event.amount;
      if (event.purchaseCost == null) known = false;
      else {
        cost += event.purchaseCost;
        if (event.entryValuation > 0) units += event.purchaseCost / event.entryValuation;
        else unitsKnown = false;
      }
    } else if (outgoing) {
      if (event.amount > quantity) known = false;
      const share = quantity > 0 ? event.amount / quantity : 0;
      const removed = cost * share;
      if (event.saleProceeds != null && known) realized += event.saleProceeds - removed;
      else if (event.saleProceeds != null) realized = null;
      quantity -= event.amount;
      cost -= removed;
      units -= units * share;
    }
  }
  if (quantity !== currentBalance || !known) return { cost: null, realized: null, units: null };
  return { cost, realized, units: unitsKnown ? units : null };
}
