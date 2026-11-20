import { ethers } from "ethers";
import { getContracts } from "./contractService";
import { calculateCostBasis } from "../lib/returnAccounting";

export async function loadInvestorReturns(wallet) {
  const { registryContract, tokenContract, tokenMarketplaceContract, paymentTokenContract, runner, addrs } = await getContracts(false);
  try {
    const block = await runner.getBlockNumber();
    const [ids, decimals, trades, single, batches] = await Promise.all([
      registryContract.getAllAssetIds({ blockTag: block }),
      paymentTokenContract.decimals(),
      tokenMarketplaceContract.queryFilter("ListingPurchased", 0, block),
      tokenContract.queryFilter("TransferSingle", 0, block),
      tokenContract.queryFilter("TransferBatch", 0, block),
    ]);
    const allTransfers = [...single, ...batches].sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index);
    return await Promise.all(ids.map(async id => {
      const [asset, rawBalance] = await Promise.all([
        registryContract.getAsset(id, { blockTag: block }),
        tokenContract.balanceOf(wallet, id, { blockTag: block }),
      ]);
      const balance = Number(rawBalance);
      const events = [];
      // On-chain valuation at the block each purchase happened (cached per block).
      const valuationAt = new Map();
      const entryValuation = (blockNumber) => {
        if (!valuationAt.has(blockNumber)) {
          valuationAt.set(blockNumber, registryContract.getAsset(id, { blockTag: blockNumber })
            .then(a => Number(a.valuationLKR)).catch(() => null));
        }
        return valuationAt.get(blockNumber);
      };
      for (const log of allTransfers) {
        const a = log.args;
        if (a.from.toLowerCase() !== wallet.toLowerCase() && a.to.toLowerCase() !== wallet.toLowerCase()) continue;
        const pairs = log.fragment.name === "TransferSingle" ? [[a.id, a.value]] : Array.from(a[3], (value, i) => [value, a[4][i]]);
        for (const [tokenId, amount] of pairs) {
          if (tokenId !== id) continue;
          const matches = trades.filter(t => t.transactionHash === log.transactionHash && t.args.assetId === id &&
            t.args.buyer.toLowerCase() === a.to.toLowerCase() && t.args.seller.toLowerCase() === a.from.toLowerCase() &&
            t.args.amount === amount && t.args.paymentToken.toLowerCase() === addrs.paymentTokenAddress.toLowerCase());
          const trade = matches.length === 1 ? matches[0].args : null;
          events.push({
            from: a.from, to: a.to, amount: Number(amount),
            entryValuation: trade && a.to.toLowerCase() === wallet.toLowerCase() ? await entryValuation(log.blockNumber) : null,
            purchaseCost: trade ? Number(ethers.formatUnits(trade.totalPrice, decimals)) : null,
            saleProceeds: trade ? Number(ethers.formatUnits(trade.totalPrice - trade.platformFee, decimals)) : null,
          });
        }
      }
      const basis = calculateCostBasis(events, wallet, balance);
      return {
        id: Number(id), name: asset.name, balance, supply: Number(asset.totalShares),
        valuationLKR: Number(asset.valuationLKR),
        valueLKR: Number(asset.valuationLKR) * balance / Number(asset.totalShares),
        costUSD: basis.cost, realizedUSD: basis.realized, hasHistory: events.length > 0,
        // Value of held tokens moved by the land-value change since purchase (USD, like cost).
        valueByChangeUSD: basis.units == null || basis.cost == null ? null : basis.units * Number(asset.valuationLKR),
        // Average land valuation (LKR) at the time the held tokens were bought.
        entryValuationLKR: basis.units > 0 && basis.cost != null ? basis.cost / basis.units : null,
      };
    }));
  } finally { runner.destroy(); }
}
