import React, { useState } from "react";
import {
  Wallet,
  ShieldCheck,
  PlusCircle,
  Building,
  Vote,
  DollarSign,
  Layers,
  Users,
  Code2,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { checkAndSwitchNetwork } from "../services/contractService";

export default function Navbar({
  wallet,
  currentView,
  onSelectView,
  onOpenRegister,
  onOpenAdmin,
  onOpenTeammates,
  onOpenMultiUser
}) {
  const isLocalhost = wallet.chainId === 31337;

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Building },
    { id: "marketplace", label: "Asset Marketplace", icon: Layers },
    { id: "governance", label: "Governance", icon: Vote },
    { id: "profit_distribution", label: "Profit Distribution", icon: DollarSign }
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#94A3BB]/15 bg-[#050816]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Header Bar */}
        <div className="h-20 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div
            onClick={() => onSelectView("dashboard")}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#4F46E5] via-[#4338CA] to-[#00E5FF] flex items-center justify-center shadow-lg shadow-[#4F46E5]/30 group-hover:scale-105 transition-transform">
              <Building className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-[#00E5FF] bg-clip-text text-transparent">
                  AssetToken
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30 font-semibold uppercase tracking-wider">
                  ERC-1155 RWA
                </span>
              </div>
              <p className="text-[11px] text-[#94A3BB] tracking-wide">University Research Platform</p>
            </div>
          </div>

          {/* Navigation Links: 4 Core Modules */}
          <nav className="hidden lg:flex items-center p-1 rounded-2xl bg-[#090D22] border border-[#94A3BB]/20">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#4F46E5] text-white shadow-md shadow-[#4F46E5]/40"
                      : "text-[#94A3BB] hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#00E5FF]" : "text-[#94A3BB]"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Network & Wallet Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick Actions */}
            <button
              onClick={onOpenRegister}
              className="hidden sm:flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 text-xs font-semibold transition-all cursor-pointer shadow-sm shadow-[#00E5FF]/20"
              title="Register New Physical Real Estate"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>Register</span>
            </button>

            <button
              onClick={onOpenMultiUser}
              className="hidden md:flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-[#94A3BB] hover:text-white border border-[#94A3BB]/20 text-xs font-semibold transition-all cursor-pointer"
              title="Inspect Multi-User Personas & Hardhat Accounts"
            >
              <Users className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>Roles</span>
            </button>

            {/* Network Indicator & Quick Switch */}
            <button
              onClick={checkAndSwitchNetwork}
              className={`flex items-center space-x-1.5 px-2.5 py-2 rounded-xl border text-xs cursor-pointer transition-all ${
                isLocalhost
                  ? "bg-[#090D22] border-[#94A3BB]/20 text-slate-200"
                  : "bg-amber-500/20 border-amber-500/60 text-amber-300 hover:bg-amber-500/30 animate-pulse"
              }`}
              title={isLocalhost ? "Connected to Hardhat Localhost (31337)" : "Click to switch MetaMask to Hardhat Local"}
            >
              <span className={`w-2 h-2 rounded-full ${isLocalhost ? "bg-[#00E5FF] animate-pulse" : "bg-amber-400"}`} />
              <span className="font-semibold hidden sm:inline">
                {isLocalhost ? "Hardhat 31337" : "Switch Network"}
              </span>
            </button>

            {/* Connect & Account Controls */}
            {wallet.account ? (
              <div className="flex items-center space-x-2 bg-[#090D22] border border-[#94A3BB]/20 p-1.5 rounded-xl">
                <div className="px-2.5 py-1 text-right hidden sm:block">
                  <p className="text-xs font-bold text-white">
                    {parseFloat(wallet.balance).toFixed(2)} ETH
                  </p>
                  <p className="text-[10px] text-[#94A3BB] font-mono">
                    {wallet.account.slice(0, 6)}...{wallet.account.slice(-4)}
                  </p>
                </div>
                <button
                  onClick={wallet.switchAccount}
                  className="px-2.5 py-1.5 bg-[#4F46E5]/20 hover:bg-[#4F46E5]/40 text-[11px] text-[#00E5FF] rounded-lg border border-[#4F46E5]/40 transition-all cursor-pointer"
                  title="Switch MetaMask Account"
                >
                  Switch
                </button>
              </div>
            ) : (
              <button
                onClick={wallet.connect}
                disabled={wallet.isConnecting}
                className="flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-lg shadow-[#4F46E5]/35 transition-all cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>{wallet.isConnecting ? "Connecting..." : "Connect MetaMask"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile / Tablet Horizontal Navigation Tabs */}
        <div className="flex lg:hidden overflow-x-auto pb-3 gap-2 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-900/90 text-slate-400 border border-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
