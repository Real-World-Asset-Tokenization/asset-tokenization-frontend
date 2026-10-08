import React, { useState } from "react";
import {
  X,
  Users,
  Copy,
  Check,
  Building,
  Coins,
  Repeat,
  ShieldCheck,
  ArrowRight,
  Sparkles
} from "lucide-react";

export default function MultiUserGuideModal({ wallet, onClose }) {
  const [copiedKey, setCopiedKey] = useState(null);

  const personas = [
    {
      role: "User 1: Landowner & Property Issuer",
      badge: "Primary Owner / Deployer",
      badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      features: [
        "Registers their physical real-world land/property on-chain",
        "Mints 1,000 ERC-1155 tokens directly into their personal wallet",
        "Owns 100% of property shares and can transfer/share them with others",
        "Holds initial Colombo Oceanfront Residence shares"
      ]
    },
    {
      role: "User 2: Secondary Investor & Land Buyer",
      badge: "Secondary Investor",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
      features: [
        "Buys fractional ownership shares using test ETH via MetaMask",
        "Uses owned Colombo tokens to buy shares in another land (Kandy or Galle)",
        "Registered the Kandy Royal Commercial Plaza asset",
        "Simulates peer-to-peer real estate token liquidity"
      ]
    },
    {
      role: "User 3: Institutional Real Estate Buyer",
      badge: "Institutional Partner",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      privateKey: "0x5de4111afa1a4b94908f83103eb2f95402bbf309988307374433a625ffb6ee92",
      features: [
        "Registered the Galle Dutch Fort Heritage Villa asset",
        "Receives fractional shares transferred from User 1",
        "Participates in multi-asset portfolio diversification"
      ]
    }
  ];

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050816]/85 backdrop-blur-md">
      <div className="relative w-full max-w-3xl glass-panel rounded-3xl border border-[#94A3BB]/20 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col bg-[#050816]/95">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#94A3BB]/15">
          <div>
            <h2 className="text-xl font-bold text-[#FFFFFF] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#00E5FF]" />
              Multi-User Architecture & Walkthrough
            </h2>
            <p className="text-xs text-[#94A3BB] mt-0.5">
              How multiple landowners and investors interact in this RWA tokenization ecosystem
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#090D22] hover:bg-[#0E1535] text-[#94A3BB] hover:text-[#FFFFFF] border border-[#94A3BB]/20 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Key Workflow Diagram */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#4F46E5]/20 via-[#090D22] to-[#00E5FF]/10 border border-[#4F46E5]/30 space-y-3">
            <h3 className="text-sm font-bold text-[#FFFFFF] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00E5FF]" />
              Complete Multi-User Lifecycle In This Platform:
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#090D22] border border-[#94A3BB]/20">
                <span className="font-bold text-[#00E5FF] block mb-1">1. Tokenize Your Land</span>
                <p className="text-[#94A3BB] leading-relaxed text-[11px]">
                  Landowner connects wallet, submits deed details, and gets approved. 100% of ERC-1155 tokens are minted directly into the owner's address.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#090D22] border border-[#94A3BB]/20">
                <span className="font-bold text-[#00E5FF] block mb-1">2. Share & Sell Fractions</span>
                <p className="text-[#94A3BB] leading-relaxed text-[11px]">
                  Owner transfers fractional shares to other users via MetaMask, or lists shares for secondary buyers with live balance reduction.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#090D22] border border-[#94A3BB]/20">
                <span className="font-bold text-[#00E5FF] block mb-1">3. Buy Land With Tokens</span>
                <p className="text-[#94A3BB] leading-relaxed text-[11px]">
                  Investors holding tokens in Land A can exchange them directly to buy shares in Land B via fair-value valuation exchange!
                </p>
              </div>
            </div>
          </div>

          {/* Test Personas & Private Keys */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
              <span>Hardhat Test Accounts (Import into MetaMask to switch users):</span>
              <span className="text-[11px] text-slate-400 font-normal">Network: Hardhat Local (31337)</span>
            </h3>

            <div className="space-y-3">
              {personas.map((p, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-[#090D22] border border-[#94A3BB]/20 hover:border-[#00E5FF]/40 transition-all space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-[#FFFFFF]">{p.role}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${p.badgeColor}`}>
                        {p.badge}
                      </span>
                    </div>

                    {wallet?.account?.toLowerCase() === p.address.toLowerCase() && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40">
                        ● Currently Active in MetaMask
                      </span>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-[#94A3BB]">
                    {p.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-[#00E5FF] shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Address & Private Key Copy */}
                  <div className="pt-2 border-t border-[#94A3BB]/15 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#050816] border border-[#94A3BB]/20">
                      <div className="truncate mr-2">
                        <span className="text-[#94A3BB]/60 block text-[9px]">ADDRESS:</span>
                        <span className="font-mono text-[#FFFFFF]">{p.address}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(p.address, `addr-${idx}`)}
                        className="p-1 text-[#94A3BB] hover:text-[#FFFFFF] transition-all cursor-pointer"
                        title="Copy Address"
                      >
                        {copiedKey === `addr-${idx}` ? <Check className="w-3.5 h-3.5 text-[#00E5FF]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#050816] border border-[#94A3BB]/20">
                      <div className="truncate mr-2">
                        <span className="text-[#94A3BB]/60 block text-[9px]">PRIVATE KEY (FOR METAMASK IMPORT):</span>
                        <span className="font-mono text-[#00E5FF]">{p.privateKey.slice(0, 10)}...{p.privateKey.slice(-6)}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(p.privateKey, `pk-${idx}`)}
                        className="p-1 text-[#94A3BB] hover:text-[#FFFFFF] transition-all cursor-pointer"
                        title="Copy Private Key to Import"
                      >
                        {copiedKey === `pk-${idx}` ? <Check className="w-3.5 h-3.5 text-[#00E5FF]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#94A3BB]/15 bg-[#050816]/70 flex items-center justify-between">
          <p className="text-xs text-[#94A3BB]">
            Click <strong className="text-[#FFFFFF]">Switch Account</strong> in the top header or switch directly in MetaMask.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-[#090D22] hover:bg-[#0E1535] text-[#94A3BB] hover:text-[#FFFFFF] border border-[#94A3BB]/20 transition-all cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
