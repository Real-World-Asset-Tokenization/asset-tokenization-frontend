import PropertyValueChart from "../../components/PropertyValueChart";
import InvestorReturns from "../../components/InvestorReturns";
import HeldPropertyValuations from "../../components/HeldPropertyValuations";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCurrency } from "../../context/CurrencyContext";
import { useRole } from "../../context/RoleContext";
import { kycAPI } from "../../lib/api";
import Navbar from "../../components/Navbar";
import {
  Wallet,
  ShoppingBag,
  TrendingUp,
  Gift,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles,
  PieChart,
  User,
  Building,
  PlusCircle
} from "lucide-react";
import { getPaymentTokenBalance, getTokenBalance } from "../../services/contractService";
import { resolveUserWallet } from "../../lib/walletResolver";
import { loadInvestorReturns } from "../../services/investorReturns";
import { summarizeHoldings, signClass, pct } from "../../lib/portfolioSummary";
import AddWalletModal from "../../components/AddWalletModal";
import IdMethodPicker, { idMethod } from "../../components/IdMethodPicker";

// view="kyc" shows only identity verification (sidebar: KYC Verification).
export default function InvestorDashboard({ view = "full" }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { currency, formatMUSD, formatLKR, convert } = useCurrency();
  const [showAddWalletModal, setShowAddWalletModal] = useState(false);

  // Tab state: 'holdings' | 'kyc'
  const [activeTab, setActiveTab] = useState(view === "kyc" ? "kyc" : "holdings");
  useEffect(() => { if (view === "kyc") setActiveTab("kyc"); }, [view]);

  // KYC States
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [idType, setIdType] = useState("national_id");
  useEffect(() => { if (kycStatus?.idType) setIdType(kycStatus.idType); }, [kycStatus]);

  // Blockchain & Holdings States: Real on-chain data
  const [account, setAccount] = useState("");
  const [mUsdBalance, setMUsdBalance] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [holdingsError, setHoldingsError] = useState("");

  useEffect(() => {
    fetchKYCStatus();
    checkWallet();

    if (window.ethereum) {
      const handleAccounts = (accounts) => {
        if (accounts && accounts.length > 0) {
          checkWallet(accounts[0]);
        } else {
          checkWallet();
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

  const checkWallet = async (explicitAddress = null) => {
    const userAddr = resolveUserWallet(user);

    if (!userAddr) {
      setAccount("");
      setMUsdBalance(0);
      setHoldings([]);
      return;
    }

    setAccount(userAddr);

    // 1. Fetch real on-chain mUSD cash balance for this user's wallet only
    try {
      const bal = await getPaymentTokenBalance(userAddr);
      setMUsdBalance(bal);
    } catch (e) {
      console.warn("Payment bal error:", e);
    }

    // 2. Holdings straight from the chain: balances, the approved valuation (updated by
    //    published revaluations), purchase cost from marketplace trades, .
    try {
      setHoldingsError("");
      const [rows, assetsRes] = await Promise.all([
        loadInvestorReturns(userAddr),
        fetch("http://localhost:5001/api/assets").then((r) => r.json()).catch(() => null),
      ]);
      const locations = new Map((assetsRes?.data || []).map((a) => [Number(a.blockchainAssetId ?? a.tokenId ?? a.assetId), a.location]));
      const { holdings: held } = summarizeHoldings(rows.filter((r) => r.balance > 0), [], convert);
      setHoldings(held.map((h) => ({ ...h, location: locations.get(h.id) || "" })));
    } catch (e) {
      console.warn("Failed to load on-chain holdings:", e);
      setHoldingsError(e.message || "Could not read your holdings from the blockchain");
    }
  };

  const connectWallet = async () => {
    if (!account) {
      setShowAddWalletModal(true);
      return;
    }
    if (!window.ethereum) {
      alert("Please install MetaMask to connect your wallet.");
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts.length > 0) {
        checkWallet(accounts[0]);
      }
    } catch (err) {
      console.error("MetaMask connect error:", err);
    }
  };

  const fetchKYCStatus = async () => {
    try {
      const response = await kycAPI.getKYCStatus();
      setKycStatus(response.data?.data || null);
    } catch (err) {
      if (err.response?.status !== 404) {
        console.warn("KYC status error:", err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!idNumber.trim()) {
      setError("Please enter your National ID number before uploading");
      return;
    }

    setUploading(true);
    setError("");
    setSuccessMsg("");

    const formData = new FormData();
    formData.append("document", file);
    formData.append("idType", idType);
    formData.append("idNumber", idNumber);

    try {
      await kycAPI.uploadDocument(formData);
      await fetchKYCStatus();
      setSuccessMsg("ID document uploaded successfully!");
    } catch (err) {
      setError(err.response?.data?.message || "Document upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSelfieUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    setSuccessMsg("");

    const formData = new FormData();
    formData.append("selfie", file);

    try {
      await kycAPI.uploadSelfie(formData);
      await fetchKYCStatus();
      setSuccessMsg("Selfie photo biometric uploaded successfully!");
    } catch (err) {
      setError(err.response?.data?.message || "Selfie upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleVerification = async () => {
    setVerifying(true);
    setError("");
    setSuccessMsg("");

    try {
      await kycAPI.runPipeline();
      await fetchKYCStatus();
      setSuccessMsg("AI Identity & Biometric Verification Completed!");
    } catch (err) {
      setError(err.response?.data?.message || "Verification could not be completed. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const totalValueUSD = holdings.reduce((sum, h) => sum + h.valueUSD, 0);
  const totalSharesOwned = holdings.reduce((sum, h) => sum + h.balance, 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-black tracking-tight text-white">
                    {view === "kyc" ? "KYC Verification" : "Investor Portal"}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Investor View
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-400 mt-0.5">
                  <span>
                    Logged in as <strong className="text-zinc-200">{user?.name || "Verified Investor"}</strong> ({user?.email || "investor@rwa.io"})
                  </span>
                  <span className="text-zinc-600">•</span>
                  {account ? (
                    <span className="font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                      <Wallet className="w-3 h-3" />
                      {account.slice(0, 6)}...{account.slice(-4)}
                    </span>
                  ) : (
                    <button
                      onClick={() => setShowAddWalletModal(true)}
                      className="text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                    >
                      <PlusCircle className="w-3 h-3" />
                      Add Wallet
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <Link
              to="/marketplace"
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-500/25 transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              Buy Shares on Marketplace
            </Link>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Unlinked Wallet Notice */}
        {!account && (
          <div className="mb-6 p-5 bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-blue-950/40 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  No Wallet Linked to This Account
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full uppercase tracking-wider">Action Needed</span>
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Link your unique Ethereum wallet address to this account to view your portfolio and holdings.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddWalletModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-all hover:scale-[1.02]"
            >
              <PlusCircle className="w-4 h-4" />
              Add Wallet to Account
            </button>
          </div>
        )}

        {view !== "kyc" && (<>
        <PropertyValueChart />
        <InvestorReturns />
        <div className="mt-8"><HeldPropertyValuations mode="investor" /></div>
        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1: Portfolio Value */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
            <div className="text-xs font-medium text-zinc-400 mb-1">Value of Token Holdings</div>
            <div className="text-2xl font-black text-white">
              {formatMUSD(totalValueUSD)}
            </div>
            <div className="text-xs text-blue-400 mt-1">
              Cost moved by land-value change since purchase
            </div>
          </div>

          {/* Card 2: Cash Balance */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
            <div className="text-xs font-medium text-zinc-400 mb-1">mUSD Cash Balance</div>
            <div className="text-2xl font-black text-emerald-400">
              {mUsdBalance == null ? "Balance unavailable" : `${mUsdBalance.toLocaleString()} mUSD`}
            </div>
            <div className="text-xs text-zinc-400 mt-1 font-mono">
              ≈ {formatMUSD(mUsdBalance)}
            </div>
          </div>

          {/* Card 3: Total Shares */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
            <div className="text-xs font-medium text-zinc-400 mb-1">Fractional Shares Owned</div>
            <div className="text-2xl font-black text-white">
              {totalSharesOwned.toLocaleString()} Shares
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              Across {holdings.length} tokenized properties
            </div>
          </div>

          {/* Card 4: Compliance Status */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
            <div className="text-xs font-medium text-zinc-400 mb-1">Investor KYC Status</div>
            <div className="flex items-center gap-2 mt-1">
              {kycStatus?.verificationStatus === "approved" ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-base font-bold text-emerald-400 uppercase">
                    Verified
                  </span>
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 text-amber-400" />
                  <span className="text-base font-bold text-amber-400 uppercase">
                    {kycStatus?.verificationStatus || "Pending"}
                  </span>
                </>
              )}
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              Tier 1 Qualified Investor
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-zinc-800 mb-8 flex space-x-8">
          <button
            onClick={() => setActiveTab("holdings")}
            className={`pb-4 font-bold text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "holdings"
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <PieChart className="w-4 h-4" />
            My Fractional Holdings ({holdings.length})
          </button>

          <button
            onClick={() => setActiveTab("kyc")}
            className={`pb-4 font-bold text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "kyc"
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Investor KYC & Identity Verification
          </button>
        </div>

        {/* TAB 1: FRACTIONAL HOLDINGS */}
        </>)}

        {activeTab === "holdings" && (
          <div className="space-y-6">
            {!account ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mx-auto text-zinc-400">
                  <Wallet className="w-7 h-7" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-lg font-bold text-white">Wallet Not Added to Account</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Connect your MetaMask wallet or add your wallet address to this investor account to view your personal fractional token holdings and track their value.
                  </p>
                </div>
                <button
                  onClick={connectWallet}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add / Connect Wallet
                </button>
              </div>
            ) : holdingsError ? (
              <p role="alert" className="text-amber-300 text-sm">{holdingsError}</p>
            ) : holdings.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mx-auto text-zinc-400">
                  <PieChart className="w-7 h-7" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-lg font-bold text-white">No Token Holdings in this Wallet</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                    Wallet: {account}
                  </p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    You do not currently hold any fractional shares in this connected wallet. Explore the marketplace to acquire tokens.
                  </p>
                </div>
                <Link
                  to="/marketplace"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-500/25 transition-all inline-flex items-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Browse Marketplace
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {holdings.map((item) => (
                  <div
                    key={item.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-zinc-700 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-400">
                          Token #{item.id}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
                      {item.location && <p className="text-xs text-zinc-400 mb-4">{item.location}</p>}

                      <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3.5 space-y-2 text-xs mb-4">
                        <div className="flex justify-between text-zinc-400">
                          <span>Tokens owned:</span>
                          <span className="font-bold text-white">
                            {item.balance.toLocaleString()} of {item.supply.toLocaleString()} ({((item.balance / item.supply) * 100).toFixed(2)}%)
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Reference price / token:</span>
                          <span className="text-zinc-200">{formatLKR(item.valuationLKR / item.supply)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Current value:</span>
                          <span className="font-bold text-emerald-400">{formatMUSD(item.valueUSD)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>You paid:</span>
                          <span className="text-zinc-200">{item.costUSD == null ? "Not recorded" : formatMUSD(item.costUSD)}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>{item.unrealizedUSD != null && item.unrealizedUSD < 0 ? "Unrealized loss:" : "Unrealized profit:"}</span>
                          <span className={`font-semibold text-right ${signClass(item.unrealizedUSD)}`}>
                            {item.unrealizedUSD == null ? "—" : `${formatMUSD(item.unrealizedUSD)} (${pct(item.unrealizedPct)})`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-800/60 flex gap-3">
                      <Link
                        to={`/marketplace/sell?asset=${item.id}`}
                        className="flex-1 py-2 text-center bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all"
                      >
                        Sell tokens
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: KYC & COMPLIANCE */}
        {activeTab === "kyc" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Document Upload */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                Upload National ID / Passport
              </h3>
              <p className="text-xs text-zinc-400 mb-4">
                Required for Anti-Money Laundering (AML) and jurisdictional compliance before trading fractional RWA shares.
              </p>

              <div className="space-y-4">
                <IdMethodPicker value={idType} onChange={setIdType} disabled={uploading} />

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    {idMethod(idType)[2]}
                  </label>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder={`Enter your ${idMethod(idType)[2].toLowerCase()}`}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    ID Document Front Scan
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleDocumentUpload}
                    disabled={uploading}
                    className="w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20 cursor-pointer"
                  />
                  {kycStatus?.documentImage && (
                    <span className="text-[11px] text-emerald-400 mt-1 inline-block">
                      ✓ Document image securely uploaded
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Facial Biometric Photo (Selfie)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSelfieUpload}
                    disabled={uploading}
                    className="w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20 cursor-pointer"
                  />
                  {kycStatus?.selfie && (
                    <span className="text-[11px] text-emerald-400 mt-1 inline-block">
                      ✓ Biometric selfie securely uploaded
                    </span>
                  )}
                </div>

                <button
                  onClick={handleVerification}
                  disabled={verifying}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {verifying ? "Executing AI OCR Pipeline..." : "Run AI OCR & Facial Verification"}
                </button>
              </div>
            </div>

            {/* Verification Status Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white mb-2">Compliance Scorecard</h3>
                <p className="text-xs text-zinc-400 mb-4">
                  Automated OCR and document authenticity results evaluated for this investor wallet.
                </p>

                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Verification Status:</span>
                    <span className={`font-bold uppercase ${kycStatus?.verificationStatus === "approved" ? "text-emerald-400" : kycStatus?.verificationStatus === "rejected" ? "text-rose-400" : "text-amber-400"}`}>
                      {(kycStatus?.verificationStatus || "not started").replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Facial Match Confidence:</span>
                    <span className="font-semibold text-white">
                      {kycStatus?.pipelineResults ? `${kycStatus.faceScore}% confidence` : "Not checked yet"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Compliance Risk Score:</span>
                    <span className="font-semibold text-white">
                      {kycStatus?.pipelineResults ? `${kycStatus.riskScore}/100` : "Not checked yet"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Document Authenticity:</span>
                    <span className={`font-semibold ${kycStatus?.documentAuthentic ? "text-emerald-400" : "text-zinc-300"}`}>
                      {kycStatus?.documentAuthentic ? "✓ Authentic government ID" : kycStatus?.pipelineResults ? "Not confirmed" : "Not checked yet"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-400 mt-4">
                {kycStatus?.verificationStatus === "approved" ? "Your identity is verified. You can trade tokenized properties." : "Complete identity verification to trade tokenized properties."}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Wallet Modal */}
      <AddWalletModal
        isOpen={showAddWalletModal}
        onClose={() => setShowAddWalletModal(false)}
        onSuccess={() => checkWallet()}
      />
    </div>
  );
}
