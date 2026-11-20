/**
 * The valuation-based reference price for one fractional asset token.
 *
 * This is deliberately calculated from the asset's current valuation and
 * issued supply instead of trusting a persisted price, which can be stale
 * after a valuation or supply update.
 */
export function referenceTokenPriceLKR(asset) {
  const valuation = Number(asset?.valuationLKR ?? asset?.valuation ?? 0);
  const tokenCount = Number(asset?.totalShares ?? asset?.tokenSupply ?? 0);

  return Number.isFinite(valuation) && Number.isFinite(tokenCount) && valuation > 0 && tokenCount > 0
    ? valuation / tokenCount
    : 0;
}
