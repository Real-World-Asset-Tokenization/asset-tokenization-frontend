import React, { useState } from "react";
import {
  Wallet,
  Building,
  TrendingUp,
  DollarSign,
  Coins,
  ArrowRightLeft,
  Eye,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ExternalLink,
  Sparkles,
  ChevronRight
} from "lucide-react";

export default function DashboardView({
  wallet,
  assets,
  userBalances,
  onNavigateMarketplace,
  onViewDetails,
  onOpenTransfer,
  onOpenBuy
}) {
  const [selectedTimeframe, setSelectedTimeframe] = useState("30D");

  // Calculate user portfolio metrics
  const tokenizedAssets = assets.filter((a) => a.status === "Tokenized");
  const ownedAssets = tokenizedAssets.filter((a) => (userBalances[a.assetId] || 0) > 0);

  const totalUserPortfolioLKR = ownedAssets.reduce((sum, a) => {
    const shares = userBalances[a.assetId] || 0;
    const price = a.sharePriceLKR || (a.valuationLKR / a.totalShares);
    return sum + shares * price;
  }, 0);

  // Simulated 9.4% average rental yield on real estate
  const annualRentalIncomeLKR = Math.round(totalUserPortfolioLKR * 0.094);
  const monthlyRentalIncomeLKR = Math.round(annualRentalIncomeLKR / 12);
  const reservedEthBalance = parseFloat(wallet?.balance || "0").toFixed(2);

  // SVG Chart points for rental income curve (matching RealT pattern in Image 4)
  const chartPoints = [
    { label: "Mar 26", val: 35, y: 140 },
    { label: "Mar 30", val: 20, y: 165 },
    { label: "Apr 04", val: 65, y: 95 },
    { label: "Apr 06", val: 110, y: 35 },
    { label: "Apr 14", val: 55, y: 115 },
    { label: "Apr 18", val: 75, y: 85 },
    { label: "Apr 24", val: 95, y: 55 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Building className="w-6 h-6 text-indigo-400" />
            Investor Portfolio Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time token holdings, physical property valuations, rental yields, and blockchain transactions
          </p>
        </div>

        {/* Connected Wallet Pill */}
        <div className="flex items-center space-x-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400">Connected:</span>
            <span className="font-mono text-slate-200 font-semibold">
              {wallet.account ? `${wallet.account.slice(0, 6)}...${wallet.account.slice(-4)}` : "None"}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Stat Metric Cards (Matching RealT Dashboard - Image 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Properties Value</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Building className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white tracking-tight">
              LKR {totalUserPortfolioLKR.toLocaleString()}
            </h3>
            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
              <TrendingUp className="w-3 h-3" />
              <span>≈ ${(totalUserPortfolioLKR / 310).toFixed(0)} USD</span>
            </p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Rental Income (360)</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-emerald-400 tracking-tight">
              LKR {annualRentalIncomeLKR.toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Monthly avg: <strong className="text-slate-200">LKR {monthlyRentalIncomeLKR.toLocaleString()}</strong>
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Properties</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white tracking-tight">
              {ownedAssets.length} <span className="text-xs font-normal text-slate-400">/ {tokenizedAssets.length} Tokenized</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Active fractions in portfolio
            </p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Reserved Balance</span>
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-100 tracking-tight">
              {reservedEthBalance} ETH
            </h3>
            <p className="text-[11px] text-indigo-400 mt-1 font-mono">
              Ready for gas & new land buys
            </p>
          </div>
        </div>
      </div>

      {/* Chart Section (Matching RealT Curve - Image 4) */}
      <div className="glass-panel p-6 rounded-3xl border border-[#94A3BB]/15 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00E5FF]" />
              Rental Income & Yield Trajectory
            </h3>
            <p className="text-xs text-[#94A3BB]">Historical performance across distributed tenant cash flows</p>
          </div>

          <div className="flex p-1 rounded-xl bg-[#090D22] border border-[#94A3BB]/20 text-xs font-semibold">
            {["7D", "30D", "90D", "1Y"].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTimeframe(t)}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedTimeframe === t
                    ? "bg-[#4F46E5] text-white shadow-sm"
                    : "text-[#94A3BB] hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Area Chart with Neon Cyan #00E5FF & Indigo #4F46E5 Gradient */}
        <div className="h-48 w-full pt-4">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 700 180" preserveAspectRatio="none">
            <defs>
              <linearGradient id="yieldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.35" />
                <stop offset="60%" stopColor="#4F46E5" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#050816" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            <line x1="0" y1="40" x2="700" y2="40" stroke="#94A3BB" strokeDasharray="3 3" opacity="0.15" />
            <line x1="0" y1="90" x2="700" y2="90" stroke="#94A3BB" strokeDasharray="3 3" opacity="0.15" />
            <line x1="0" y1="140" x2="700" y2="140" stroke="#94A3BB" strokeDasharray="3 3" opacity="0.15" />

            {/* Area Fill */}
            <path
              d="M 50 140 C 120 165, 180 95, 250 95 C 320 35, 380 35, 450 115 C 520 85, 580 85, 650 55 L 650 180 L 50 180 Z"
              fill="url(#yieldGrad)"
            />

            {/* Neon Cyan Line Curve */}
            <path
              d="M 50 140 C 120 165, 180 95, 250 95 C 320 35, 380 35, 450 115 C 520 85, 580 85, 650 55"
              fill="none"
              stroke="#00E5FF"
              strokeWidth="3"
            />

            {/* Data points */}
            {[
              { x: 50, y: 140, l: "Mar 26" },
              { x: 150, y: 165, l: "Mar 30" },
              { x: 250, y: 95, l: "Apr 4" },
              { x: 350, y: 35, l: "Apr 6" },
              { x: 450, y: 115, l: "Apr 14" },
              { x: 550, y: 85, l: "Apr 18" },
              { x: 650, y: 55, l: "Apr 24" }
            ].map((pt, i) => (
              <g key={i}>
                <circle cx={pt.x} cy={pt.y} r="5" fill="#050816" stroke="#00E5FF" strokeWidth="2.5" />
                <text x={pt.x} y="175" textAnchor="middle" fill="#94A3BB" fontSize="11" fontFamily="sans-serif">
                  {pt.l}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* "My Properties" Portfolio Table (Matching RealT Dashboard - Image 4) */}
      <div className="glass-panel rounded-3xl border border-slate-800/90 overflow-hidden space-y-3">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-400" />
              My Real-World Properties Portfolio
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Breakdown of fractional land assets held by your connected wallet
            </p>
          </div>

          <button
            onClick={onNavigateMarketplace}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all cursor-pointer"
          >
            <span>Explore All Assets</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {ownedAssets.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Coins className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h4 className="text-base font-bold text-white">No Properties In Portfolio Yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              You haven't acquired fractional shares in any properties. Browse the marketplace or claim initial shares to get started.
            </p>
            <button
              onClick={onNavigateMarketplace}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 cursor-pointer"
            >
              Browse Asset Marketplace
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-4 pl-6">Property / Address</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Holdings</th>
                  <th className="p-4">Equity Value</th>
                  <th className="p-4">Est. Rental Yield (360)</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {ownedAssets.map((asset) => {
                  const shares = userBalances[asset.assetId] || 0;
                  const price = asset.sharePriceLKR || (asset.valuationLKR / asset.totalShares);
                  const equityVal = shares * price;
                  const rentalInc = Math.round(equityVal * 0.094);
                  const pct = asset.totalShares > 0 ? ((shares / asset.totalShares) * 100).toFixed(1) : "0.0";

                  return (
                    <tr key={asset.assetId} className="hover:bg-slate-900/50 transition-colors group">
                      <td className="p-4 pl-6">
                        <div className="flex items-center space-x-3">
                          <img
                            src={asset.imageUrl}
                            alt={asset.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-700/60"
                          />
                          <div>
                            <span className="font-bold text-white group-hover:text-indigo-300 transition-colors block">
                              {asset.name}
                            </span>
                            <span className="text-[11px] text-slate-400 truncate max-w-xs block font-mono">
                              {asset.location}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-slate-300">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-[11px] text-slate-300 border border-slate-700/60">
                          {asset.propertyType}
                        </span>
                      </td>

                      <td className="p-4 font-bold text-indigo-300">
                        {shares.toLocaleString()} Shares ({pct}%)
                      </td>

                      <td className="p-4 font-bold text-slate-100">
                        LKR {equityVal.toLocaleString()}
                      </td>

                      <td className="p-4 font-bold text-emerald-400">
                        +LKR {rentalInc.toLocaleString()} / yr
                      </td>

                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onViewDetails(asset)}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                            title="View Property Details & Legal Deed"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onOpenTransfer(asset)}
                            className="p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 transition-all cursor-pointer"
                            title="Transfer Shares"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
