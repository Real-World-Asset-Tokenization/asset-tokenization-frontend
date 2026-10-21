export function tokenAllocation(asset, listings, now = Date.now() / 1000) {
  if (!asset?.ownership) return null;
  const { total, ownerBalance } = asset.ownership;
  const offered = listings.filter(item => Number(item.assetId) === Number(asset.tokenId) &&
    item.seller.toLowerCase() === asset.ownerWallet.toLowerCase() && item.status === 0 &&
    (!item.expiresAt || item.expiresAt > now)).reduce((sum, item) => sum + Number(item.amount), 0);
  return {
    total, ownerBalance, offered,
    otherHolders: total - ownerBalance,
    available: Math.max(0, ownerBalance - offered),
    percent: quantity => total > 0 ? (quantity / total * 100).toFixed(2) : "0.00",
  };
}

export function tokensForPercent(total, percent) {
  return Math.floor(total * Number(percent) / 100);
}
