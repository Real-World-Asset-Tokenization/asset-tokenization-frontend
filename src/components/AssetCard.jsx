import React from "react";
import { MapPin, Coins, TrendingUp, ShieldCheck, ArrowRightLeft, Eye, ShoppingCart } from "lucide-react";

export default function AssetCard({
  asset,
  userBalance,
  wallet,
  onViewDetails,
  onOpenTransfer,
  onOpenBuy
}) {
  const isTokenized = asset.status === "Tokenized";
  const userTokens = userBalance || 0;
  const isIssuer = wallet?.account && asset.issuerWallet && wallet.account.toLowerCase() === asset.issuerWallet.toLowerCase();
  const ownershipPercentage = asset.totalShares > 0
    ? ((userTokens / asset.totalShares) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="glass-panel glass-panel-hover rounded-2xl overflow-hidden border border-slate-800/90 flex flex-col group">
      {/* Property Image & Status */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-900">
        <img
          src={asset.imageUrl}
          alt={asset.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-950/80 backdrop-blur-md text-slate-200 border border-slate-700/60">
            Token ID #{asset.assetId}
          </span>
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-950/80 backdrop-blur-md text-indigo-300 border border-indigo-700/60">
            {asset.symbol}
          </span>
          {isIssuer && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 backdrop-blur-md text-amber-300 border border-amber-500/40">
              Your Property
            </span>
          )}
        </div>

        <div className="absolute top-3 right-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 backdrop-blur-md ${
              isTokenized
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : asset.status === "Approved"
                ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                : "bg-amber-500/15 text-amber-300 border-amber-500/30"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isTokenized
                  ? "bg-emerald-400 animate-pulse"
                  : asset.status === "Approved"
                  ? "bg-blue-400"
                  : "bg-amber-400"
              }`}
            />
            {asset.status}
          </span>
        </div>

        {/* Property Type on Bottom Overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-300">
          <span className="font-medium text-indigo-200">{asset.propertyType}</span>
          <span className="flex items-center gap-1 text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            <span className="truncate max-w-[150px]">{asset.location.split(",")[0]}</span>
          </span>
        </div>
      </div>

      {/* Property Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
            {asset.name}
          </h3>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {asset.description}
          </p>

          {/* Economics Grid */}
          <div className="grid grid-cols-2 gap-3 my-4 p-3.5 rounded-xl bg-[#090D22] border border-[#94A3BB]/15">
            <div>
              <p className="text-[11px] text-[#94A3BB] font-medium">Asset Valuation</p>
              <p className="text-sm font-bold text-white mt-0.5">
                LKR {(asset.valuationLKR).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#94A3BB] font-medium">Total Fractions</p>
              <p className="text-sm font-bold text-[#00E5FF] mt-0.5 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-[#00E5FF]" />
                {asset.totalShares.toLocaleString()} Units
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#94A3BB] font-medium">Fraction Price</p>
              <p className="text-sm font-bold text-slate-200 mt-0.5">
                LKR {(asset.sharePriceLKR || (asset.valuationLKR / asset.totalShares)).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#94A3BB] font-medium">Your Ownership</p>
              <p className={`text-sm font-bold mt-0.5 ${userTokens > 0 ? "text-[#00E5FF]" : "text-[#94A3BB]"}`}>
                {userTokens} Units ({ownershipPercentage}%)
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 pt-2 border-t border-[#94A3BB]/15">
          <button
            onClick={() => onViewDetails(asset)}
            className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-[#94A3BB]/20 text-xs font-semibold transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[#94A3BB]" />
            <span>Details</span>
          </button>

          {isTokenized && (
            <button
              onClick={() => onOpenBuy(asset)}
              className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-md shadow-[#4F46E5]/35 text-xs font-semibold transition-all cursor-pointer"
              title="Buy Fractional Shares"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-white" />
              <span>Buy Shares</span>
            </button>
          )}

          {userTokens > 0 && (
            <button
              onClick={() => onOpenTransfer(asset)}
              className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 text-xs font-semibold transition-all cursor-pointer shadow-sm shadow-[#00E5FF]/20"
              title="Transfer Fractional Ownership"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>Transfer</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
