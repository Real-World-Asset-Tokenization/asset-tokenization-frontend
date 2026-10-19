import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getTokenBalance, getPaymentTokenBalance } from "../services/contractService";
import { fetchVerifiedAssets } from "../services/tokenizationService";
import { useCurrency } from "../context/CurrencyContext";
import { useAuth } from "../context/AuthContext";
import { resolveUserWallet } from "../lib/walletResolver";
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
  RefreshCw,
  Sparkles,
  PlusCircle
} from "lucide-react";
import AddWalletModal from "../components/AddWalletModal";

export default function Portfolio() {
  const { user } = useAuth();
  const { currency, formatLKR, formatMUSD } = useCurrency();
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(true);
  const [holdings, setHoldings] = useState([]);
  const [mUsdBalance, setMUsdBalance] = useState(0);
  const [showAddWalletModal, setShowAddWalletModal] = useState(false);

  useEffect(() => {
    loadPortfolio();

    if (window.ethereum) {
      const handleAccounts = (accounts) => {
        if (accounts && accounts.length > 0) {
          loadHoldings(accounts[0]);
        } else {
          loadPortfolio();
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
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts.length > 0) {
        await loadHoldings(accounts[0]);
      }
    } catch (err) {
      console.error("MetaMask connect error:", err);
    }
  };

  const loadPortfolio = async () => {
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
      setMUsdBalance(0);
      setLoading(false);
      return;
    }

    await loadHoldings(userAddr);
  };

  const loadHoldings = async (userAddr) => {
    try {
      setLoading(true);
      const verifiedList = await fetchVerifiedAssets();
      const mBal = await getPaymentTokenBalance(userAddr);
      setMUsdBalance(mBal);

      const holdingsData = await Promise.all(
        verifiedList.map(async (asset) => {
          let bal = 0;
          try {
            bal = await getTokenBalance(userAddr, asset.assetId);
          } catch (e) {
            bal = 0;
          }

          const totalShares = asset.totalShares || 1000;
          const ownershipPct = totalShares > 0 ? ((bal / totalShares) * 100).toFixed(1) : "0.0";
          const refPrice = asset.referencePriceLKR || (asset.valuationLKR ? asset.valuationLKR / totalShares : 10000);
          const holdingValLKR = bal * refPrice;

          return {
            ...asset,
            balance: bal,
            totalShares,
            ownershipPercentage: parseFloat(ownershipPct),
            referencePriceLKR: refPrice,
            holdingValLKR,
          };
        })
      );

      // Only show assets where balance > 0 in the portfolio holdings
      const activeHoldings = holdingsData.filter((h) => h.balance > 0);
      setHoldings(activeHoldings);
    } catch (err) {
      console.error("Portfolio load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalPortfolioValuationLKR = holdings.reduce((sum, h) => sum + h.holdingValLKR, 0);
  const totalTokensHeld = holdings.reduce((sum, h) => sum + h.balance, 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-blue-500/30 selection:text-blue-200">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <PieChart className="w-8 h-8 text-blue-500" />
              Investor Portfolio
            </h1>
            <p className="text-zinc-400 mt-1 text-sm">
              Real-time fractional asset token holdings directly queried from smart contracts on Hardhat.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => account && loadHoldings(account)}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 border border-zinc-800 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              Refresh
            </button>
            {account ? (
              <div className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400">
                <span className="text-zinc-500 mr-1.5">Wallet:</span>
                <span className="text-blue-400">{account.slice(0, 6)}...{account.slice(-4)}</span>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-semibold text-amber-400 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Wallet className="w-3.5 h-3.5" />
                Connect Wallet
              </button>
            )}
          </div>
        </div>

        {/* Portfolio Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-1">
            <span className="text-xs text-zinc-400 font-medium">Total Portfolio Valuation</span>
            <div className="text-2xl font-black text-white">
              {formatLKR(totalPortfolioValuationLKR)}
            </div>
            <p className="text-[11px] text-zinc-500">
              Valuation-based reference price: {totalTokensHeld.toLocaleString()} fractional tokens held
            </p>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-1">
            <span className="text-xs text-zinc-400 font-medium">Liquid Balance (mUSD)</span>
            <div className="text-2xl font-black text-blue-400">
              {formatMUSD(mUsdBalance)}
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">
              On-chain MockPaymentToken balance
            </p>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-1">
            <span className="text-xs text-zinc-400 font-medium">Active Properties Owned</span>
            <div className="text-2xl font-black text-emerald-400">
              {holdings.length}
            </div>
            <p className="text-[11px] text-zinc-500">
              Tokenized prime real estate assets on EVM
            </p>
          </div>
        </div>

        {/* Real Holdings Table */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-400" />
              <span>Property Share Holdings</span>
            </h3>
            <span className="text-xs text-zinc-500 font-mono">Authoritative ERC-1155 State</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-zinc-400 space-y-2">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Querying real on-chain token balances...</p>
            </div>
          ) : !account ? (
            <div className="py-16 text-center p-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center mx-auto text-zinc-400">
                <Wallet className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-base font-bold text-white">No Wallet Linked to This Account</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Link your unique personal Ethereum wallet to view your tokenized property shares and cash balance.
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
          ) : holdings.length === 0 ? (
            <div className="py-16 text-center p-8 space-y-3">
              <Building className="w-12 h-12 text-zinc-600 mx-auto" />
              <h4 className="text-base font-bold text-zinc-200">No tokenized property shares found</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                This wallet ({account.slice(0, 6)}...{account.slice(-4)}) currently holds 0 fractional shares.
              </p>
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-500/20"
              >
                <ShoppingBag className="w-4 h-4" />
                Explore Token Marketplace →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {holdings.map((item) => (
                <div
                  key={item.assetId}
                  className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        Token #{item.assetId}
                      </span>
                      <span className="text-xs font-mono font-semibold text-zinc-400">{item.symbol}</span>
                    </div>
                    <h4 className="text-lg font-bold text-white">{item.name}</h4>
                    <p className="text-xs text-zinc-400">
                      Location: {item.location} • Type: {item.propertyType}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Approved Asset Valuation: <span className="text-emerald-400 font-semibold">{formatLKR(item.valuationLKR)}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono bg-zinc-950 p-4 rounded-2xl border border-zinc-850">
                    <div>
                      <span className="text-zinc-500 font-sans block text-[11px]">Shares Held</span>
                      <span className="text-white font-extrabold text-base">
                        {item.balance.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-sans block">/ {item.totalShares.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-sans block text-[11px]">Ownership Share</span>
                      <span className="text-blue-400 font-extrabold text-base">
                        {item.ownershipPercentage}%
                      </span>
                      <span className="text-[10px] text-zinc-500 font-sans block">of total equity</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-sans block text-[11px]">Indicative Value</span>
                      <span className="text-emerald-400 font-extrabold text-base font-sans">
                        {formatLKR(item.holdingValLKR)}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-sans block">@ {formatLKR(item.referencePriceLKR)}/sh</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to="/marketplace"
                      className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1.5"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      Trade
                    </Link>
                    <Link
                      to={`/tokenization/status/${item.assetId}`}
                      className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 border border-zinc-700 transition-all"
                    >
                      Receipt
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
        onSuccess={() => loadPortfolio()}
      />
    </div>
  );
}
