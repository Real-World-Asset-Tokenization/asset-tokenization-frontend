import React from "react";
import { Building2, Coins, CheckCircle2, FileKey2 } from "lucide-react";

export default function StatsBanner({ stats }) {
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
            <p className="text-xs font-medium text-[#94A3BB]">Total Portfolio Value</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              LKR {(valuation / 1000000).toFixed(1)}M
            </h3>
            <p className="text-[11px] text-[#00E5FF] mt-1 flex items-center gap-1 font-medium">
              <span>●</span> Real-World Asset Backed
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-[#4F46E5]/15 border border-[#4F46E5]/30 flex items-center justify-center text-[#4F46E5]">
            <Building2 className="w-6 h-6 text-[#00E5FF]" />
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
            <p className="text-[11px] text-[#00E5FF] mt-1 flex items-center gap-1 font-medium">
              <span>●</span> Divisible Fractional Ownership
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/25 flex items-center justify-center text-[#00E5FF]">
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
          <div className="h-12 w-12 rounded-xl bg-[#4F46E5]/15 border border-[#4F46E5]/30 flex items-center justify-center text-[#4F46E5]">
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
            <p className="text-[11px] text-[#00E5FF] mt-1 flex items-center gap-1 font-medium">
              <span>●</span> Verifiable Legal Integrity
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/25 flex items-center justify-center text-[#00E5FF]">
            <FileKey2 className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
