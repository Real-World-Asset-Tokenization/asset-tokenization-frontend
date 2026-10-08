import React, { useState } from "react";
import StatsBanner from "./StatsBanner";
import AssetCard from "./AssetCard";
import { PlusCircle, ShieldCheck, Code2, RefreshCw, Layers, Search, Filter } from "lucide-react";

export default function MarketplaceView({
  wallet,
  assets,
  stats,
  userBalances,
  loading,
  onRefresh,
  onOpenRegister,
  onOpenAdmin,
  onOpenTeammates,
  onViewDetails,
  onOpenTransfer,
  onOpenBuy
}) {
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAssets = assets.filter((asset) => {
    const matchesFilter = filterStatus === "ALL" || asset.status === filterStatus;
    const matchesSearch =
      searchQuery === "" ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden glass-panel border border-[#94A3BB]/15 p-8 sm:p-12 bg-gradient-to-br from-[#4F46E5]/20 via-[#0B1126] to-[#00E5FF]/10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/25 text-[#00E5FF] text-xs font-semibold mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
            <span>Real-World Asset (RWA) Tokenization Marketplace</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Institutional Real Estate Fractionalized on Blockchain
          </h1>
          <p className="mt-4 text-sm sm:text-base text-[#94A3BB] leading-relaxed">
            Acquire fractional ERC-1155 ownership tokens in verified real estate. Inspect cryptographic deed hashes,
            earn rental income, and exchange property tokens cross-land.
          </p>

          {/* Quick Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenRegister}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-sm shadow-lg shadow-[#4F46E5]/35 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register New Property</span>
            </button>

            <button
              onClick={onOpenAdmin}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#090D22] hover:bg-slate-800 text-[#94A3BB] hover:text-white border border-[#94A3BB]/20 text-sm font-medium transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#00E5FF]" />
              <span>Admin Verification Console</span>
            </button>
          </div>
        </div>
      </div>

      {/* Platform Metrics Banner */}
      <StatsBanner stats={stats} />

      {/* Catalog Header, Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#00E5FF]" />
            Real-World Asset Registry & Offerings
          </h2>
          <p className="text-xs text-[#94A3BB] mt-0.5">
            Browse tokenized physical properties, verify legal deed fingerprints, and acquire fractional units
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search properties or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-xl bg-[#090D22] border border-[#94A3BB]/20 text-xs text-white placeholder-[#94A3BB] focus:outline-none focus:border-[#00E5FF] w-48 sm:w-56"
            />
            <Search className="w-3.5 h-3.5 text-[#94A3BB] absolute left-2.5 top-2.5" />
          </div>

          {/* Filter Pills */}
          <div className="flex p-1 rounded-xl bg-[#090D22] border border-[#94A3BB]/20 text-xs font-medium">
            <button
              onClick={() => setFilterStatus("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterStatus === "ALL" ? "bg-[#4F46E5] text-white shadow-sm" : "text-[#94A3BB] hover:text-white"
              }`}
            >
              All ({assets.length})
            </button>
            <button
              onClick={() => setFilterStatus("Tokenized")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterStatus === "Tokenized" ? "bg-[#4F46E5] text-white shadow-sm" : "text-[#94A3BB] hover:text-white"
              }`}
            >
              Tokenized ({assets.filter((a) => a.status === "Tokenized").length})
            </button>
            <button
              onClick={() => setFilterStatus("Pending")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterStatus === "Pending" ? "bg-[#4F46E5] text-white shadow-sm" : "text-[#94A3BB] hover:text-white"
              }`}
            >
              Pending ({assets.filter((a) => a.status === "Pending").length})
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-[#090D22] hover:bg-slate-800 border border-[#94A3BB]/20 text-[#94A3BB] hover:text-white transition-all cursor-pointer"
            title="Refresh Registry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Asset Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel rounded-2xl h-96 animate-pulse bg-slate-900/50" />
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="text-center py-20 glass-panel rounded-2xl border border-slate-800">
          <p className="text-slate-400 text-sm">No properties found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => (
            <AssetCard
              key={asset.assetId}
              asset={asset}
              userBalance={userBalances[asset.assetId] || 0}
              wallet={wallet}
              onViewDetails={onViewDetails}
              onOpenTransfer={onOpenTransfer}
              onOpenBuy={onOpenBuy}
            />
          ))}
        </div>
      )}
    </div>
  );
}
