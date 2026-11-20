import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import AddToChainButton from "../components/AddToChainButton";
import Navbar from "../components/Navbar";
import { useCurrency } from "../context/CurrencyContext";
import { useRole } from "../context/RoleContext";
import { useAuth } from "../context/AuthContext";
import { resolveUserWallet } from "../lib/walletResolver";
import { isAssetOwnedByUser } from "../lib/assetOwnership";
import { fetchVerifiedAssets } from "../services/tokenizationService";
import {
  ShieldCheck,
  Building,
  Coins,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  FileCheck
} from "lucide-react";

export default function VerifiedAssets() {
  const navigate = useNavigate();
  const { formatLKR } = useCurrency();
  const { activeRole, isInvestor } = useRole();
  const { user } = useAuth();
  const ownerWallet = resolveUserWallet(user);
  const [loadedAssets, setAssets] = useState([]);
  const assets = loadedAssets.filter(asset => isAssetOwnedByUser(asset, user));
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, eligible, tokenized
  const [account, setAccount] = useState("");

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then((accs) => {
        if (accs && accs.length > 0) setAccount(accs[0]);
      });
      const handleAccounts = (accs) => setAccount(accs.length > 0 ? accs[0] : "");
      window.ethereum.on("accountsChanged", handleAccounts);
      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener("accountsChanged", handleAccounts);
        }
      };
    }
  }, []);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const data = user?.token ? await fetchVerifiedAssets(null, true) : [];
      setAssets(data);
    } catch (err) {
      console.error("Error loading verified assets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [user]);

  const filteredAssets = assets.filter((asset) => {
    if (filter === "eligible") return asset.isEligibleForTokenization;
    if (filter === "tokenized") return asset.tokenizationStatus === "TOKENIZED";
    return true;
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-indigo-950/40 border border-emerald-500/20 p-8 shadow-2xl backdrop-blur-xl">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Asset Pipeline</span>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Verified Real-World Assets
              </h1>
              <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
                Legally authenticated properties and deeds approved by the verification authority.
                Asset owners can initiate on-chain smart-contract-gated tokenization directly to their MetaMask wallet.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/dashboard/asset-owner"
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-all border border-zinc-700 shadow-sm"
              >
                Owner Dashboard
              </Link>
              <Link
                to="/portfolio"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
              >
                <Coins className="w-4 h-4" />
                My Portfolio
              </Link>
            </div>
          </div>
        </div>

        {/* Filter Pills & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-800">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === "all"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All Assets ({assets.length})
            </button>
            <button
              onClick={() => setFilter("eligible")}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === "eligible"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Eligible for Minting ({assets.filter((a) => a.isEligibleForTokenization).length})
            </button>
            <button
              onClick={() => setFilter("tokenized")}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === "tokenized"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Tokenized On-Chain ({assets.filter((a) => a.tokenizationStatus === "TOKENIZED").length})
            </button>
          </div>

          <div className="text-xs text-zinc-500 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Dual-Price Model Active • Reference Price = Valuation / Shares</span>
          </div>
        </div>

        {/* Assets Grid */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-zinc-400">Loading verified asset pipeline records...</p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="py-16 text-center bg-zinc-900/50 rounded-3xl border border-zinc-800 p-8 space-y-3">
            <Building className="w-12 h-12 text-zinc-600 mx-auto" />
            <h3 className="text-base font-semibold text-zinc-300">No matching assets found</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              No assets match the selected filter. Assets must be approved by the verification authority before appearing here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map((asset) => {
              const isOwner =
                account &&
                asset.ownerWallet &&
                account.toLowerCase() === asset.ownerWallet.toLowerCase();

              return (
                <div
                  key={asset.assetId}
                  className="bg-zinc-900/80 rounded-3xl border border-zinc-800 overflow-hidden shadow-xl hover:border-emerald-500/40 transition-all flex flex-col group"
                >
                  {/* Property Image & Status Badges */}
                  <div className="relative h-48 w-full bg-zinc-950 overflow-hidden">
                    {asset.imageUrl ? (
                      <img
                        src={asset.imageUrl}
                        alt={asset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-zinc-900 to-zinc-800 text-zinc-600">
                        <Building className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/40" />

                    {/* Status Pill */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified
                      </span>
                      {asset.tokenizationStatus === "TOKENIZED" ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 backdrop-blur-md flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5" />
                          Tokenized
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Ready for Minting
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                      <div>
                        <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                          Asset #{asset.assetId} • {asset.symbol}
                        </span>
                        <h3 className="text-base font-bold text-white leading-tight drop-shadow-sm">
                          {asset.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs pb-3 border-b border-zinc-800/80">
                        <span className="text-zinc-400">Property Type:</span>
                        <span className="text-zinc-200 font-medium">{asset.propertyType}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800">
                        <div>
                          <span className="text-zinc-500 block text-[11px]">Approved Valuation</span>
                          <span className="font-bold text-emerald-400 text-sm">
                            {formatLKR(asset.valuationLKR)}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[11px]">Token Supply</span>
                          <span className="font-bold text-white text-sm">
                            {(asset.totalShares || 1000).toLocaleString()} Shares
                          </span>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-zinc-900 flex justify-between items-center">
                          <span className="text-zinc-400 text-[11px]">Initial Reference Price:</span>
                          <span className="font-extrabold text-indigo-400 text-xs">
                            {formatLKR(asset.referencePriceLKR)} / share
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-zinc-500 flex items-center justify-between pt-1">
                        <span>Owner:</span>
                        <span className="font-mono text-zinc-400">
                          {asset.ownerWallet
                            ? `${asset.ownerWallet.slice(0, 6)}...${asset.ownerWallet.slice(-4)}`
                            : "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      {asset.tokenizationStatus === "TOKENIZED" ? (
                        <div className="flex gap-2">
                          <Link
                            to={`/tokenization/status/${asset.assetId}`}
                            className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 text-center transition-all flex items-center justify-center gap-1.5 border border-zinc-700"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-blue-400" />
                            View On-Chain Receipt
                          </Link>
                          <Link
                            to="/marketplace"
                            className="py-2.5 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-xs font-bold text-blue-400 border border-blue-500/30 transition-all flex items-center justify-center gap-1"
                          >
                            Trade
                          </Link>
                        </div>
                      ) : !isInvestor && asset.verificationStatus === "APPROVED" && (asset.chainStatus === "missing" || asset.chainStatus === "pending") ? (
                        <div className="space-y-2">
                          <p className="text-xs text-amber-300">Not on the current blockchain yet. Add it, then tokenize.</p>
                          <AddToChainButton asset={asset} chainStatus={asset.chainStatus} onDone={loadAssets} />
                        </div>
                      ) : !isInvestor ? (
                        <Link
                          to={`/tokenization/preview/${asset.assetId}`}
                          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 group-hover:gap-3 cursor-pointer"
                        >
                          <Coins className="w-4 h-4" />
                          <span>Review & Tokenize Asset</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      ) : (
                        <div className="text-center py-2 text-xs text-zinc-500 font-medium">
                          Awaiting Asset Owner Tokenization
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
