import React, { useState } from "react";
import {
  DollarSign,
  Calculator,
  CheckCircle2,
  Clock,
  ArrowRight,
  Send,
  Download,
  ShieldCheck,
  Building,
  Coins,
  Sparkles,
  ExternalLink,
  ChevronRight
} from "lucide-react";

export default function ProfitDistributionView({ wallet, assets, userBalances }) {
  const [distributionAmount, setDistributionAmount] = useState("850500");
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [selectedAssetId, setSelectedAssetId] = useState("1");
  const [currentStep, setCurrentStep] = useState(3); // 1: Autosized, 2: Draft, 3: Confirmed, 4: Payment Sent
  const [isProcessing, setIsProcessing] = useState(false);
  const [payoutTxHash, setPayoutTxHash] = useState("");
  const [claimedByUser, setClaimedByUser] = useState(false);

  const selectedAsset = assets.find((a) => a.assetId === Number(selectedAssetId)) || assets[0];
  const userTokens = userBalances[selectedAsset?.assetId] || 0;
  const totalShares = selectedAsset?.totalShares || 1000;
  const userOwnershipPct = totalShares > 0 ? (userTokens / totalShares) : 0;

  const numDist = Number(distributionAmount) || 0;
  const userGrossShare = Math.round(numDist * userOwnershipPct);
  const userNetShare = Math.round(userGrossShare * 0.85); // 15% withholding tax

  // Seeded investors table matching Covercy layout (Image 2)
  const initialInvestors = [
    {
      name: "Your Connected Wallet",
      wallet: wallet.account || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      isUser: true,
      shares: userTokens,
      pct: (userOwnershipPct * 100).toFixed(1),
      method: "Web3 Direct / ETH",
      taxRate: "15%",
      promote: "2%"
    },
    {
      name: "Capital Trust Holdings",
      wallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      isUser: false,
      shares: Math.max(0, 400 - (userTokens > 200 ? 100 : 0)),
      pct: "40.0",
      method: "ACH Transfer",
      taxRate: "30%",
      promote: "2%"
    },
    {
      name: "Heritage Real Estate Partners",
      wallet: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      isUser: false,
      shares: 300,
      pct: "30.0",
      method: "Wire Transfer",
      taxRate: "30%",
      promote: "2%"
    },
    {
      name: "Institutional Syndicate LK",
      wallet: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      isUser: false,
      shares: 100,
      pct: "10.0",
      method: "Check / Escrow",
      taxRate: "30%",
      promote: "2%"
    }
  ];

  const handleSendPayments = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setCurrentStep(4);
      setPayoutTxHash(`0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`);
      setClaimedByUser(true);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            Rental Yield & Profit Distribution Console
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated dividend calculation, investor waterfall distribution, and on-chain payout settlement
          </p>
        </div>

        {/* Property Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Select Property:</span>
          <select
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
          >
            {assets.filter((a) => a.status === "Tokenized").map((a) => (
              <option key={a.assetId} value={a.assetId}>
                {a.name} ({a.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>

      {payoutTxHash && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold">Rental Distribution Payments Sent & Confirmed On-Chain!</p>
              <p className="text-[11px] font-mono text-emerald-300/80 truncate max-w-md">
                Tx Hash: {payoutTxHash}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-[11px]">
            Stage: Payment Sent
          </span>
        </div>
      )}

      {/* Main Covercy Layout Grid (Matching Image 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Distribution Amount Calculator & Investors Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Covercy Distribution Calculator Box */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#94A3BB]/15 space-y-4">
            <label className="block text-xs font-bold text-[#94A3BB] uppercase tracking-wider">
              Total Quarterly Rental Income to Distribute
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <input
                  type="number"
                  value={distributionAmount}
                  onChange={(e) => setDistributionAmount(e.target.value)}
                  className="w-full pl-4 pr-20 py-3.5 rounded-2xl bg-[#090D22] border border-[#94A3BB]/20 text-[#FFFFFF] text-xl sm:text-2xl font-bold font-mono focus:outline-none focus:border-[#00E5FF]"
                />
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="absolute right-3 top-3 px-2 py-1 bg-[#050816] border border-[#94A3BB]/20 text-xs text-[#94A3BB] rounded-lg cursor-pointer"
                >
                  <option value="USD">USD</option>
                  <option value="LKR">LKR</option>
                </select>
              </div>

              <button
                type="button"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-sm shadow-lg shadow-[#4F46E5]/40 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Calculator className="w-4 h-4 text-[#00E5FF]" />
                <span>Calculate Waterfall</span>
              </button>
            </div>

            <p className="text-[11px] text-[#94A3BB]">
              Distribution is automatically pro-rated across the {totalShares.toLocaleString()} verified ERC-1155 token shares according to on-chain snapshot balance.
            </p>
          </div>

          {/* Investors Distribution Table (Matching Covercy Table - Image 2) */}
          <div className="glass-panel rounded-3xl border border-[#94A3BB]/15 overflow-hidden space-y-2">
            <div className="p-5 border-b border-[#94A3BB]/15 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Eligible Token Holders</h3>
                <p className="text-[11px] text-[#94A3BB]">Snapshot: Block #Current • Asset #{selectedAsset?.assetId}</p>
              </div>
              <span className="text-xs text-[#00E5FF] font-mono font-semibold">
                100% Total Shares Accounted
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#090D22] border-b border-[#94A3BB]/15 text-[#94A3BB] font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4 pl-6">Investor</th>
                    <th className="p-4">Payment Method</th>
                    <th className="p-4">Gross Distribution</th>
                    <th className="p-4">Taxes</th>
                    <th className="p-4">GP Promote</th>
                    <th className="p-4 pr-6 text-right">Net Distribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#94A3BB]/15">
                  {initialInvestors.map((inv, idx) => {
                    const gross = Math.round(numDist * (parseFloat(inv.pct) / 100));
                    const net = Math.round(gross * (inv.isUser ? 0.85 : 0.70));

                    return (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          inv.isUser ? "bg-[#4F46E5]/10 hover:bg-[#4F46E5]/15 font-medium" : "hover:bg-slate-900/40"
                        }`}
                      >
                        <td className="p-4 pl-6">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#090D22] border border-[#94A3BB]/25 flex items-center justify-center text-[10px] font-bold text-[#00E5FF]">
                              {inv.name[0]}
                            </div>
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="text-white font-bold">{inv.name}</span>
                                {inv.isUser && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#00E5FF]/20 text-[#00E5FF] font-semibold">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#94A3BB] font-mono">
                                {inv.wallet.slice(0, 6)}...{inv.wallet.slice(-4)} ({inv.pct}%)
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 text-slate-300 font-mono text-[11px]">
                          {inv.method}
                        </td>

                        <td className="p-4 font-bold text-slate-200">
                          {selectedCurrency} {gross.toLocaleString()}
                        </td>

                        <td className="p-4 text-[#94A3BB]">{inv.taxRate}</td>
                        <td className="p-4 text-[#94A3BB]">{inv.promote}</td>

                        <td className="p-4 pr-6 text-right font-bold text-[#00E5FF] text-sm">
                          {selectedCurrency} {net.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Covercy Stepper & Settlement Panel (Matching Image 2) */}
        <div className="space-y-6">
          <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-[#94A3BB]/15 space-y-6">
            <h3 className="text-sm font-bold text-white border-b border-[#94A3BB]/15 pb-3">
              Distribution Status & Settlement
            </h3>

            {/* Stepper with circles (Matching Image 2) */}
            <div className="flex items-center justify-between relative px-2">
              <div className="absolute left-6 right-6 top-3.5 h-0.5 bg-[#090D22] z-0" />

              {[
                { step: 1, label: "Autosized" },
                { step: 2, label: "Draft" },
                { step: 3, label: "Confirmed" },
                { step: 4, label: "Payment Sent" }
              ].map((s) => {
                const isPassed = currentStep >= s.step;
                return (
                  <div key={s.step} className="flex flex-col items-center relative z-10">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isPassed
                          ? "bg-[#00E5FF] text-[#050816] shadow-md shadow-[#00E5FF]/40"
                          : "bg-[#090D22] text-[#94A3BB] border border-[#94A3BB]/25"
                      }`}
                    >
                      {isPassed ? "✓" : s.step}
                    </div>
                    <span
                      className={`text-[10px] mt-1.5 font-medium ${
                        isPassed ? "text-[#00E5FF]" : "text-[#94A3BB]"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Current Quarter Progress Banner */}
            <div className="p-4 rounded-2xl bg-[#090D22] border border-[#94A3BB]/20 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white font-semibold">Q1 Rental Distributions</span>
                <span className="font-bold text-[#00E5FF]">
                  {currentStep === 4 ? "100% Completed" : "75% Confirmed"}
                </span>
              </div>
              <div className="h-2 w-full bg-[#050816] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00E5FF] rounded-full transition-all duration-700 shadow-sm shadow-[#00E5FF]/30"
                  style={{ width: currentStep === 4 ? "100%" : "75%" }}
                />
              </div>
            </div>

            {/* Your Personal Payout Breakdown */}
            <div className="p-4 rounded-2xl bg-[#4F46E5]/10 border border-[#4F46E5]/25 text-xs space-y-2">
              <div className="flex justify-between text-[#94A3BB]">
                <span>Your Holdings:</span>
                <span className="font-bold text-[#00E5FF]">{userTokens} Shares ({(userOwnershipPct * 100).toFixed(1)}%)</span>
              </div>
              <div className="flex justify-between text-[#94A3BB]">
                <span>Your Gross Share:</span>
                <span className="font-semibold text-white">{selectedCurrency} {userGrossShare.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[#94A3BB] pt-1 border-t border-[#4F46E5]/25">
                <span>Net Withholding (15%):</span>
                <span className="font-bold text-[#00E5FF] text-sm">{selectedCurrency} {userNetShare.toLocaleString()}</span>
              </div>
            </div>

              {/* Action Button: Send Payments / Claim */}
              <div className="pt-2">
                <button
                  onClick={handleSendPayments}
                  disabled={isProcessing || currentStep === 4}
                  className="w-full py-3.5 rounded-2xl bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-[#050816] font-extrabold text-sm shadow-lg shadow-[#00E5FF]/30 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <span>Executing Settlement...</span>
                  ) : currentStep === 4 ? (
                    <span>✓ All Payments Dispatched</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Payments / Claim Yield</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
