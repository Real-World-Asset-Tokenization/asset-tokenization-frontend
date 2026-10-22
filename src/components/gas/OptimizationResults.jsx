import { Zap } from "lucide-react";
import { pct, savingsClass } from "./format";

// Gas saved by signed marketplace orders, permit approvals, signed votes and single-transaction minting,
// as measured by scripts/measureOptimizationGas.js.
export default function OptimizationResults({ optimizations }) {
  return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl mb-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-400" />
            Marketplace & Voting Optimizations
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {optimizations.measured
              ? `Measured on a Hardhat node. Measured ${new Date(optimizations.generatedAt).toLocaleString()}.`
              : "No optimization benchmark has been measured yet."}
          </p>
        </div>

        {!optimizations.measured && (
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs text-zinc-300">
            Run <span className="font-mono text-white">npx hardhat run scripts/measureOptimizationGas.js</span> in the blockchain folder, then refresh this page.
          </div>
        )}

        {optimizations.listing && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-white mb-3">Selling tokens: on-chain listing vs signed order</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Seller pays (listing)</th>
                    <th className="py-3 px-4">Buyer pays (purchase)</th>
                    <th className="py-3 px-4">Total gas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  <tr>
                    <td className="py-3 px-4 text-zinc-300 font-sans">On-chain listing</td>
                    <td className="py-3 px-4 text-zinc-300">{optimizations.listing.onChain.sellerListingGas.toLocaleString()} gas</td>
                    <td className="py-3 px-4 text-zinc-300">{optimizations.listing.onChain.buyerPurchaseGas.toLocaleString()} gas</td>
                    <td className="py-3 px-4 text-zinc-300">{optimizations.listing.onChain.totalGas.toLocaleString()} gas</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-white font-sans">Signed order (EIP-712)</td>
                    <td className="py-3 px-4 text-emerald-400">0 gas (signs off-chain)</td>
                    <td className="py-3 px-4 text-zinc-300">{optimizations.listing.signedOrder.buyerPurchaseGas.toLocaleString()} gas</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">{optimizations.listing.signedOrder.totalGas.toLocaleString()} gas</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-400 mt-3">
              Total gas for one sale is {optimizations.listing.totalGasSavedPercent}% lower. The seller's whole listing cost
              ({optimizations.listing.onChain.sellerListingGas.toLocaleString()} gas) disappears, and the buyer pays
              {" "}{optimizations.listing.buyerExtraGas.toLocaleString()} gas more to verify the signature.
            </p>
          </div>
        )}

        {optimizations.listing?.approval && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-white mb-3">Buying: approve transaction vs off-chain permit</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Transactions</th>
                    <th className="py-3 px-4">Total gas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  <tr>
                    <td className="py-3 px-4 text-zinc-300 font-sans">Approve, then buy</td>
                    <td className="py-3 px-4 text-zinc-300">2</td>
                    <td className="py-3 px-4 text-zinc-300">{optimizations.listing.approval.separateTotalGas.toLocaleString()} gas</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-white font-sans">Permit signed off-chain, buy</td>
                    <td className="py-3 px-4 text-emerald-400">1</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">{optimizations.listing.approval.permitFillGas.toLocaleString()} gas</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-400 mt-3">
              {pct(optimizations.listing.approval.totalGasSavedPercent)} less gas and one less wallet confirmation per purchase.
            </p>
          </div>
        )}

        {optimizations.minting.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-white mb-3">Creating the tokens: one transaction per token vs the whole supply at once</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Tokens</th>
                    <th className="py-3 px-4">One by one (total)</th>
                    <th className="py-3 px-4">Single mint</th>
                    <th className="py-3 px-4">Gas saved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {optimizations.minting.map((row) => (
                    <tr key={row.tokens}>
                      <td className="py-3 px-4 text-white font-bold">{row.tokens.toLocaleString()}</td>
                      <td className="py-3 px-4 text-zinc-300">{row.perTokenMintsTotalGas.toLocaleString()} gas ({row.transactionsBaseline.toLocaleString()} tx)</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">{row.singleMintGas.toLocaleString()} gas (1 tx)</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${savingsClass(row.totalGasSavedPercent)}`}>{pct(row.totalGasSavedPercent)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-400 mt-3">
              The mint alone is compared here. Tokenizing a property on the platform also does registry bookkeeping and costs {optimizations.minting[0].platformTokenizeGas.toLocaleString()} gas in total, whatever the number of tokens.
            </p>
          </div>
        )}

        {optimizations.voting.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Property sale voting: one transaction per holder vs one signed batch</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Voters</th>
                    <th className="py-3 px-4">Individual votes (total)</th>
                    <th className="py-3 px-4">Gas / vote</th>
                    <th className="py-3 px-4">Signed batch (total)</th>
                    <th className="py-3 px-4">Gas / vote</th>
                    <th className="py-3 px-4">Total gas saved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {optimizations.voting.map((row) => (
                    <tr key={row.voters}>
                      <td className="py-3 px-4 text-white font-bold">{row.voters.toLocaleString()}</td>
                      <td className="py-3 px-4 text-zinc-300">{row.individualTotalGas.toLocaleString()}</td>
                      <td className="py-3 px-4 text-zinc-400">{row.individualPerVoteGas.toLocaleString()}</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">{row.batchTotalGas.toLocaleString()}</td>
                      <td className="py-3 px-4 text-zinc-400">{row.batchPerVoteGas.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${savingsClass(row.totalGasSavedPercent)}`}>
                          {pct(row.totalGasSavedPercent)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-400 mt-3">
              With signed votes the holders pay no gas. One relayer (the platform or any account) pays the batch transaction, so this moves
              the cost off the voters; the network total is also lower because the batch saves the per-transaction base cost.
            </p>
          </div>
        )}
      </div>
  );
}
