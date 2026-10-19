import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useCurrency } from "../context/CurrencyContext";
import {
  fetchTokenizationPreview,
  executeOwnerTokenization,
  confirmTokenizationOnBackend,
} from "../services/tokenizationService";
import {
  ShieldCheck,
  Coins,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wallet,
  Zap,
  Info,
  Building,
  Lock,
  ShoppingBag,
  Sparkles
} from "lucide-react";

export default function TokenizationPreview() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const { formatLKR } = useCurrency();

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [isTokenizing, setIsTokenizing] = useState(false);
  const [tokenizedResult, setTokenizedResult] = useState(null);
  const [connectedAccount, setConnectedAccount] = useState("");

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then((accs) => {
        if (accs && accs.length > 0) setConnectedAccount(accs[0]);
      });
      const handleAccounts = (accs) => setConnectedAccount(accs.length > 0 ? accs[0] : "");
      window.ethereum.on("accountsChanged", handleAccounts);
      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener("accountsChanged", handleAccounts);
        }
      };
    }
  }, []);

  useEffect(() => {
    async function loadPreview() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchTokenizationPreview(assetId, connectedAccount || null);
        setPreview(data);
      } catch (err) {
        setError(err.message || "Failed to load asset tokenization preview.");
      } finally {
        setLoading(false);
      }
    }
    if (assetId) {
      loadPreview();
    }
  }, [assetId, connectedAccount]);

  const isWalletMismatch =
    Boolean(connectedAccount) &&
    Boolean(preview?.ownerWallet) &&
    connectedAccount.toLowerCase() !== preview.ownerWallet.toLowerCase();

  const handleSwitchAccount = async () => {
    try {
      if (window.ethereum) {
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts && accounts.length > 0) {
          setConnectedAccount(accounts[0]);
        }
      }
    } catch (err) {
      console.warn("Account switch request error:", err.message);
    }
  };

  const handleTokenize = async () => {
    if (!preview) return;
    setError("");
    setIsTokenizing(true);
    setStatusMsg("Initiating owner-gated tokenization transaction...");

    try {
      const onChainId = preview.blockchainAssetId || preview.assetId;
      const res = await executeOwnerTokenization(
        onChainId,
        (msg) => {
          setStatusMsg(msg);
        },
        preview.assetId
      );
      setTokenizedResult(res);
      setStatusMsg("Tokenization successfully confirmed on-chain and recorded in Azure Cosmos DB!");
    } catch (err) {
      console.error("Tokenization execution failed:", err);
      setError(err.message || "Tokenization transaction failed or was rejected.");
    } finally {
      setIsTokenizing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-zinc-400">Loading tokenization preview & smart contract parameters...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !preview) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-xl w-full mx-auto p-8 flex items-center justify-center">
          <div className="bg-zinc-900 border border-red-500/30 rounded-3xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Tokenization Preview Error</h2>
            <p className="text-xs text-zinc-400">{error}</p>
            <Link
              to="/verified-assets"
              className="inline-block px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200"
            >
              Back to Verified Assets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Link to="/verified-assets" className="hover:text-zinc-200">
            Verified Assets
          </Link>
          <span>/</span>
          <span className="text-zinc-200 font-medium">Asset #{preview.assetId} Preview</span>
        </div>

        {/* Success Screen if Already Tokenized */}
        {tokenizedResult ? (
          <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-emerald-500/40 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white">Asset Successfully Tokenized!</h2>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Exactly {preview.approvedTokenSupply.toLocaleString()} ERC-1155 tokens have been minted directly into your wallet.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-zinc-950/80 p-5 rounded-2xl border border-zinc-800 text-xs text-left space-y-3 font-mono max-w-md mx-auto">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-900 font-sans">
                <span className="text-zinc-400">Status:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  CONFIRMED (ON-CHAIN & AZURE)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 font-sans">ERC-1155 Token ID:</span>
                <span className="text-white font-bold">#{preview.assetId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 font-sans">Minted Quantity:</span>
                <span className="text-white font-bold">{preview.approvedTokenSupply.toLocaleString()} Fractions</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 font-sans">Reference Price:</span>
                <span className="text-indigo-400 font-bold">{formatLKR(preview.calculatedReferencePrice)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 font-sans">Gas Used:</span>
                <span className="text-zinc-300">{tokenizedResult.gasUsed.toLocaleString()} Units</span>
              </div>
              <div className="pt-2 border-t border-zinc-900">
                <span className="text-zinc-400 font-sans block mb-1">Transaction Hash:</span>
                <span className="text-blue-400 break-all text-[11px]">
                  {tokenizedResult.txHash}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 max-w-md mx-auto">
              <Link
                to="/marketplace"
                className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                List on Marketplace →
              </Link>
              <Link
                to="/portfolio"
                className="py-3 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 border border-zinc-700"
              >
                View My Portfolio
              </Link>
            </div>
          </div>
        ) : (
          /* Preview & Authorization Form */
          <div className="space-y-6">
            {/* Asset Card Header */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-xl backdrop-blur-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Asset #{preview.assetId}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">{preview.assetSymbol}</span>
                  </div>
                  <h1 className="text-2xl font-black text-white">{preview.assetName}</h1>
                  <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{preview.location} • {preview.propertyType}</span>
                  </p>
                </div>

                <div className="px-4 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-right">
                  <span className="text-[11px] text-zinc-500 block">Verification Status</span>
                  <span className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Officially Approved
                  </span>
                </div>
              </div>
            </div>

            {/* Valuation & Dual-Price Engine Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Approved Valuation */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Approved Asset Valuation</span>
                  <Lock className="w-3.5 h-3.5 text-zinc-500" title="Protected: Set by verification authority" />
                </div>
                <div className="text-xl font-extrabold text-emerald-400">
                  {formatLKR(preview.approvedValuation)}
                </div>
                <p className="text-[11px] text-zinc-500">
                  Certified valuation unmodifiable by owner.
                </p>
              </div>

              {/* Total Approved Supply */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Approved Token Supply</span>
                  <Lock className="w-3.5 h-3.5 text-zinc-500" title="Protected: Fixed on-chain supply" />
                </div>
                <div className="text-xl font-extrabold text-white">
                  {preview.approvedTokenSupply.toLocaleString()} <span className="text-xs text-zinc-400 font-normal">Tokens</span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  100% issued in single atomic mint.
                </p>
              </div>

              {/* Calculated Reference Price */}
              <div className="bg-gradient-to-br from-indigo-950/40 to-zinc-900 border border-indigo-500/30 rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-indigo-300">
                  <span>Initial Reference Price</span>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="text-xl font-extrabold text-indigo-400">
                  {formatLKR(preview.calculatedReferencePrice)} <span className="text-xs text-zinc-400 font-normal">/ token</span>
                </div>
                <p className="text-[11px] text-indigo-300/70 font-mono">
                  Formula: Valuation / Total Supply
                </p>
              </div>
            </div>

            {/* Formula & Reference Price Breakdown Box */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-400" />
                Valuation-Based Initial Reference Pricing Model
              </h3>
              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 font-mono text-xs text-emerald-300 flex items-center justify-between">
                <span>{preview.formulaExplanation}</span>
                <span className="text-[11px] text-zinc-500 font-sans">Decimal-safe</span>
              </div>
              <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
                <li>The initial reference price is a valuation indicator, not a guaranteed trading price.</li>
                <li>Secondary marketplace orders can be placed above or below reference value independently.</li>
                <li>Approved future property revaluations update reference price without changing token supply.</li>
              </ul>
            </div>

            {/* On-Chain Execution Details */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Blockchain Authorization & Target Wallet
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
                  <span className="text-zinc-500 block text-[11px]">Authorized Recipient Wallet</span>
                  <span className="font-mono text-emerald-400 font-semibold truncate block">
                    {preview.ownerWallet}
                  </span>
                  <span className="text-[10px] text-zinc-500 block">
                    Tokens will be minted directly to this verified owner address.
                  </span>
                </div>

                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
                  <span className="text-zinc-500 block text-[11px]">Estimated Transaction Fee</span>
                  <span className="font-mono text-amber-300 font-semibold block flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    ~{preview.estimatedGasUnits.toLocaleString()} Gas Units (Hardhat Local)
                  </span>
                  <span className="text-[10px] text-zinc-500 block">
                    Asset owner pays gas for their own minting transaction.
                  </span>
                </div>
              </div>
            </div>

            {/* Status & Error Display */}
            {isWalletMismatch && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>MetaMask Account Mismatch</span>
                </div>
                <p className="text-zinc-300 leading-relaxed">
                  Your MetaMask is currently connected to{" "}
                  <span className="font-mono text-amber-300 font-semibold">{connectedAccount.slice(0, 6)}...{connectedAccount.slice(-4)}</span>,
                  but this asset is owned by{" "}
                  <span className="font-mono text-emerald-400 font-semibold">{preview.ownerWallet.slice(0, 6)}...{preview.ownerWallet.slice(-4)}</span>.
                  The smart contract enforces that only the verified asset owner can authorize tokenization.
                </p>
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="py-2 px-3.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  Switch to Authorized Owner Account in MetaMask
                </button>
              </div>
            )}

            {statusMsg && (
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-xl text-xs flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400 animate-spin" />
                <span>{statusMsg}</span>
              </div>
            )}

            {error && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="break-all">{error}</span>
              </div>
            )}

            {/* Tokenize Button */}
            <div className="pt-2">
              <button
                onClick={handleTokenize}
                disabled={isTokenizing || !preview.isEligible || isWalletMismatch}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:via-teal-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Coins className="w-5 h-5" />
                <span>
                  {isTokenizing
                    ? "Authorizing via MetaMask..."
                    : isWalletMismatch
                      ? "Switch to Owner Wallet in MetaMask to Tokenize"
                      : !preview.isEligible
                        ? "Asset Already Tokenized"
                        : "Tokenize Asset & Authorize MetaMask"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-center text-[11px] text-zinc-500 mt-2">
                Smart contract validates verified deed, enforces approved token supply, and mints atomically.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
