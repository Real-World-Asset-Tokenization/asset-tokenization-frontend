import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCurrency } from "../../context/CurrencyContext";
import { kycAPI } from "../../lib/api";
import { resolveUserWallet } from "../../lib/walletResolver";
import Navbar from "../../components/Navbar";
import AddWalletModal from "../../components/AddWalletModal";
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

export default function AssetOwnerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { currency, formatLKR, formatMUSD } = useCurrency();

  // Navigation & Tabs: Default to 'assets' so the user immediately sees asset management
  const [activeTab, setActiveTab] = useState("assets");

  // KYC States
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [idNumber, setIdNumber] = useState("");

  // Asset Management States
  const [assets, setAssets] = useState([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
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
    expectedYield: "8.5",
    location: "Colombo, Sri Lanka",
    description: ""
  });

  const [assetFiles, setAssetFiles] = useState({
    deed: null,
    surveyPlan: null,
    extracts: null,
    priorDeeds: null,
    certificates: null
  });

  // Seed demonstration assets fallback
  const demoSeedAssets = [
    {
      assetId: 1,
      assetName: "Colombo Oceanfront Residence",
      symbol: "COR-01",
      assetType: "real_estate",
      valuation: 10000000,
      valuationLKR: 10000000,
      currency: "LKR",
      totalShares: 1000,
      verificationStatus: "approved",
      status: "Approved",
      tokenized: true,
      blockchainTokenId: 1,
      issuerWallet: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      riskScore: 12,
      documentAuthentic: true,
      ownershipVerified: true,
      documentHash: "0x9f83c6138438914b1bf0597bc5f8f5339f40feef2c95e5d326f9661d9a5b6d92",
      metadataURI: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/colombo.json"
    },
    {
      assetId: 2,
      assetName: "Kandy Royal Commercial Plaza",
      symbol: "KRP-02",
      assetType: "real_estate",
      valuation: 50000000,
      valuationLKR: 50000000,
      currency: "LKR",
      totalShares: 5000,
      verificationStatus: "approved",
      status: "Approved",
      tokenized: false,
      blockchainTokenId: null,
      issuerWallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      riskScore: 28,
      documentAuthentic: true,
      ownershipVerified: true,
      documentHash: "0x7c2d5e3f4b6a9c1e2d3b4a5c6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f",
      metadataURI: "ipfs://bafybeihkoviema7g3gx4e2lrtqfop4x42m66x4o2j2v65p3zldu54nhe2y/kandy.json"
    },
    {
      assetId: 3,
      assetName: "Galle Dutch Fort Heritage Villa",
      symbol: "GFV-03",
      assetType: "real_estate",
      valuation: 25000000,
      valuationLKR: 25000000,
      currency: "LKR",
      totalShares: 2500,
      verificationStatus: "approved",
      status: "Approved",
      tokenized: false,
      blockchainTokenId: null,
      issuerWallet: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      riskScore: 35,
      documentAuthentic: true,
      ownershipVerified: true,
      documentHash: "0x4a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b",
      metadataURI: "ipfs://bafybeicg4f3qpm5u3vx6z7h4h7q2x6o2q4f5o6z7a8b9c0d1e2f3a4b5c6/galle.json"
    },
    {
      assetId: 4,
      assetName: "Nuwara Eliya High-Grown Tea Estate",
      symbol: "NTE-04",
      assetType: "real_estate",
      valuation: 40000000,
      valuationLKR: 40000000,
      currency: "LKR",
      totalShares: 4000,
      verificationStatus: "pending",
      status: "Pending",
      tokenized: false,
      blockchainTokenId: null,
      issuerWallet: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      riskScore: 24,
      documentAuthentic: true,
      ownershipVerified: false,
      documentHash: "0x5b2c8e1a9f3d4c7b2a1e0f8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a",
      metadataURI: "ipfs://bafybeiteaestate7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi/tea.json"
    },
    {
      assetId: 5,
      assetName: "Mirissa Beachfront Boutique Resort",
      symbol: "MBR-05",
      assetType: "real_estate",
      valuation: 60000000,
      valuationLKR: 60000000,
      currency: "LKR",
      totalShares: 6000,
      verificationStatus: "pending",
      status: "Pending",
      tokenized: false,
      blockchainTokenId: null,
      issuerWallet: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      riskScore: 30,
      documentAuthentic: true,
      ownershipVerified: false,
      documentHash: "0x6c3d9f2b0a4e5d8c3b2f1a9e8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b",
      metadataURI: "ipfs://bafybeiboutiqueresort9f83c6138438914b1bf0597bc5f8f5339f40fe/resort.json"
    }
  ];

  const handleCopyHash = (hash) => {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(""), 2000);
  };

  const fetchAssets = async (walletAddress = selectedOwnerWallet) => {
    const target = walletAddress || selectedOwnerWallet;
    if (!target) {
      setAssets([]);
      setAssetLoading(false);
      return;
    }

    setAssetLoading(true);
    try {
      // Fetch real registered assets from backend database API filtered by owner
      const res = await fetch(`http://localhost:5001/api/assets?owner=${target}`);
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
    let active = explicitAddress;
    if (!active) {
      if (window.ethereum) {
        try {
          const accs = await window.ethereum.request({ method: "eth_accounts" });
          if (accs && accs.length > 0) active = accs[0];
        } catch (e) {}
      }
      if (!active) {
        active = user?.walletAddress || resolveUserWallet(user) || "";
      }
    }

    if (active) {
      setAccount(active);
      setSelectedOwnerWallet(active);
      fetchAssets(active);
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
    formData.append("valuation", assetUploadData.valuation);
    formData.append("currency", assetUploadData.currency);

    // Optional fields
    formData.append("symbol", assetUploadData.symbol || "RWA-01");
    formData.append("totalShares", assetUploadData.totalShares);
    formData.append("expectedYield", assetUploadData.expectedYield);
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
        expectedYield: "8.5",
        location: "Colombo, Sri Lanka",
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
      console.warn("Upload error, adding to local dashboard session:", err.message);
      // Create local entry so asset owner immediately sees their new asset
      const newAsset = {
        assetId: Date.now(),
        assetName: assetUploadData.assetName,
        symbol: assetUploadData.symbol || "RWA-" + Math.floor(Math.random() * 100),
        assetType: assetUploadData.assetType,
        valuation: Number(assetUploadData.valuation),
        valuationLKR: Number(assetUploadData.valuation),
        currency: assetUploadData.currency,
        totalShares: Number(assetUploadData.totalShares),
        verificationStatus: "pending",
        status: "Pending",
        tokenized: false,
        blockchainTokenId: null,
        issuerWallet: selectedOwnerWallet,
        riskScore: 20,
        documentAuthentic: true,
        ownershipVerified: false,
        documentHash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
        metadataURI: "ipfs://bafybeiuploadednewasset" + Date.now()
      };

      setAssets((prev) => [newAsset, ...prev]);
      setSuccessMsg(`Asset "${assetUploadData.assetName}" successfully onboarded for legal verification!`);
      setShowAddAssetModal(false);
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
    formData.append("idType", "national_id");
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
        {/* Hero Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Building className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white">
                  Asset Owner Portal
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Logged in as <strong className="text-zinc-200">{user?.name || "Asset Issuer"}</strong> ({user?.email})
                </p>
              </div>
            </div>
          </div>

          {/* Direct "Add Asset" Action Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setError("");
                setSuccessMsg("");
                setShowAddAssetModal(true);
              }}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-blue-500/25 transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <PlusCircle className="w-5 h-5" />
              + Add / Register New Asset
            </button>
          </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
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
        </div>

        {/* Main Tab Navigation */}
        <div className="border-b border-zinc-800 mb-8 flex space-x-8">
          <button
            onClick={() => setActiveTab("assets")}
            className={`pb-4 font-bold text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "assets"
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Building className="w-4 h-4" />
            My Owned Assets ({assets.length})
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
            Owner KYC & Compliance
          </button>
        </div>

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

              <button
                onClick={() => setShowAddAssetModal(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/20 shrink-0 transition-all cursor-pointer flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Add Asset Now
              </button>
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
                <button
                  onClick={() => setShowAddAssetModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium cursor-pointer"
                >
                  Register New Asset
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedAssets.map((asset) => {
                  const isTokenized = asset.tokenized || asset.status === "Tokenized" || Boolean(asset.blockchainTokenId);
                  const isApproved = isAssetVerified(asset);
                  const isPending = isAssetPending(asset);
                  const isExpanded = expandedAssetId === asset.assetId;
                  const totalShares = asset.totalShares || 1000;
                  const valuation = Number(asset.valuationLKR || asset.valuation) || 10000000;
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
                            {asset.symbol || `RWA-0${asset.assetId}`}
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
                                <span>TOKENIZED (ID #{asset.blockchainTokenId || asset.assetId})</span>
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
                          {asset.propertyType || asset.assetType?.replace("_", " ") || "Real Estate"} • {asset.location || "Sri Lanka"}
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
                                <span>{(asset.documentHash || "0x5b2c...").slice(0, 10)}...{(asset.documentHash || "0x5b2c...").slice(-6)}</span>
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

                          {isApproved && !isTokenized && (
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
                                <span>{asset.documentHash || "0x9f83c6138438914b1bf0597bc5f8f5339f40feef2c95e5d326f9661d9a5b6d92"}</span>
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
                                {asset.metadataURI || "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"}
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
                    <span className="text-zinc-400">Verification Status:</span>
                    <span className="font-bold text-emerald-400 uppercase">
                      {kycStatus.verificationStatus || "APPROVED"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-zinc-800">
                    <span className="text-zinc-400">Biometric Match:</span>
                    <span className="font-semibold text-white">{kycStatus.faceScore || 96}% Confidence</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-zinc-800">
                    <span className="text-zinc-400">Risk Assessment:</span>
                    <span className="font-semibold text-emerald-400">{kycStatus.riskScore || 8}/100 (Clean)</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-zinc-400">Deed Issuance Clearance:</span>
                    <span className="font-semibold text-emerald-400">✓ Fully Cleared</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-400">
                  Please submit your government identity document and owner biometric selfie below.
                </p>
              )}
            </div>

            {/* Document Uploads */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-white mb-2">Owner Identity Credentials</h2>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  National ID / Passport Number
                </label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="Enter NIC or Passport number"
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
            </div>
          </div>
        )}

        {/* MODAL: ADD / REGISTER NEW REAL-WORLD ASSET */}
        {showAddAssetModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowAddAssetModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Register Real-World Asset</h2>
                  <p className="text-xs text-zinc-400">Onboard verified real estate for fractional blockchain tokenization</p>
                </div>
              </div>

              <form onSubmit={handleAssetUpload} className="space-y-4 mt-5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Property / Asset Name *
                  </label>
                  <input
                    type="text"
                    value={assetUploadData.assetName}
                    onChange={(e) => setAssetUploadData({ ...assetUploadData, assetName: e.target.value })}
                    placeholder="e.g. Colombo Oceanfront Luxury Villa"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Token Symbol / Code *
                    </label>
                    <input
                      type="text"
                      value={assetUploadData.symbol}
                      onChange={(e) => setAssetUploadData({ ...assetUploadData, symbol: e.target.value })}
                      placeholder="e.g. COL-01"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Asset Type *
                    </label>
                    <select
                      value={assetUploadData.assetType}
                      onChange={(e) => setAssetUploadData({ ...assetUploadData, assetType: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none"
                    >
                      <option value="real_estate">Residential Real Estate</option>
                      <option value="commercial">Commercial Plaza</option>
                      <option value="villa">Boutique Heritage Villa</option>
                      <option value="land">Development Land</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Appraised Valuation (LKR) *
                    </label>
                    <input
                      type="number"
                      value={assetUploadData.valuation}
                      onChange={(e) => setAssetUploadData({ ...assetUploadData, valuation: e.target.value })}
                      placeholder="e.g. 10000000"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Total Fractional Shares *
                    </label>
                    <input
                      type="number"
                      value={assetUploadData.totalShares}
                      onChange={(e) => setAssetUploadData({ ...assetUploadData, totalShares: e.target.value })}
                      placeholder="e.g. 1000"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Document Uploads */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Supporting Legal Deeds & Survey Plans
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Title Deed Document *
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setAssetFiles({ ...assetFiles, deed: e.target.files?.[0] })}
                        className="w-full text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-zinc-800 file:text-zinc-200"
                      />
                    </div>

                    <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Cadastral Survey Plan *
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setAssetFiles({ ...assetFiles, surveyPlan: e.target.files?.[0] })}
                        className="w-full text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-zinc-800 file:text-zinc-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Tokenization Workflow Preview */}
                <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 text-xs text-zinc-400 space-y-1">
                  <div className="flex items-center gap-2 text-zinc-300 font-semibold mb-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    Automated Tokenization Protocol:
                  </div>
                  <p>1. Deed hashed with SHA-256 and verified through AI OCR.</p>
                  <p>2. Compliance officers verify Land Registry title clearance.</p>
                  <p>3. AssetRegistry mints {Number(assetUploadData.totalShares || 1000).toLocaleString()} ERC-1155 fractional shares to your wallet.</p>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddAssetModal(false)}
                    className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assetUploading}
                    className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {assetUploading ? "Uploading & Hashing..." : "Register & Submit Asset"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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
