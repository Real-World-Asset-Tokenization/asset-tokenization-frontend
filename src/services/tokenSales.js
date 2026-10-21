import { ethers } from "ethers";
import { getContracts, trackTxGas } from "./contractService";

const STATUS = ["Active", "Sold", "Cancelled"];
const isLive = (l, now = Date.now() / 1000) => l.status === "Active" && (!l.expiresAt || l.expiresAt > now);

// The seller's offers, read straight from the TokenMarketplace contract.
export async function loadMyOffers(wallet) {
  const { tokenMarketplaceContract, runner } = await getContracts(false);
  try {
    const [ids, feeBps] = await Promise.all([
      tokenMarketplaceContract.getListingsBySeller(wallet),
      tokenMarketplaceContract.feeBps(),
    ]);
    const offers = await Promise.all(ids.map(async (id) => {
      const l = await tokenMarketplaceContract.getListing(id);
      return {
        listingId: Number(l.listingId), assetId: Number(l.assetId), amount: Number(l.amount),
        priceUSD: Number(ethers.formatUnits(l.pricePerToken, 6)),
        expiresAt: Number(l.expiresAt), status: STATUS[Number(l.status)],
      };
    }));
    return { offers: offers.sort((a, b) => b.listingId - a.listingId), feeRate: Number(feeBps) / 10000 };
  } finally { runner.destroy(); }
}

// Tokens already in a live offer stay in the wallet, so they must not be offered twice.
export const tokensOnOffer = (offers, assetId) =>
  offers.filter((o) => o.assetId === assetId && isLive(o)).reduce((s, o) => s + o.amount, 0);
export { isLive };

// Puts tokens up for sale. Tokens stay in the investor's wallet until a buyer pays;
// the contract then swaps mUSD and tokens in one transaction.
export async function listTokensForSale({ assetId, amount, priceUSD, days }) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Enter a whole number of tokens.");
  if (!(priceUSD > 0)) throw new Error("Enter a price above zero.");
  const { tokenMarketplaceContract, tokenContract, addrs, runner } = await getContracts(true);
  const seller = await runner.getAddress();

  const balance = Number(await tokenContract.balanceOf(seller, assetId));
  const { offers } = await loadMyOffers(seller);
  const free = balance - tokensOnOffer(offers, assetId);
  if (amount > free) throw new Error(`You can list up to ${free} tokens (${balance} held, ${balance - free} already on sale).`);

  // One-time permission for the marketplace to move these tokens when someone buys.
  if (!(await tokenContract.isApprovedForAll(seller, addrs.tokenMarketplaceAddress))) {
    await (await tokenContract.setApprovalForAll(addrs.tokenMarketplaceAddress, true)).wait();
  }

  const receipt = await (await tokenMarketplaceContract.createListing(
    assetId, amount, ethers.parseUnits(priceUSD.toFixed(6), 6), addrs.paymentTokenAddress, Math.round(days * 86400)
  )).wait();
  trackTxGas(receipt.hash, "MarketplaceListing", seller, "Investor", assetId);
  return receipt;
}

export async function cancelOffer(listingId) {
  const { tokenMarketplaceContract } = await getContracts(true);
  return (await tokenMarketplaceContract.cancelListing(listingId)).wait();
}

// The wallet's completed marketplace trades (bought and sold), newest first.
export async function loadMyTrades(wallet) {
  const { tokenMarketplaceContract, registryContract, runner } = await getContracts(false);
  try {
    const [bought, sold] = await Promise.all([
      tokenMarketplaceContract.queryFilter(tokenMarketplaceContract.filters.ListingPurchased(null, wallet)),
      tokenMarketplaceContract.queryFilter(tokenMarketplaceContract.filters.ListingPurchased(null, null, wallet)),
    ]);
    const names = new Map();
    const rows = await Promise.all([...bought.map((e) => [e, "Bought"]), ...sold.map((e) => [e, "Sold"])].map(async ([e, side]) => {
      const assetId = Number(e.args.assetId);
      if (!names.has(assetId)) names.set(assetId, registryContract.getAsset(assetId).then((a) => a.name).catch(() => `Asset #${assetId}`));
      const [block, name] = await Promise.all([runner.getBlock(e.blockNumber), names.get(assetId)]);
      const total = Number(ethers.formatUnits(e.args.totalPrice, 6));
      return {
        side, assetId, name, amount: Number(e.args.amount), total,
        listingId: Number(e.args.listingId), buyer: e.args.buyer, seller: e.args.seller,
        received: side === "Sold" ? total - Number(ethers.formatUnits(e.args.platformFee, 6)) : null,
        at: new Date(block.timestamp * 1000), txHash: e.transactionHash,
      };
    }));
    return rows.sort((a, b) => b.at - a.at);
  } finally { runner.destroy(); }
}

// Every completed marketplace purchase of one property, oldest first, with the
// per-token price paid (mUSD) and the block time.
export async function loadTradeHistory(tokenId) {
  const { tokenMarketplaceContract, runner } = await getContracts(false);
  try {
    const events = (await tokenMarketplaceContract.queryFilter(tokenMarketplaceContract.filters.ListingPurchased()))
      .filter((e) => Number(e.args.assetId) === Number(tokenId));
    const rows = await Promise.all(events.map(async (e) => {
      const block = await runner.getBlock(e.blockNumber);
      const amount = Number(e.args.amount);
      const total = Number(ethers.formatUnits(e.args.totalPrice, 6));
      return { at: new Date(block.timestamp * 1000), amount, total, price: amount > 0 ? total / amount : null, txHash: e.transactionHash };
    }));
    return rows.filter((r) => r.price != null).sort((a, b) => a.at - b.at);
  } finally { runner.destroy(); }
}

// Every completed marketplace purchase of every property, oldest first. Powers the
// market watch, where each property trades like a ticker.
export async function loadAllTrades() {
  const { tokenMarketplaceContract, runner } = await getContracts(false);
  try {
    const events = await tokenMarketplaceContract.queryFilter(tokenMarketplaceContract.filters.ListingPurchased());
    const blocks = new Map();
    const rows = await Promise.all(events.map(async (e) => {
      if (!blocks.has(e.blockNumber)) blocks.set(e.blockNumber, runner.getBlock(e.blockNumber));
      const block = await blocks.get(e.blockNumber);
      const amount = Number(e.args.amount);
      const total = Number(ethers.formatUnits(e.args.totalPrice, 6));
      return {
        assetId: Number(e.args.assetId), listingId: Number(e.args.listingId), buyer: e.args.buyer, seller: e.args.seller,
        amount, total, price: amount > 0 ? total / amount : null,
        t: block.timestamp * 1000, txHash: e.transactionHash, logIndex: e.index,
      };
    }));
    return rows.filter((r) => r.price != null).sort((a, b) => a.t - b.t || a.logIndex - b.logIndex);
  } finally { runner.destroy(); }
}
