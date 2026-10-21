import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { kycSteps } from "../../lib/ownerData";
import { useAuth } from "../../context/AuthContext";
import { useCurrency } from "../../context/CurrencyContext";
import { useRole } from "../../context/RoleContext";
import { kycAPI } from "../../lib/api";
import { resolveUserWallet } from "../../lib/walletResolver";
import { isAssetOwnedByUser } from "../../lib/assetOwnership";
import Navbar from "../../components/Navbar";
import AddWalletModal from "../../components/AddWalletModal";
import IdMethodPicker, { idMethod } from "../../components/IdMethodPicker";
import {
  Building,
  PlusCircle,
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertCircle,
  Coins,
  TrendingUp,
  X,
  ExternalLink,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  FileCheck,
  AlertTriangle,
  UserCheck,
  Wallet,
  Sparkles,
  ArrowRight,
  RefreshCw
} from "lucide-react";

// Inside the owner workspace this page serves several sidebar entries:
//   view="assets" (My Assets), view="assets" + openNew (Submit Asset),
//   view="kyc" (Complete KYC), view="kycStatus" (KYC Status).
export default function AssetOwnerDashboard({ view = "assets", openNew = false }) {
  const [searchParams] = useSearchParams();
  const searchQuery = (searchParams.get("q") || "").trim().toLowerCase();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { currency, currencyInfo, convert, formatLKR, formatMUSD } = useCurrency();
  const { isInvestor } = useRole();

  useEffect(() => {
    if (user?.role === "investor") {
      navigate("/dashboard/investor", { replace: true });
    }
  }, [user, navigate]);

  // Navigation & Tabs: Default to 'assets' so the user immediately sees asset management
  const activeTab = view === "assets" ? "assets" : "kyc";

  // KYC States
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [idNumber, setIdNumber] = useState("");
  const [idType, setIdType] = useState("national_id");

  // Asset Management States
  const [loadedAssets, setAssets] = useState([]);
  const ownerWallet = resolveUserWallet(user);
  const assets = loadedAssets.filter(asset => isAssetOwnedByUser(asset, user));
  const [assetLoading, setAssetLoading] = useState(false);
  const [showAddAssetModal, setShowAddAssetModalState] = useState(openNew);
  useEffect(() => { setShowAddAssetModalState(openNew); }, [openNew]);
  // Closing the form opened from "Submit Asset" returns to My Assets.
  const setShowAddAssetModal = (open) => {
    setShowAddAssetModalState(open);
    if (!open && openNew) navigate("/owner/assets");
  };
  const [expandedAssetId, setExpandedAssetId] = useState(null);
  const [verifyingAssetId, setVerifyingAssetId] = useState(null);
  const [assetUploading, setAssetUploading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Wallet & Blockchain Tokenization States
  const [account, setAccount] = useState("");
  const [selectedOwnerWallet, setSelectedOwnerWallet] = useState("");
  const [assetStatusFilter, setAssetStatusFilter] = useState("all"); // "all" | "verified" | "pending"
  const [copiedHash, setCopiedHash] = useState("");
  const [showAddWalletModal, setShowAddWalletModal] = useState(false);


  // Asset Form State
  const [assetUploadData, setAssetUploadData] = useState({
    assetName: "",
    symbol: "",
    assetType: "real_estate",
    valuation: "",
    currency: "LKR",
    totalShares: 1000,
    location: "",
    description: ""
  });

  // The property value is typed in the selected currency. When the currency changes,
  // convert what is already typed so the number keeps meaning the same amount.
  const prevCurrency = useRef(currency);
  useEffect(() => {
    const prev = prevCurrency.current;
    if (prev === currency) return;
    prevCurrency.current = currency;
    setAssetUploadData((d) => {
      const n = Number(d.valuation);
      if (!(n > 0)) return d;
      const converted = convert(n, prev, currency);
      return { ...d, valuation: String(Number(converted.toFixed(currencyInfo.decimals ?? 2))) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  const [assetFiles, setAssetFiles] = useState({
    deed: null,
    surveyPlan: null,
    extracts: null,
    priorDeeds: null,
    certificates: null
  });

  const handleCopyHash = (hash) => {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(""), 2000);
  };

  const fetchAssets = async (walletAddress = selectedOwnerWallet) => {
    if (!user?.token) {
      setAssets([]);
      setAssetLoading(false);
      return;
    }

    setAssetLoading(true);
    try {
      // Fetch real registered assets from backend database API filtered by owner
      const res = await fetch("http://localhost:5001/api/assets/owned", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAssets(data.data);
        return;
      }
      setAssets([]);
    } catch (err) {
      console.warn("Error fetching assets for owner:", err.message);
      setAssets([]);
    } finally {
      setAssetLoading(false);
    }
  };

  const detectWallet = async (explicitAddress = null) => {
    const active = resolveUserWallet(user);

    if (active) {
      setAccount(active);
      setSelectedOwnerWallet(resolveUserWallet(user) || "");
      fetchAssets();
    } else {
      setAccount("");
      setSelectedOwnerWallet("");
      setAssets([]);
    }
  };

  useEffect(() => {
    fetchKYCStatus();
    detectWallet();

    if (window.ethereum) {
      const handleAccounts = (accounts) => {
        if (accounts && accounts.length > 0) {
          detectWallet(accounts[0]);
        } else {
          detectWallet();
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

  useEffect(() => {
    if (kycStatus?.idNumber) {
      setIdNumber(kycStatus.idNumber);
    }
    if (kycStatus?.idType) setIdType(kycStatus.idType);
  }, [kycStatus]);

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

  const handleAssetUpload = async (e) => {
    e.preventDefault();

    if (!assetUploadData.assetName.trim()) {
      setError("Asset name is required");
      return;
    }
    if (!assetUploadData.location.trim()) {
      setError("Please enter the property location");
      return;
    }
    if (!assetUploadData.valuation || Number(assetUploadData.valuation) <= 0) {
      setError("Please enter a valid asset valuation");
      return;
    }

    setAssetUploading(true);
    setError("");
    setSuccessMsg("");

    const formData = new FormData();
    formData.append("assetName", assetUploadData.assetName);
    formData.append("assetType", assetUploadData.assetType);
    // The backend stores values in LKR, so convert what was typed in the selected currency.
    formData.append("valuation", String(Math.round(convert(Number(assetUploadData.valuation), currency, "LKR"))));
    formData.append("currency", assetUploadData.currency);

    // Optional fields
    if (assetUploadData.symbol.trim()) formData.append("symbol", assetUploadData.symbol.trim());
    formData.append("totalShares", assetUploadData.totalShares);
    formData.append("location", assetUploadData.location);
    formData.append("description", assetUploadData.description);
    formData.append("issuerWallet", selectedOwnerWallet);

    if (assetFiles.deed) formData.append("deed", assetFiles.deed);
    if (assetFiles.surveyPlan) formData.append("surveyPlan", assetFiles.surveyPlan);
    if (assetFiles.extracts) formData.append("extracts", assetFiles.extracts);
    if (assetFiles.priorDeeds) formData.append("priorDeeds", assetFiles.priorDeeds);
    if (assetFiles.certificates) formData.append("certificates", assetFiles.certificates);

    try {
      const response = await kycAPI.uploadAsset(formData);
      setSuccessMsg("Asset successfully submitted for deed verification and legal review!");

      // Reset form
      setAssetUploadData({
        assetName: "",
        symbol: "",
        assetType: "real_estate",
        valuation: "",
        currency: "LKR",
        totalShares: 1000,
        location: "",
        description: ""
      });
      setAssetFiles({
        deed: null,
        surveyPlan: null,
        extracts: null,
        priorDeeds: null,
        certificates: null
      });

      setShowAddAssetModal(false);
      await fetchAssets(selectedOwnerWallet);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Asset upload failed. Please try again.");
    } finally {
      setAssetUploading(false);
    }
  };



  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!idNumber.trim()) {
      setError("Please enter your ID number before uploading the document");
      return;
    }

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("document", file);
    formData.append("idType", idType);
    formData.append("idNumber", idNumber);

    try {
      await kycAPI.uploadDocument(formData);
      await fetchKYCStatus();
      setSuccessMsg("Identity document uploaded successfully!");
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

    const formData = new FormData();
    formData.append("selfie", file);

    try {
      await kycAPI.uploadSelfie(formData);
      await fetchKYCStatus();
      setSuccessMsg("Owner selfie biometric uploaded successfully!");
    } catch (err) {
      setError(err.response?.data?.message || "Selfie upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleVerification = async () => {
    setVerifying(true);
    setError("");
    try {
      await kycAPI.runPipeline();
      await fetchKYCStatus();
      setSuccessMsg("Owner KYC identity verification successfully completed!");
    } catch (err) {
      setError(err.response?.data?.message || "KYC verification pipeline failed");
    } finally {
      setVerifying(false);
    }
  };





  // Classification helpers for Asset Owner's own assets
  const isAssetVerified = (a) => {
    return (
      a.verificationStatus === "approved" ||
      a.status === "Approved" ||
      a.tokenized === true ||
      a.status === "Tokenized" ||
      Boolean(a.blockchainTokenId)
    );
  };

  const isAssetPending = (a) => {
    return (
      (a.status === "Pending" || a.verificationStatus === "pending" || !a.verificationStatus) &&
      !isAssetVerified(a)
    );
  };

  const verifiedAssets = assets.filter(isAssetVerified);
  const pendingAssets = assets.filter(isAssetPending);

  const displayedAssets = assets.filter((a) => {
    if (searchQuery && ![a.name, a.assetName, a.symbol, a.location].some((v) => String(v || "").toLowerCase().includes(searchQuery))) return false;
    if (assetStatusFilter === "verified") return isAssetVerified(a);
    if (assetStatusFilter === "pending") return isAssetPending(a);
    return true;
  });

  // Metrics calculation over owned assets only
  const totalValuationLKR = assets.reduce(
    (sum, a) => sum + (Number(a.valuationLKR || a.valuation) || 0),
    0
  );
  const tokenizedCount = assets.filter(
    (a) => a.tokenized || a.status === "Tokenized" || Boolean(a.blockchainTokenId)
  ).length;
  const approvedEligibleCount = verifiedAssets.filter(
    (a) => !a.tokenized && a.status !== "Tokenized" && !a.blockchainTokenId
  ).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {{ assets: "My Assets", kyc: "Complete KYC", kycStatus: "KYC Status" }[view]}
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              {{
                assets: "Every property you have submitted, its verification status and next step.",
                kyc: "Upload your identity document and a selfie, then run the automated check.",
                kycStatus: "Results of your identity verification.",
              }[view]}
            </p>
          </div>
          {view === "assets" && !isInvestor && (
            <button
              onClick={() => { setError(""); setSuccessMsg(""); setShowAddAssetModal(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl"
            >
              <PlusCircle className="w-5 h-5" /> Submit asset
            </button>
          )}
        </div>

        {/* Connected Owner Wallet Banner */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              selectedOwnerWallet ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-amber-500/10 border border-amber-500/30"
            }`}>
              {selectedOwnerWallet ? (
                <UserCheck className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold uppercase tracking-wider ${
                  selectedOwnerWallet ? "text-emerald-400" : "text-amber-400"
                }`}>
                  {selectedOwnerWallet ? "Connected Asset Owner Wallet" : "No Wallet Connected"}
                </span>
                {selectedOwnerWallet ? (
                  <>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {selectedOwnerWallet.slice(0, 6)}...{selectedOwnerWallet.slice(-4)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {assets.length} Properties Registered
                    </span>
                  </>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    MetaMask Disconnected
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {selectedOwnerWallet
                  ? "Displays only real-world assets registered to your authenticated wallet address."
                  : "Connect your MetaMask wallet to view and manage your registered properties."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {selectedOwnerWallet ? (
              <button
                onClick={() => fetchAssets(selectedOwnerWallet)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Refresh Assets</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAddWalletModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Wallet to Account</span>
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="text-zinc-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg("")} className="text-zinc-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Portfolio Stats Grid */}
        {view === "assets" && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-zinc-400 mb-2 text-xs font-semibold uppercase tracking-wider">
              <span>Total Owned Assets</span>
              <Building className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {assets.length} <span className="text-sm font-normal text-zinc-400">Properties</span>
            </div>
            <div className="text-xs text-blue-400 mt-2 font-medium">
              Exclusively owned by this address
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-zinc-400 mb-2 text-xs font-semibold uppercase tracking-wider">
              <span>Verified & Tokenized</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {verifiedAssets.length} <span className="text-sm font-normal text-zinc-400">Properties</span>
            </div>
            <div className="text-xs text-zinc-400 mt-2">
              {tokenizedCount} On-Chain • {approvedEligibleCount} Ready to Tokenize
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-zinc-400 mb-2 text-xs font-semibold uppercase tracking-wider">
              <span>Pending Verification</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400">
              {pendingAssets.length} <span className="text-sm font-normal text-zinc-400">Properties</span>
            </div>
            <div className="text-xs text-zinc-400 mt-2">
              Title deeds & cadastral plans under review
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-zinc-400 mb-2 text-xs font-semibold uppercase tracking-wider">
              <span>Combined Valuation ({currency})</span>
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {formatLKR(totalValuationLKR, { compact: true })}
            </div>
            <div className="text-xs text-zinc-500 mt-2">
              {currency !== "LKR" ? `≈ LKR ${(totalValuationLKR / 1000000).toFixed(1)}M appraisal` : "Total real estate appraisal"}
            </div>
          </div>
        </div>}

        {/* TAB 1: ASSET MANAGEMENT */}
        {activeTab === "assets" && (
          <div className="space-y-6">
            {/* Quick Onboard Banner */}
            <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-zinc-900 border border-blue-800/40 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  Ready to Register or Tokenize a Real-World Property?
                </h3>
                <p className="text-xs text-zinc-400 max-w-2xl">
                  Upload deed certificates, cadastral survey plans, and appraisal figures. Legally verified properties can be fractionalized on the Ethereum blockchain into ERC-1155 tokens.
                </p>
              </div>

              {!isInvestor && (
                <button
                  onClick={() => setShowAddAssetModal(true)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/20 shrink-0 transition-all cursor-pointer flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Asset Now
                </button>
              )}
            </div>

            {/* Sub-Filter Tabs: All vs Verified vs Pending */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/60 p-2 rounded-2xl border border-zinc-800">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setAssetStatusFilter("all")}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    assetStatusFilter === "all"
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>All My Assets ({assets.length})</span>
                </button>
                <button
                  onClick={() => setAssetStatusFilter("verified")}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    assetStatusFilter === "verified"
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 border border-emerald-500"
                      : "text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verified Assets ({verifiedAssets.length})</span>
                </button>
                <button
                  onClick={() => setAssetStatusFilter("pending")}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    assetStatusFilter === "pending"
                      ? "bg-amber-600 text-white shadow-lg shadow-amber-500/25 border border-amber-500"
                      : "text-zinc-400 hover:text-amber-400 hover:bg-zinc-800"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pending Assets ({pendingAssets.length})</span>
                </button>
              </div>

              <div className="text-xs text-zinc-400 px-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Showing assets owned by <span className="font-mono text-zinc-200">{selectedOwnerWallet ? `${selectedOwnerWallet.slice(0, 6)}...${selectedOwnerWallet.slice(-4)}` : "None (Connect Wallet)"}</span></span>
              </div>
            </div>

            {searchQuery && (
              <p className="text-sm text-zinc-400">Showing assets matching “{searchParams.get("q")}”. <Link to="/owner/assets" className="text-blue-300">Clear search</Link></p>
            )}
            {/* Assets Grid */}
            {assetLoading ? (
              <div className="py-20 text-center text-zinc-500">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                Loading owned assets...
              </div>
            ) : displayedAssets.length === 0 ? (
              <div className="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-2xl">
                <Building className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white">
                  {assetStatusFilter === "verified"
                    ? "No Verified Assets Found"
                    : assetStatusFilter === "pending"
                    ? "No Pending Assets Found"
                    : "No Assets Owned by this Wallet"}
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1 mb-5">
                  {assetStatusFilter === "verified"
                    ? "Submit your pending property deeds for verification or onboard a new asset."
                    : assetStatusFilter === "pending"
                    ? "All registered properties have completed legal verification."
                    : "Begin by registering your first real-world property deed for fractional tokenization."}
                </p>
                {!isInvestor && (
                  <button
                    onClick={() => setShowAddAssetModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium cursor-pointer"
                  >
                    Register New Asset
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedAssets.map((asset) => {
                  const isTokenized = asset.tokenized || asset.status === "Tokenized" || Boolean(asset.blockchainTokenId);
                  const isApproved = isAssetVerified(asset);
                  const isPending = isAssetPending(asset);
                  const isExpanded = expandedAssetId === asset.assetId;
                  const totalShares = Number(asset.totalShares) || 0;
                  const valuation = Number(asset.valuationLKR ?? asset.valuation) || 0;
                  const referencePrice = totalShares > 0 ? valuation / totalShares : 0;

                  return (
                    <div
                      key={asset.assetId}
                      className={`bg-zinc-900 border rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all hover:border-zinc-700 ${
                        isPending
                          ? "border-amber-800/40 bg-gradient-to-b from-zinc-900 via-zinc-900 to-amber-950/15"
                          : isTokenized
                          ? "border-emerald-800/40 bg-gradient-to-b from-zinc-900 via-zinc-900 to-emerald-950/15"
                          : "border-blue-800/40 bg-gradient-to-b from-zinc-900 via-zinc-900 to-blue-950/15"
                      }`}
                    >
                      <div>
                        {/* Status Badges */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-400">
                            {asset.symbol || `Asset #${asset.assetId}`}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                              isTokenized
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : isApproved
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {isTokenized ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>TOKENIZED{asset.blockchainAssetId != null ? ` (TOKEN #${asset.blockchainAssetId})` : ""}</span>
                              </>
                            ) : isApproved ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                                <span>APPROVED • READY TO TOKENIZE</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                <span>PENDING VERIFICATION</span>
                              </>
                            )}
                          </span>
                        </div>

                        {/* Title & Valuation */}
                        <h3 className="text-lg font-bold text-white mb-1">{asset.name || asset.assetName}</h3>
                        <p className="text-xs text-zinc-400 mb-3 capitalize">
                          {[(asset.propertyType || asset.assetType || "").replace("_", " "), asset.location].filter(Boolean).join(" • ") || "Location not provided"}
                        </p>

                        {/* Distinct Pending Verification Notice */}
                        {isPending && (
                          <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3.5 space-y-2 text-xs mb-4">
                            <div className="flex items-center gap-1.5 font-bold text-amber-300">
                              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>Deed Document Verification In Progress</span>
                            </div>
                            <p className="text-[11px] text-zinc-300 leading-relaxed">
                              Deed documents & cadastral plans submitted. Awaiting upstream legal title clearance before smart-contract fractional tokenization is unlocked.
                            </p>
                            <div className="flex items-center justify-between pt-1 border-t border-amber-800/30 font-mono text-[11px]">
                              <span className="text-zinc-400">Deed SHA-256:</span>
                              <button
                                onClick={() => handleCopyHash(asset.documentHash)}
                                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-mono"
                                title="Copy Document Hash"
                              >
                                <span>{asset.documentHash ? `${asset.documentHash.slice(0, 10)}...${asset.documentHash.slice(-6)}` : "Not recorded"}</span>
                                {copiedHash === asset.documentHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Core Appraisal & Dual-Price Formula Metrics */}
                        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3.5 space-y-2 text-xs mb-4">
                          <div className="flex justify-between text-zinc-400">
                            <span>Appraisal Valuation:</span>
                            <div className="text-right">
                              <span className="font-bold text-white">
                                {formatLKR(valuation)}
                              </span>
                              {currency !== "LKR" && (
                                <span className="block text-[10px] text-zinc-500 font-mono">
                                  LKR {valuation.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between text-zinc-400">
                            <span>Fractional Shares:</span>
                            <span className="font-semibold text-zinc-200">
                              {totalShares.toLocaleString()} Shares
                            </span>
                          </div>
                          <div className="flex justify-between text-zinc-400">
                            <span>Reference Price (Valuation / Shares):</span>
                            <span className="font-bold text-emerald-400 font-mono">
                              {formatLKR(referencePrice)} / share
                            </span>
                          </div>
                          <div className="flex justify-between text-zinc-400 pt-1 border-t border-zinc-800/60">
                            <span>Title & Authenticity:</span>
                            <span className={`font-semibold flex items-center gap-1 ${isApproved ? "text-emerald-400" : "text-amber-400"}`}>
                              {isApproved ? (
                                <>
                                  <FileCheck className="w-3.5 h-3.5" />
                                  <span>✓ Title Verified Genuine</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Cadastral Audit Pending</span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions & Verification Authority Status */}
                      <div className="pt-3 border-t border-zinc-800/60 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {isPending && (
                            <div className="flex-1 min-w-[180px] py-2 px-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-xs flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="font-medium">Awaiting Authority Verification</span>
                            </div>
                          )}

                          {isTokenized && !isInvestor && (
                            <Link
                              to={`/marketplace?sellAsset=${asset.assetId}`}
                              className="flex-1 min-w-[180px] py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold text-center"
                            >
                              List Tokens for Sale
                            </Link>
                          )}
                          {isApproved && !isTokenized && !isInvestor && (
                            <button
                              onClick={() => navigate(`/tokenization/preview/${asset.assetId}`)}
                              className="flex-1 min-w-[170px] py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Coins className="w-3.5 h-3.5 text-white" />
                              Proceed to Tokenization Module →
                            </button>
                          )}

                          {isTokenized && (
                            <button
                              onClick={() => navigate("/owner/portfolio")}
                              className="flex-1 min-w-[140px] py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-semibold text-xs rounded-xl border border-emerald-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Building className="w-3.5 h-3.5 text-emerald-400" />
                              View in Portfolio →
                            </button>
                          )}

                          <button
                            onClick={() => setExpandedAssetId(isExpanded ? null : asset.assetId)}
                            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            {isExpanded ? "Less" : "Audit"}
                          </button>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-400 space-y-1.5 mt-2">
                            <div>
                              <span className="text-zinc-500 block">Deed Document Hash:</span>
                              <div className="flex items-center justify-between text-zinc-300 break-all text-[11px]">
                                <span>{asset.documentHash || "Not recorded"}</span>
                                <button
                                  onClick={() => handleCopyHash(asset.documentHash)}
                                  className="ml-2 text-zinc-400 hover:text-white shrink-0"
                                  title="Copy Hash"
                                >
                                  {copiedHash === asset.documentHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                            <div>
                              <span className="text-zinc-500 block">Metadata URI:</span>
                              <span className="text-blue-400 break-all text-[11px]">
                                {asset.metadataURI || "Not recorded"}
                              </span>
                            </div>
                            <div className="flex justify-between pt-1">
                              <span>Verification Review:</span>
                              <span className={isApproved ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                                {isApproved ? "Approved by Legal Authority" : "Under Authority Review"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: OWNER KYC & COMPLIANCE */}
        {activeTab === "kyc" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                Asset Owner KYC Verification
              </h2>

              {kycStatus ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-zinc-800">
                    <span className="text-zinc-400">Verification status:</span>
                    <span className={`font-bold uppercase ${kycStatus.verificationStatus === "approved" ? "text-emerald-400" : kycStatus.verificationStatus === "rejected" ? "text-rose-400" : "text-amber-400"}`}>
                      {(kycStatus.verificationStatus || "pending").replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-zinc-800">
                    <span className="text-zinc-400">Face match:</span>
                    <span className="font-semibold text-white">{kycSteps(kycStatus)[2].done ? `${kycStatus.faceScore}% confidence` : "Not checked yet"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-zinc-800">
                    <span className="text-zinc-400">Risk score:</span>
                    <span className="font-semibold text-white">{kycSteps(kycStatus)[2].done ? `${kycStatus.riskScore}/100` : "Not checked yet"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-zinc-800">
                    <span className="text-zinc-400">Document authenticity:</span>
                    <span className={`font-semibold ${kycStatus.documentAuthentic ? "text-emerald-400" : "text-zinc-300"}`}>
                      {kycStatus.documentAuthentic ? "✓ Authentic" : kycSteps(kycStatus)[2].done ? "Not confirmed" : "Not checked yet"}
                    </span>
                  </div>
                  {kycStatus.verifiedAt && (
                    <div className="flex justify-between py-2 border-b border-zinc-800">
                      <span className="text-zinc-400">Verified on:</span>
                      <span className="font-semibold text-white">{new Date(kycStatus.verifiedAt).toLocaleString()}</span>
                    </div>
                  )}
                  {kycStatus.rejectionReason && <p className="text-rose-300 text-xs">Reason: {kycStatus.rejectionReason}</p>}
                  <ul className="pt-2 space-y-1.5">
                    {kycSteps(kycStatus).map((st) => (
                      <li key={st.key} className={`flex items-center gap-2 text-xs ${st.done ? "text-emerald-300" : "text-zinc-500"}`}>
                        {st.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />} {st.label}
                      </li>
                    ))}
                  </ul>
                  {view === "kycStatus" && kycStatus.verificationStatus !== "approved" && (
                    <Link to="/owner/kyc" className="inline-block mt-2 text-sm text-blue-300">Continue verification →</Link>
                  )}
                </div>
              ) : (
                <p className="text-sm text-zinc-400">
                  You have not started identity verification yet.{" "}
                  {view === "kycStatus" && <Link to="/owner/kyc" className="text-blue-300">Start now →</Link>}
                </p>
              )}
            </div>

            {/* Document Uploads */}
            {view !== "kycStatus" && <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-white mb-2">Owner Identity Credentials</h2>

              <IdMethodPicker value={idType} onChange={setIdType} disabled={uploading} />

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  {idMethod(idType)[2]}
                </label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder={`Enter your ${idMethod(idType)[2].toLowerCase()}`}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Identity Document (PDF / Image)
                </label>
                <input
                  type="file"
                  onChange={handleDocumentUpload}
                  disabled={uploading}
                  className="w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Owner Live Selfie Biometric
                </label>
                <input
                  type="file"
                  onChange={handleSelfieUpload}
                  disabled={uploading}
                  className="w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white"
                />
              </div>

              <button
                onClick={handleVerification}
                disabled={verifying}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {verifying ? "Processing AI OCR & Biometrics..." : "Run AI KYC Verification"}
              </button>
            </div>}
          </div>
        )}

        {/* MODAL: SUBMIT A PROPERTY FOR VERIFICATION */}
        {showAddAssetModal && (() => {
          const val = convert(Number(assetUploadData.valuation), currency, "LKR"); // always LKR for the preview
          const shares = Number(assetUploadData.totalShares);
          const ready = val > 0 && shares > 0;
          const field = "w-full px-3.5 py-2.5 rounded-xl border border-[#1b2440] bg-[#0e1426] text-sm text-white placeholder:text-[#6b7599] focus:outline-none focus:border-indigo-500";
          const label = "block text-sm font-medium text-[#c3cae2] mb-1.5";
          const hint = "text-xs text-[#98a2c3] mt-1.5";
          const fileBox = (name, title, note) => (
            <label className={`flex items-center gap-3 rounded-xl border border-dashed p-3.5 cursor-pointer ${assetFiles[name] ? "border-emerald-500/50 bg-emerald-500/5" : "border-[#29345a] bg-[#0e1426] hover:border-indigo-500/60"}`}>
              <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${assetFiles[name] ? "bg-emerald-500/15 text-emerald-300" : "bg-indigo-500/10 text-indigo-300"}`}>
                {assetFiles[name] ? <CheckCircle2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-white">{title}</span>
                <span className="block text-xs text-[#98a2c3] truncate">{assetFiles[name] ? assetFiles[name].name : note}</span>
              </span>
              <input type="file" accept="image/*,.pdf" className="sr-only" onChange={(e) => setAssetFiles({ ...assetFiles, [name]: e.target.files?.[0] })} />
            </label>
          );
          return (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-label="Submit a property">
              <div className="bg-[#0b1124] border border-[#1b2440] rounded-2xl w-full max-w-2xl shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden">
                <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-[#1b2440]">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-300 flex items-center justify-center shrink-0"><Building className="w-5 h-5" /></span>
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-white">Submit a property</h2>
                      <p className="text-sm text-[#98a2c3]">Tell us about the land or building. The compliance team checks your documents before it can be tokenized.</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setShowAddAssetModal(false)} aria-label="Close" className="p-2 rounded-lg text-[#98a2c3] hover:text-white hover:bg-[#141c33] shrink-0"><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleAssetUpload} className="flex flex-col min-h-0">
                  <div className="overflow-y-auto p-5 sm:p-6 space-y-7">
                    {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</p>}

                    <section className="space-y-4">
                      <h3 className="flex items-center gap-2.5 font-semibold text-white"><span className="w-6 h-6 rounded-full bg-indigo-500/15 text-indigo-300 text-xs font-bold flex items-center justify-center">1</span>About the property</h3>
                      <div>
                        <label className={label} htmlFor="asset-name">Property name <span className="text-rose-300">*</span></label>
                        <input id="asset-name" type="text" value={assetUploadData.assetName} onChange={(e) => setAssetUploadData({ ...assetUploadData, assetName: e.target.value })} placeholder="e.g. Kegalle hillside land" className={field} required />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className={label} htmlFor="asset-type">Type</label>
                          <select id="asset-type" value={assetUploadData.assetType} onChange={(e) => setAssetUploadData({ ...assetUploadData, assetType: e.target.value })} className={field}>
                            <option value="real_estate">Residential real estate</option>
                            <option value="commercial">Commercial plaza</option>
                            <option value="villa">Boutique heritage villa</option>
                            <option value="land">Development land</option>
                          </select>
                        </div>
                        <div>
                          <label className={label} htmlFor="asset-location">Location <span className="text-rose-300">*</span></label>
                          <input id="asset-location" type="text" value={assetUploadData.location} onChange={(e) => setAssetUploadData({ ...assetUploadData, location: e.target.value })} placeholder="e.g. Kegalle, Sabaragamuwa" className={field} required />
                        </div>
                      </div>
                      <div>
                        <label className={label} htmlFor="asset-desc">Short description <span className="text-[#98a2c3] font-normal">(optional)</span></label>
                        <input id="asset-desc" type="text" value={assetUploadData.description} onChange={(e) => setAssetUploadData({ ...assetUploadData, description: e.target.value })} placeholder="Land size, building, road access…" className={field} />
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h3 className="flex items-center gap-2.5 font-semibold text-white"><span className="w-6 h-6 rounded-full bg-indigo-500/15 text-indigo-300 text-xs font-bold flex items-center justify-center">2</span>Value and tokens</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className={label} htmlFor="asset-val">Property value ({currency}) <span className="text-rose-300">*</span></label>
                          <input id="asset-val" type="number" min="0" step="any" value={assetUploadData.valuation} onChange={(e) => setAssetUploadData({ ...assetUploadData, valuation: e.target.value })} placeholder={`e.g. ${Math.round(convert(10000000, "LKR", currency)).toLocaleString()}`} className={field} required />
                          <p className={hint}>The appraised value from your valuation report.</p>
                        </div>
                        <div>
                          <label className={label} htmlFor="asset-shares">Number of tokens <span className="text-rose-300">*</span></label>
                          <input id="asset-shares" type="number" min="1" value={assetUploadData.totalShares} onChange={(e) => setAssetUploadData({ ...assetUploadData, totalShares: e.target.value })} placeholder="e.g. 1000" className={field} required />
                          <p className={hint}>The property is split into this many equal shares.</p>
                        </div>
                      </div>
                      <div>
                        <label className={label} htmlFor="asset-symbol">Short code <span className="text-[#98a2c3] font-normal">(optional)</span></label>
                        <input id="asset-symbol" type="text" value={assetUploadData.symbol} onChange={(e) => setAssetUploadData({ ...assetUploadData, symbol: e.target.value })} placeholder="e.g. KEG-01" className={`${field} sm:max-w-xs`} />
                      </div>
                      <div className="rounded-xl border border-[#1b2440] bg-[#0e1426] p-4" aria-live="polite">
                        {ready ? (
                          <p className="text-sm text-[#c3cae2]">
                            Each token will start at <strong className="text-white">{formatLKR(val / shares)}</strong>, and <strong className="text-white">1 token = {(100 / shares).toFixed(shares > 1000 ? 4 : 2)}%</strong> of the property.
                          </p>
                        ) : <p className="text-sm text-[#98a2c3]">Enter the value and number of tokens to see the price of one token.</p>}
                      </div>
                    </section>

                    <section className="space-y-3">
                      <h3 className="flex items-center gap-2.5 font-semibold text-white"><span className="w-6 h-6 rounded-full bg-indigo-500/15 text-indigo-300 text-xs font-bold flex items-center justify-center">3</span>Documents</h3>
                      <p className="text-sm text-[#98a2c3]">PDF or photo. These are used to prove you own the property.</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {fileBox("deed", "Title deed", "Choose a file")}
                        {fileBox("surveyPlan", "Survey plan", "Choose a file")}
                      </div>
                    </section>

                    <section className="rounded-xl border border-[#1b2440] bg-[#0e1426] p-4">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><Clock className="w-4 h-4 text-indigo-300" />What happens next</h3>
                      <ol className="space-y-1.5 text-sm text-[#98a2c3] list-decimal pl-5">
                        <li>Your deed is read automatically and a fingerprint of it is saved.</li>
                        <li>A compliance officer checks the land registry and approves it.</li>
                        <li>You create {ready ? shares.toLocaleString() : "your"} tokens in your wallet and can put them on sale.</li>
                      </ol>
                    </section>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row gap-3 p-5 sm:px-6 border-t border-[#1b2440] bg-[#0b1124]">
                    <button type="button" onClick={() => setShowAddAssetModal(false)} className="sm:w-40 py-3 rounded-xl border border-[#1b2440] bg-[#0e1426] hover:bg-[#141c33] text-sm font-semibold text-[#c3cae2]">Cancel</button>
                    <button type="submit" disabled={assetUploading} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed">
                      {assetUploading ? "Uploading and checking…" : "Submit property"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}
      </main>

      {/* Add Wallet Modal */}
      <AddWalletModal
        isOpen={showAddWalletModal}
        onClose={() => setShowAddWalletModal(false)}
        onSuccess={() => detectWallet()}
      />
    </div>
  );
}
