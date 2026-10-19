import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useCurrency } from "../context/CurrencyContext";
import { fetchVerifiedAssets } from "../services/tokenizationService";
import { getTokenBalance, getPaymentTokenBalance, getContractAddresses } from "../services/contractService";
import {
  PieChart,
  Wallet,
  Building,
  Coins,
  TrendingUp,
  Clock,
  ShieldCheck,
  ArrowUpRight,
  ShoppingBag,
  Info,
  ExternalLink,
  Sparkles,
  Layers,
  CheckCircle2,
  Users,
  RefreshCw,
  PlusCircle
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { resolveUserWallet } from "../lib/walletResolver";
import AddWalletModal from "../components/AddWalletModal";

export default function OwnerPortfolio() {
  const { user } = useAuth();
  const { formatLKR, formatMUSD } = useCurrency();
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [allAssets, setAllAssets] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [mUsdBalance, setMUsdBalance] = useState(0);
  const [activeTab, setActiveTab] = useState("holdings"); // "holdings" | "eligible" | "all"
  const [contractAddrs, setContractAddrs] = useState({});
  const [showAddWalletModal, setShowAddWalletModal] = useState(false);

  useEffect(() => {
    setContractAddrs(getContractAddresses());
    detectMetaMaskAccount();

    if (window.ethereum) {
      const handleAccounts = (accounts) => {
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          loadHoldingsForAccount(accounts[0]);
        } else {
          detectMetaMaskAccount();
        }
      };
      window.ethereum.on("accountsChanged", handleAccounts);
      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener("accountsChanged", handleAccounts);
        }
      };
    }
  }, [user]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to connect your wallet.");
      return;
    }
    try {
      const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accs && accs.length > 0) {
        setAccount(accs[0]);
        await loadHoldingsForAccount(accs[0]);
      }
    } catch (err) {
      console.error("MetaMask connect error:", err);
    }
  };

  const detectMetaMaskAccount = async () => {
    let userAddr = null;
    if (window.ethereum) {
      try {
        const accs = await window.ethereum.request({ method: "eth_accounts" });
        if (accs && accs.length > 0) userAddr = accs[0];
      } catch (e) {}
    }
    if (!userAddr) {
      userAddr = user?.walletAddress || resolveUserWallet(user) || null;
    }

    if (!userAddr) {
      setAccount("");
      setHoldings([]);
      setAllAssets([]);
      setMUsdBalance(0);
      setLoading(false);
      return;
    }
    setAccount(userAddr);
    loadHoldingsForAccount(userAddr);
  };

  const loadHoldingsForAccount = async (walletAddress) => {
    if (!walletAddress) {
      setHoldings([]);
      setAllAssets([]);
      setMUsdBalance(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const verifiedList = await fetchVerifiedAssets();
      const mBal = await getPaymentTokenBalance(walletAddress);
      setMUsdBalance(mBal);

      const enriched = await Promise.all(
        verifiedList.map(async (asset) => {
          let bal = 0;
          try {
            bal = await getTokenBalance(walletAddress, asset.assetId);
          } catch (e) {
            bal = 0;
          }

          const totalShares = asset.totalShares || 1000;
          const ownershipPct = totalShares > 0 ? ((bal / totalShares) * 100).toFixed(2) : "0.00";
          const refPrice =
            asset.referencePriceLKR ||
            (asset.valuationLKR ? asset.valuationLKR / totalShares : 10000);
          const indicativeHoldingVal = bal * refPrice;

          return {
            ...asset,
            balance: bal,
            totalShares,
            ownershipPercentage: parseFloat(ownershipPct),
            referencePriceLKR: refPrice,
            indicativeHoldingVal,
          };
        })
      );

      setAllAssets(enriched);
      // Real active holdings: wallet actually holds > 0 tokens
      const activeHoldings = enriched.filter((a) => a.balance > 0);
      setHoldings(activeHoldings);
    } catch (err) {
      console.error("Error loading owner holdings:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalPortfolioValueLKR = holdings.reduce((sum, h) => sum + h.indicativeHoldingVal, 0);
  const totalTokensOwned = holdings.reduce((sum, h) => sum + h.balance, 0);

  // Eligible assets to tokenize
  const eligibleAssets = allAssets.filter((a) => a.isEligibleForTokenization);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-indigo-950/40 border border-zinc-800 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-4 h-4" />
                <span>Authoritative On-Chain Holdings</span>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Real Asset Portfolio & Blockchain Holdings
              </h1>
              <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
                Directly querying ERC-1155 smart contract balances on Hardhat Localhost (Chain ID 31337).
                Real-world asset valuations are synchronized with Azure Cosmos DB.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <button
                onClick={() => loadHoldingsForAccount(account)}
                className="px-4 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 flex items-center gap-2 transition-all cursor-pointer"
                title="Refresh balances from blockchain"
              >
                <RefreshCw className="w-4 h-4 text-emerald-400" />
                <span>Sync On-Chain</span>
              </button>
              <Link
                to="/marketplace"
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-blue-500/20 flex items-center gap-1.5"
              >
                <ShoppingBag className="w-4 h-4" />
                Token Marketplace
              </Link>
            </div>
          </div>
        </div>

        {/* Connected Wallet Indicator */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              account ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-amber-500/10 border border-amber-500/30"
            }`}>
              {account ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <Wallet className="w-4 h-4 text-amber-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold uppercase tracking-wider ${
                  account ? "text-emerald-400" : "text-amber-400"
                }`}>
                  {account ? "Connected Owner Wallet" : "No Wallet Connected"}
                </span>
                {account && (
                  <span className="font-mono text-xs text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-700">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {account
                  ? "Authoritative ERC-1155 balances read from local blockchain node."
                  : "Connect your MetaMask wallet to view your personal minted token shares."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {account ? (
              <button
                onClick={() => loadHoldingsForAccount(account)}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 flex items-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sync Holdings</span>
              </button>
            ) : (
              <button
                onClick={connectWallet}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Connect MetaMask</span>
              </button>
            )}
          </div>
        </div>

        {/* Portfolio Valuation KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 space-y-1">
            <span className="text-xs text-zinc-400 font-medium">Indicative Holding Valuation</span>
            <div className="text-2xl font-black text-emerald-400">
              {formatLKR(totalPortfolioValueLKR)}
            </div>
            <p className="text-[11px] text-zinc-500">
              Σ (Real On-Chain Shares × Initial Reference Price)
            </p>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 space-y-1">
            <span className="text-xs text-zinc-400 font-medium">Active Token Shares Held</span>
            <div className="text-2xl font-black text-white">
              {totalTokensOwned.toLocaleString()} <span className="text-xs text-zinc-400 font-normal">Fractions</span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">
              Live balanceOf on AssetToken.sol
            </p>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 space-y-1">
            <span className="text-xs text-zinc-400 font-medium">Payment Liquidity (mUSD)</span>
            <div className="text-2xl font-black text-blue-400">
              {formatMUSD(mUsdBalance)}
            </div>
            <p className="text-[11px] text-zinc-500">
              ERC-20 balance available for secondary trading
            </p>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 space-y-1">
            <span className="text-xs text-zinc-400 font-medium">Pricing Standard</span>
            <div className="text-base font-bold text-indigo-400 flex items-center gap-1.5 pt-1">
              <Sparkles className="w-4 h-4" />
              Dual-Price Model
            </div>
            <p className="text-[11px] text-zinc-500">
              Reference Price: LKR 10,000 / share
            </p>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-800 w-fit">
          <button
            onClick={() => setActiveTab("holdings")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "holdings"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            My Active Holdings ({holdings.length})
          </button>
          <button
            onClick={() => setActiveTab("eligible")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "eligible"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Ready for Tokenization ({eligibleAssets.length})
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            All Verified Assets ({allAssets.length})
          </button>
        </div>

        {/* Holdings / Assets List */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span>
                {activeTab === "holdings"
                  ? "Real On-Chain Fractional Asset Holdings"
                  : activeTab === "eligible"
                  ? "Verified Properties Ready to Tokenize"
                  : "Complete Pipeline Portfolio Overview"}
              </span>
            </h3>
            <span className="text-xs text-zinc-500 font-mono">
              Contract: {contractAddrs.tokenAddress ? `${contractAddrs.tokenAddress.slice(0, 8)}...` : "Loading..."}
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-zinc-400 space-y-2">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Querying real on-chain token balances from Hardhat...</p>
            </div>
          ) : !account ? (
            <div className="py-16 text-center p-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center mx-auto text-zinc-400">
                <Wallet className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-base font-bold text-white">No Wallet Linked to This Account</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Link your unique personal Ethereum wallet to view your tokenized property shares and tokenization pipeline.
                </p>
              </div>
              <button
                onClick={() => setShowAddWalletModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold rounded-xl hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Add Wallet to Account
              </button>
            </div>
          ) : activeTab === "holdings" && holdings.length === 0 ? (
            <div className="py-16 text-center p-8 space-y-3">
              <Building className="w-12 h-12 text-zinc-600 mx-auto" />
              <h4 className="text-base font-bold text-zinc-200">No active token shares in this wallet</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                This connected wallet ({account.slice(0, 6)}...{account.slice(-4)}) does not currently hold any fractional tokens.
              </p>
              <button
                onClick={() => setActiveTab("eligible")}
                className="px-4 py-2 bg-emerald-600/20 text-emerald-400 text-xs font-semibold rounded-xl border border-emerald-500/30 hover:bg-emerald-600/30 cursor-pointer"
              >
                View Properties Ready to Tokenize →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {(activeTab === "holdings"
                ? holdings
                : activeTab === "eligible"
                ? eligibleAssets
                : allAssets
              ).map((h) => (
                <div
                  key={h.assetId}
                  className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                        ERC-1155 Token #{h.assetId}
                      </span>
                      <span className="text-xs text-indigo-400 font-mono font-semibold">{h.symbol}</span>
                      {h.tokenizationStatus === "TOKENIZED" ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Tokenized On-Chain
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Ready for Minting
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-white">{h.name}</h4>
                    <p className="text-xs text-zinc-400">
                      Approved Net Asset Valuation: <span className="text-emerald-400 font-bold">{formatLKR(h.valuationLKR)}</span> • Total Approved Shares: {h.totalShares.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-zinc-500 font-mono truncate max-w-md">
                      Deed Hash: {h.documentHash}
                    </p>
                  </div>

                  {/* Real Balance & Valuation Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono bg-zinc-950 p-4 rounded-2xl border border-zinc-850">
                    <div>
                      <span className="text-zinc-500 font-sans block text-[11px]">Real On-Chain Shares</span>
                      <span className="text-white font-extrabold text-base">
                        {h.balance.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-sans block">/ {h.totalShares.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-sans block text-[11px]">Ownership Share</span>
                      <span className="text-emerald-400 font-bold text-base">
                        {h.ownershipPercentage}%
                      </span>
                      <span className="text-[10px] text-zinc-500 font-sans block">of property</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-sans block text-[11px]">Indicative Value</span>
                      <span className="text-indigo-400 font-extrabold text-base font-sans">
                        {formatLKR(h.indicativeHoldingVal)}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-sans block">@ {formatLKR(h.referencePriceLKR)}/sh</span>
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    {h.balance > 0 ? (
                      <Link
                        to="/marketplace"
                        className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-xs font-bold text-blue-400 border border-blue-500/30 transition-all flex items-center justify-center gap-1.5"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        Trade / Sell
                      </Link>
                    ) : (
                      <Link
                        to={`/tokenization/preview/${h.assetId}`}
                        className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        Tokenize Asset
                      </Link>
                    )}
                    <Link
                      to={`/tokenization/status/${h.assetId}`}
                      className="w-full sm:w-auto py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 border border-zinc-700 transition-all text-center"
                    >
                      Audit Trail
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Wallet Modal */}
      <AddWalletModal
        isOpen={showAddWalletModal}
        onClose={() => setShowAddWalletModal(false)}
        onSuccess={() => detectMetaMaskAccount()}
      />
    </div>
  );
}
