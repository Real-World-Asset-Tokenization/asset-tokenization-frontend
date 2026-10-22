import { ethers } from "ethers";
import { getContracts, getContractAddresses, trackTxGas } from "./contractService";

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


// Completed purchases come from two events: a normal offer (ListingPurchased) and a signed order
// (SignedOrderFilled). Both are returned in one shape. A signed order's id matches the book's "S-XXXXXX".
const signedId = (hash) => `S-${hash.slice(2, 8).toUpperCase()}`;
// The current marketplace plus any that it replaced, so earlier trades are not lost when the contract is upgraded.
const marketplaces = (c) => [c, ...getContractAddresses().previousTokenMarketplaces.map((address) => new ethers.Contract(address, c.interface, c.runner))];

async function fillEvents(c, { buyer = null, seller = null } = {}) {
  const found = await Promise.all(marketplaces(c).map(async (m) => Promise.all([
    m.queryFilter(m.filters.ListingPurchased(null, buyer, seller)),
    m.interface.getEvent("SignedOrderFilled") ? m.queryFilter(m.filters.SignedOrderFilled(null, seller, buyer)) : [],
  ])));
  const normal = found.flatMap(([n]) => n);
  const signed = found.flatMap(([, sg]) => sg);
  return [
    ...normal.map((e) => ({ e, listingId: Number(e.args.listingId) })),
    ...signed.map((e) => ({ e, listingId: signedId(e.args.orderHash) })),
  ].map(({ e, listingId }) => ({
    listingId, buyer: e.args.buyer, seller: e.args.seller, assetId: Number(e.args.assetId), amount: Number(e.args.amount),
    totalPrice: e.args.totalPrice, platformFee: e.args.platformFee, blockNumber: e.blockNumber,
    transactionHash: e.transactionHash, index: e.index,
  }));
}

// Resale royalty paid to the issuer out of a seller's proceeds, summed per transaction and property.
async function royaltiesPaidBy(c, wallet) {
  const paid = new Map();
  if (!c.interface.getEvent("RoyaltyPaid")) return paid;
  const events = (await Promise.all(marketplaces(c).map((m) => m.queryFilter(m.filters.RoyaltyPaid(null, null, wallet))))).flat();
  for (const e of events) {
    const key = `${e.transactionHash}:${Number(e.args.assetId)}`;
    paid.set(key, (paid.get(key) || 0) + Number(ethers.formatUnits(e.args.amount, 6)));
  }
  return paid;
}

// The wallet's completed marketplace trades (bought and sold), newest first.
export async function loadMyTrades(wallet) {
  const { tokenMarketplaceContract: c, registryContract, runner } = await getContracts(false);
  try {
    const [bought, sold, royalties] = await Promise.all([fillEvents(c, { buyer: wallet }), fillEvents(c, { seller: wallet }), royaltiesPaidBy(c, wallet)]);
    const names = new Map();
    const rows = await Promise.all([...bought.map((f) => [f, "Bought"]), ...sold.map((f) => [f, "Sold"])].map(async ([f, side]) => {
      if (!names.has(f.assetId)) names.set(f.assetId, registryContract.getAsset(f.assetId).then((a) => a.name).catch(() => `Asset #${f.assetId}`));
      const [block, name] = await Promise.all([runner.getBlock(f.blockNumber), names.get(f.assetId)]);
      const total = Number(ethers.formatUnits(f.totalPrice, 6));
      const fee = Number(ethers.formatUnits(f.platformFee, 6));
      const royalty = royalties.get(`${f.transactionHash}:${f.assetId}`) || 0;
      return {
        side, assetId: f.assetId, name, amount: f.amount, total,
        listingId: f.listingId, buyer: f.buyer, seller: f.seller,
        received: side === "Sold" ? total - fee - royalty : null,
        at: new Date(block.timestamp * 1000), txHash: f.transactionHash,
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
    const events = (await fillEvents(tokenMarketplaceContract)).filter((f) => f.assetId === Number(tokenId));
    const rows = await Promise.all(events.map(async (f) => {
      const block = await runner.getBlock(f.blockNumber);
      const amount = f.amount;
      const total = Number(ethers.formatUnits(f.totalPrice, 6));
      return { at: new Date(block.timestamp * 1000), amount, total, price: amount > 0 ? total / amount : null, txHash: f.transactionHash };
    }));
    return rows.filter((r) => r.price != null).sort((a, b) => a.at - b.at);
  } finally { runner.destroy(); }
}

// Every completed marketplace purchase of every property, oldest first. Powers the
// market watch, where each property trades like a ticker.
export async function loadAllTrades() {
  const { tokenMarketplaceContract, runner } = await getContracts(false);
  try {
    const events = await fillEvents(tokenMarketplaceContract);
    const blocks = new Map();
    const rows = await Promise.all(events.map(async (f) => {
      if (!blocks.has(f.blockNumber)) blocks.set(f.blockNumber, runner.getBlock(f.blockNumber));
      const block = await blocks.get(f.blockNumber);
      const amount = f.amount;
      const total = Number(ethers.formatUnits(f.totalPrice, 6));
      return {
        assetId: f.assetId, listingId: f.listingId, buyer: f.buyer, seller: f.seller,
        amount, total, price: amount > 0 ? total / amount : null,
        t: block.timestamp * 1000, txHash: f.transactionHash, logIndex: f.index,
      };
    }));
    return rows.filter((r) => r.price != null).sort((a, b) => a.t - b.t || a.logIndex - b.logIndex);
  } finally { runner.destroy(); }
}
