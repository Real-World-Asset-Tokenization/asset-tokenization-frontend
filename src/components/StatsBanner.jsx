import React from "react";
import { Building2, Coins, CheckCircle2, FileKey2 } from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";

export default function StatsBanner({ stats }) {
  const { currency, formatLKR } = useCurrency();
  const valuation = stats?.totalValuationLKR || 85000000;
  const totalTokens = stats?.totalFractionalShares || 8500;
  const assetCount = stats?.totalAssets || 3;
  const tokenizedCount = stats?.tokenizedAssetsCount || 1;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Metric 1 */}
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden border border-[#94A3BB]/15">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#94A3BB]">Total Portfolio Value ({currency})</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              {formatLKR(valuation, { compact: true })}
            </h3>
            <p className="text-[11px] text-[#22e07a] mt-1 flex items-center gap-1 font-medium">
              <span>●</span> Real-World Asset Backed
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-[#16a34a]/15 border border-[#16a34a]/30 flex items-center justify-center text-[#16a34a]">
            <Building2 className="w-6 h-6 text-[#22e07a]" />
          </div>
        </div>
      </div>

      {/* Metric 2 */}
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden border border-[#94A3BB]/15">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#94A3BB]">Fractional ERC-1155 Shares</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              {totalTokens.toLocaleString()} Units
            </h3>
            <p className="text-[11px] text-[#22e07a] mt-1 flex items-center gap-1 font-medium">
              <span>●</span> Divisible Fractional Ownership
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-[#22e07a]/10 border border-[#22e07a]/25 flex items-center justify-center text-[#22e07a]">
            <Coins className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Metric 3 */}
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden border border-[#94A3BB]/15">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#94A3BB]">Registered Properties</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              {assetCount} Assets
            </h3>
            <p className="text-[11px] text-slate-300 mt-1 flex items-center gap-1 font-medium">
              <span>●</span> {tokenizedCount} Tokenized on Blockchain
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-[#16a34a]/15 border border-[#16a34a]/30 flex items-center justify-center text-[#16a34a]">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Metric 4 */}
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden border border-[#94A3BB]/15">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#94A3BB]">Cryptographic Deeds</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              SHA-256 + IPFS
            </h3>
            <p className="text-[11px] text-[#22e07a] mt-1 flex items-center gap-1 font-medium">
              <span>●</span> Verifiable Legal Integrity
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-[#22e07a]/10 border border-[#22e07a]/25 flex items-center justify-center text-[#22e07a]">
            <FileKey2 className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
