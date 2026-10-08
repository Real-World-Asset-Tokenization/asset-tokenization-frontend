import React, { useState } from "react";
import { X, Code2, Copy, Check, ExternalLink, BookOpen, Layers } from "lucide-react";
import { getContractAddresses } from "../services/contractService";

export default function TeammatesHubModal({ onClose }) {
  const { registryAddress, tokenAddress } = getContractAddresses();
  const [copiedKey, setCopiedKey] = useState(null);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050816]/85 backdrop-blur-md">
      <div className="relative w-full max-w-3xl glass-panel rounded-3xl border border-[#94A3BB]/20 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col bg-[#050816]/95">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#94A3BB]/15">
          <div>
            <h2 className="text-xl font-bold text-[#FFFFFF] flex items-center gap-2">
              <Code2 className="w-5 h-5 text-[#00E5FF]" />
              Teammate Integration Hub & Interface Specifications
            </h2>
            <p className="text-xs text-[#94A3BB] mt-0.5">
              Contracts, ABIs, and code snippets for Marketplace, Governance, and Profit Distribution teammates
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#090D22] hover:bg-[#0E1535] text-[#94A3BB] hover:text-[#FFFFFF] border border-[#94A3BB]/20 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Contract Addresses */}
          <div>
            <h3 className="text-xs font-semibold text-[#FFFFFF] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#00E5FF]" />
              1. Deployed Smart Contract Addresses (Localhost 31337)
            </h3>
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-[#090D22] border border-[#94A3BB]/20 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#94A3BB] font-medium">AssetToken (ERC-1155 Fractional Shares):</p>
                  <p className="text-xs font-mono text-[#00E5FF] mt-0.5">{tokenAddress}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(tokenAddress, "token")}
                  className="p-2 rounded-lg bg-[#050816] hover:bg-[#0E1535] text-[#94A3BB] hover:text-[#FFFFFF] border border-[#94A3BB]/20 transition-all cursor-pointer"
                  title="Copy Address"
                >
                  {copiedKey === "token" ? <Check className="w-4 h-4 text-[#00E5FF]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#090D22] border border-[#94A3BB]/20 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#94A3BB] font-medium">AssetRegistry (Onboarding & Deed Hash):</p>
                  <p className="text-xs font-mono text-[#4F46E5] mt-0.5">{registryAddress}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(registryAddress, "registry")}
                  className="p-2 rounded-lg bg-[#050816] hover:bg-[#0E1535] text-[#94A3BB] hover:text-[#FFFFFF] border border-[#94A3BB]/20 transition-all cursor-pointer"
                  title="Copy Address"
                >
                  {copiedKey === "registry" ? <Check className="w-4 h-4 text-[#00E5FF]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Module 1: Marketplace Integration */}
          <div className="p-4 rounded-2xl bg-[#090D22] border border-[#94A3BB]/20 space-y-2">
            <h4 className="text-sm font-bold text-[#FFFFFF] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00E5FF]" />
              For Marketplace Teammate (Trading Fractional Shares)
            </h4>
            <p className="text-xs text-[#94A3BB]">
              Your marketplace contract simply calls <code>safeTransferFrom</code> on <code>AssetToken</code> after the seller approves your contract.
            </p>
            <div className="p-3 rounded-xl bg-[#050816] font-mono text-xs text-[#94A3BB] overflow-x-auto border border-[#94A3BB]/20">
              <code>{`// Check seller fractional balance
uint256 balance = assetToken.balanceOf(seller, assetId);
require(balance >= amountToList, "Insufficient fractional shares");

// Transfer tokens to buyer on payment
assetToken.safeTransferFrom(seller, buyer, assetId, amountBought, "");`}</code>
            </div>
          </div>

          {/* Module 2: Governance Integration */}
          <div className="p-4 rounded-2xl bg-[#090D22] border border-[#94A3BB]/20 space-y-2">
            <h4 className="text-sm font-bold text-[#FFFFFF] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
              For Governance Teammate (Voting & Snapshots)
            </h4>
            <p className="text-xs text-[#94A3BB]">
              To prevent double-voting (where an investor votes then transfers tokens to another wallet to vote again), call our snapshot functions:
            </p>
            <div className="p-3 rounded-xl bg-[#050816] font-mono text-xs text-[#94A3BB] overflow-x-auto border border-[#94A3BB]/20">
              <code>{`// 1. Snapshot taken at proposal creation
uint256 snapId = assetToken.createSnapshot(assetId);

// 2. Query investor voting weight at proposal snapshot
uint256 votingPower = assetToken.balanceOfAtSnapshot(voter, assetId, snapId);
require(votingPower > 0, "No voting weight at snapshot");`}</code>
            </div>
          </div>

          {/* Module 3: Profit Distribution Integration */}
          <div className="p-4 rounded-2xl bg-[#090D22] border border-[#94A3BB]/20 space-y-2">
            <h4 className="text-sm font-bold text-[#FFFFFF] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00E5FF]" />
              For Profit Distribution Teammate (Rental Yield & Dividends)
            </h4>
            <p className="text-xs text-[#94A3BB]">
              Calculate proportional dividend payouts using snapshot balance and total shares:
            </p>
            <div className="p-3 rounded-xl bg-[#050816] font-mono text-xs text-[#94A3BB] overflow-x-auto border border-[#94A3BB]/20">
              <code>{`// Payout = (Distributable Profit * Investor Shares) / Total Shares
uint256 investorShares = assetToken.balanceOfAtSnapshot(investor, assetId, snapId);
uint256 totalShares = assetToken.totalShares(assetId);

uint256 payout = (distributableProfit * investorShares) / totalShares;`}</code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#94A3BB]/15 bg-[#050816]/70 flex items-center justify-between">
          <p className="text-xs text-[#94A3BB]">
            Interface files: <span className="font-mono text-[#00E5FF]">blockchain/contracts/interfaces/</span>
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
