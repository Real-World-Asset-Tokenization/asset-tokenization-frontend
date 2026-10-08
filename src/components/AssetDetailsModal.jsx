import React from "react";
import { X, MapPin, ShieldCheck, FileText, Hash, ExternalLink, Coins, ArrowRightLeft, ShoppingCart } from "lucide-react";

export default function AssetDetailsModal({
  asset,
  userBalance,
  onClose,
  onOpenTransfer,
  onOpenBuy
}) {
  if (!asset) return null;

  const isTokenized = asset.status === "Tokenized";
  const userTokens = userBalance || 0;
  const ownershipPercentage = asset.totalShares > 0
    ? ((userTokens / asset.totalShares) * 100).toFixed(2)
    : "0.00";
  const userEquityLKR = asset.totalShares > 0
    ? Math.round((userTokens / asset.totalShares) * asset.valuationLKR)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050816]/85 backdrop-blur-md">
      <div className="relative w-full max-w-3xl glass-panel rounded-3xl border border-[#94A3BB]/20 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col bg-[#050816]/95">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#94A3BB]/15">
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 rounded-lg text-xs font-bold bg-[#4F46E5]/20 text-[#00E5FF] border border-[#4F46E5]/40">
              #{asset.assetId} • {asset.symbol}
            </span>
            <h2 className="text-xl font-bold text-[#FFFFFF] truncate max-w-md">{asset.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#090D22] hover:bg-[#0E1535] text-[#94A3BB] hover:text-[#FFFFFF] border border-[#94A3BB]/20 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main Visual & Info Banner */}
          <div className="relative h-60 rounded-2xl overflow-hidden border border-[#94A3BB]/20 bg-[#090D22]">
            <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-[#050816]/40 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div>
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#4F46E5] text-[#FFFFFF]">
                  {asset.propertyType}
                </span>
                <p className="text-xs text-[#94A3BB] mt-2 flex items-center gap-1.5 font-medium">
                  <MapPin className="w-4 h-4 text-[#00E5FF]" />
                  {asset.location}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#94A3BB] font-medium">Blockchain Status</p>
                <span className="text-sm font-bold text-[#00E5FF] flex items-center gap-1 justify-end">
                  <ShieldCheck className="w-4 h-4 text-[#00E5FF]" />
                  {asset.status}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-semibold text-[#94A3BB] mb-1">Property Description</h4>
            <p className="text-xs text-[#FFFFFF] leading-relaxed bg-[#090D22] p-3.5 rounded-xl border border-[#94A3BB]/20">
              {asset.description}
            </p>
          </div>

          {/* Fractional Ownership Financial Model */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-[#090D22] border border-[#94A3BB]/20">
              <p className="text-xs text-[#94A3BB]">Total Asset Valuation</p>
              <p className="text-lg font-bold text-[#FFFFFF] mt-1">
                LKR {asset.valuationLKR.toLocaleString()}
              </p>
              <p className="text-[11px] text-[#94A3BB]/70 mt-1">Independent Valuation Report</p>
            </div>

            <div className="p-4 rounded-xl bg-[#090D22] border border-[#94A3BB]/20">
              <p className="text-xs text-[#94A3BB]">Fractional ERC-1155 Supply</p>
              <p className="text-lg font-bold text-[#00E5FF] mt-1 flex items-center gap-1">
                <Coins className="w-4 h-4 text-[#00E5FF]" />
                {asset.totalShares.toLocaleString()} Shares
              </p>
              <p className="text-[11px] text-[#94A3BB]/70 mt-1">
                1 Share = {(100 / asset.totalShares).toFixed(3)}% Equity
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#090D22] border border-[#94A3BB]/20">
              <p className="text-xs text-[#94A3BB]">Your Connected Holdings</p>
              <p className="text-lg font-bold text-[#00E5FF] mt-1">
                {userTokens} Shares ({ownershipPercentage}%)
              </p>
              <p className="text-[11px] text-[#00E5FF]/80 mt-1">
                Equity: LKR {userEquityLKR.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Cryptographic & Verifiable Records */}
          <div className="p-4 rounded-xl bg-[#090D22] border border-[#94A3BB]/20 space-y-3">
            <h4 className="text-xs font-semibold text-[#FFFFFF] flex items-center gap-1.5 uppercase tracking-wider">
              <Hash className="w-4 h-4 text-[#00E5FF]" />
              Verifiable Blockchain Deed Provenance
            </h4>

            <div>
              <p className="text-[11px] text-[#94A3BB]">SHA-256 Title Deed Integrity Fingerprint:</p>
              <p className="text-xs font-mono text-[#00E5FF] bg-[#050816] p-2.5 rounded-lg border border-[#94A3BB]/20 break-all select-all mt-1">
                {asset.documentHash}
              </p>
            </div>

            <div>
              <p className="text-[11px] text-[#94A3BB]">IPFS Metadata Content Identifier (CID):</p>
              <p className="text-xs font-mono text-[#4F46E5] bg-[#050816] p-2.5 rounded-lg border border-[#94A3BB]/20 break-all select-all mt-1">
                {asset.metadataURI}
              </p>
            </div>

            <div>
              <p className="text-[11px] text-[#94A3BB]">Original Registered Property Issuer Wallet:</p>
              <p className="text-xs font-mono text-[#94A3BB] bg-[#050816] p-2.5 rounded-lg border border-[#94A3BB]/20 break-all select-all mt-1">
                {asset.issuerWallet}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-[#94A3BB]/15 bg-[#050816]/70 flex items-center justify-between">
          <p className="text-xs text-[#94A3BB]">
            Smart Contract: <span className="text-[#00E5FF] font-mono">AssetToken.sol</span>
          </p>
          <div className="flex items-center space-x-3">
            {isTokenized && onOpenBuy && (
              <button
                onClick={() => {
                  onClose();
                  onOpenBuy(asset);
                }}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-[#FFFFFF] transition-all cursor-pointer shadow-lg shadow-[#4F46E5]/30"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Buy Shares</span>
              </button>
            )}
            {userTokens > 0 && (
              <button
                onClick={() => {
                  onClose();
                  onOpenTransfer(asset);
                }}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-bold rounded-xl bg-[#00E5FF] hover:bg-[#00cbe2] text-[#050816] transition-all cursor-pointer shadow-lg shadow-[#00E5FF]/30"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Transfer Shares</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-[#090D22] hover:bg-[#0E1535] text-[#94A3BB] hover:text-[#FFFFFF] border border-[#94A3BB]/20 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
