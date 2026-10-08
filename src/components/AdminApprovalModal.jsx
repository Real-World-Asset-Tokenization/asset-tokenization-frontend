import React, { useState } from "react";
import { X, ShieldCheck, CheckCircle2, Coins, AlertCircle, RefreshCw } from "lucide-react";
import { approveAssetOnChain, tokenizeAssetOnChain } from "../services/contractService";
import { updateAssetStatusBackend } from "../services/apiService";

export default function AdminApprovalModal({
  wallet,
  assets,
  onClose,
  onRefresh
}) {
  const [loadingId, setLoadingId] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [error, setError] = useState(null);

  const pendingAssets = assets.filter((a) => a.status === "Pending" || a.status === "Approved");

  const handleApprove = async (asset) => {
    try {
      setLoadingId(asset.assetId);
      setError(null);
      setActionMessage(`Approving Asset #${asset.assetId} on AssetRegistry.sol...`);

      // 1. On-Chain Approval
      const receipt = await approveAssetOnChain(asset.assetId);

      // 2. Update Backend
      await updateAssetStatusBackend(asset.assetId, "Approved", receipt.hash);

      setActionMessage(`✔ Asset #${asset.assetId} approved successfully on-chain!`);
      setTimeout(() => {
        setActionMessage("");
        onRefresh();
      }, 1000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Approval transaction failed. Ensure your wallet is the contract owner.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleTokenize = async (asset) => {
    try {
      setLoadingId(asset.assetId);
      setError(null);
      setActionMessage(`Minting ${asset.totalShares} ERC-1155 tokens on AssetToken.sol...`);

      // 1. On-Chain Tokenization
      const receipt = await tokenizeAssetOnChain(asset.assetId, asset.issuerWallet || wallet.account);

      // 2. Update Backend
      await updateAssetStatusBackend(asset.assetId, "Tokenized", receipt.hash);

      setActionMessage(`✔ Asset #${asset.assetId} fractionalized and tokenized!`);
      setTimeout(() => {
        setActionMessage("");
        onRefresh();
      }, 1000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Tokenization transaction failed.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050816]/85 backdrop-blur-md">
      <div className="relative w-full max-w-3xl glass-panel rounded-3xl border border-[#94A3BB]/20 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col bg-[#050816]/95">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#94A3BB]/15">
          <div>
            <h2 className="text-xl font-bold text-[#FFFFFF] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#00E5FF]" />
              Admin Verification & Tokenization Console
            </h2>
            <p className="text-xs text-[#94A3BB] mt-0.5">
              Review submitted deeds, authorize on-chain registry, and execute fractional ERC-1155 token minting
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#090D22] hover:bg-[#0E1535] text-[#94A3BB] hover:text-[#FFFFFF] border border-[#94A3BB]/20 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alerts */}
        <div className="px-6 pt-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 text-xs flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {actionMessage && (
            <div className="p-3.5 rounded-xl bg-[#4F46E5]/15 border border-[#4F46E5]/30 text-[#00E5FF] text-xs flex items-center gap-2 mb-3">
              <RefreshCw className="w-4 h-4 text-[#00E5FF] animate-spin shrink-0" />
              <span>{actionMessage}</span>
            </div>
          )}
        </div>

        {/* Asset Verification List */}
        <div className="p-6 overflow-y-auto space-y-4">
          {pendingAssets.length === 0 ? (
            <div className="text-center py-12 text-[#94A3BB] text-sm">
              <CheckCircle2 className="w-10 h-10 text-[#00E5FF] mx-auto mb-2 opacity-80" />
              All submitted properties have been verified and tokenized.
            </div>
          ) : (
            pendingAssets.map((asset) => (
              <div
                key={asset.assetId}
                className="p-4 rounded-2xl bg-[#090D22] border border-[#94A3BB]/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#050816] text-[#94A3BB] border border-[#94A3BB]/20">
                      #{asset.assetId}
                    </span>
                    <h4 className="text-sm font-bold text-[#FFFFFF]">{asset.name}</h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        asset.status === "Approved"
                          ? "bg-[#4F46E5]/20 text-[#00E5FF] border border-[#4F46E5]/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {asset.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3BB]">
                    Valuation: <strong className="text-[#FFFFFF]">LKR {asset.valuationLKR.toLocaleString()}</strong> • Fractional Shares: <strong className="text-[#00E5FF]">{asset.totalShares.toLocaleString()} Units</strong>
                  </p>
                  <p className="text-[11px] font-mono text-[#00E5FF] truncate max-w-md">
                    Deed Hash: {asset.documentHash}
                  </p>
                </div>

                <div className="flex items-center space-x-2 w-full md:w-auto">
                  {asset.status === "Pending" && (
                    <button
                      onClick={() => handleApprove(asset)}
                      disabled={loadingId === asset.assetId}
                      className="flex-1 md:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-[#FFFFFF] text-xs font-semibold shadow-md shadow-[#4F46E5]/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve Deed On-Chain</span>
                    </button>
                  )}

                  {asset.status === "Approved" && (
                    <button
                      onClick={() => handleTokenize(asset)}
                      disabled={loadingId === asset.assetId}
                      className="flex-1 md:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#00E5FF] hover:bg-[#00cbe2] text-[#050816] text-xs font-bold shadow-md shadow-[#00E5FF]/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Mint & Tokenize</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#94A3BB]/15 bg-[#050816]/70 flex items-center justify-between">
          <p className="text-xs text-[#94A3BB]">
            Connected Admin: <span className="font-mono text-[#FFFFFF]">{wallet.account ? `${wallet.account.slice(0, 10)}...` : "None"}</span>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-[#090D22] hover:bg-[#0E1535] text-[#94A3BB] hover:text-[#FFFFFF] border border-[#94A3BB]/20 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
