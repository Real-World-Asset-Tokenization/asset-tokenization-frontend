import React, { useState } from "react";
import { X, Building, DollarSign, Coins, FileCheck, MapPin, UploadCloud, AlertCircle } from "lucide-react";
import { registerAssetBackend } from "../services/apiService";
import { registerAssetOnChain } from "../services/contractService";

export default function RegisterAssetModal({
  wallet,
  onClose,
  onSuccess
}) {
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    propertyType: "Residential Real Estate",
    location: "",
    description: "",
    valuationLKR: "15000000",
    totalShares: "1500",
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    deedIdentifier: "DEED-LK-WP-2026-9812A"
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!wallet.account) {
      setError("Please connect your MetaMask wallet first to register an asset.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setStatusMessage("1/2: Storing asset metadata & calculating title deed hash...");

      // 1. Submit to Backend API
      const backendAsset = await registerAssetBackend({
        ...formData,
        issuerWallet: wallet.account,
        documentContent: `${formData.deedIdentifier}-${formData.name}-${formData.location}`
      });

      // 2. Register on Smart Contract (AssetRegistry.sol)
      setStatusMessage("2/2: Please confirm MetaMask transaction to record on AssetRegistry.sol...");
      try {
        await registerAssetOnChain({
          name: backendAsset.name,
          symbol: backendAsset.symbol,
          metadataURI: backendAsset.metadataURI,
          documentHash: backendAsset.documentHash,
          valuationLKR: backendAsset.valuationLKR,
          totalShares: backendAsset.totalShares
        });
      } catch (chainErr) {
        console.warn("On-chain registration skipped or rejected:", chainErr);
        // Still saved in backend as pending, show informative feedback
      }

      setStatusMessage("✔ Asset successfully submitted for verification!");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || "Failed to register property.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050816]/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl glass-panel rounded-3xl border border-[#94A3BB]/20 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col bg-[#050816]/95">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#94A3BB]/15">
          <div>
            <h2 className="text-xl font-bold text-[#FFFFFF] flex items-center gap-2">
              <Building className="w-5 h-5 text-[#00E5FF]" />
              Register Real-World Property for Tokenization
            </h2>
            <p className="text-xs text-[#94A3BB] mt-0.5">
              Submit legal property credentials, title deed hash, and fractional supply parameters
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#090D22] hover:bg-[#0E1535] text-[#94A3BB] hover:text-[#FFFFFF] border border-[#94A3BB]/20 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {statusMessage && (
            <div className="p-3.5 rounded-xl bg-indigo-950/50 border border-indigo-800/80 text-indigo-200 text-xs flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#94A3BB] mb-1">Property Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Colombo Oceanfront Penthouse"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090D22] border border-[#94A3BB]/20 text-[#FFFFFF] text-xs focus:outline-none focus:border-[#00E5FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#94A3BB] mb-1">Token Symbol / Ticker</label>
              <input
                type="text"
                name="symbol"
                required
                placeholder="e.g. COP-01"
                value={formData.symbol}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090D22] border border-[#94A3BB]/20 text-[#FFFFFF] text-xs focus:outline-none focus:border-[#00E5FF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#94A3BB] mb-1">Property Category</label>
              <select
                name="propertyType"
                value={formData.propertyType}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090D22] border border-[#94A3BB]/20 text-[#FFFFFF] text-xs focus:outline-none focus:border-[#00E5FF]"
              >
                <option value="Residential Real Estate">Residential Real Estate</option>
                <option value="Commercial Business Complex">Commercial Business Complex</option>
                <option value="Hospitality & Boutique Villa">Hospitality & Boutique Villa</option>
                <option value="Industrial Logistics Park">Industrial Logistics Park</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#94A3BB] mb-1">Location / Province</label>
              <input
                type="text"
                name="location"
                required
                placeholder="e.g. Marine Drive, Colombo 03, Sri Lanka"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090D22] border border-[#94A3BB]/20 text-[#FFFFFF] text-xs focus:outline-none focus:border-[#00E5FF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#94A3BB] mb-1">
                Asset Valuation (LKR)
              </label>
              <input
                type="number"
                name="valuationLKR"
                required
                min="100000"
                value={formData.valuationLKR}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090D22] border border-[#94A3BB]/20 text-[#FFFFFF] text-xs focus:outline-none focus:border-[#00E5FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#94A3BB] mb-1">
                Fractional ERC-1155 Shares
              </label>
              <input
                type="number"
                name="totalShares"
                required
                min="10"
                value={formData.totalShares}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090D22] border border-[#94A3BB]/20 text-[#FFFFFF] text-xs focus:outline-none focus:border-[#00E5FF]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94A3BB] mb-1">
              Title Deed / Land Registry Document ID
            </label>
            <input
              type="text"
              name="deedIdentifier"
              required
              placeholder="e.g. DEED-LK-WP-2026-9812A"
              value={formData.deedIdentifier}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#090D22] border border-[#94A3BB]/20 text-[#FFFFFF] text-xs focus:outline-none focus:border-[#00E5FF]"
            />
            <p className="text-[11px] text-[#94A3BB]/70 mt-1">
              A SHA-256 cryptographic proof will be minted on-chain to bind the digital token to this deed.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94A3BB] mb-1">Property Description</label>
            <textarea
              name="description"
              rows="2"
              placeholder="Provide key architectural, rental yield, and legal title highlights..."
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#090D22] border border-[#94A3BB]/20 text-[#FFFFFF] text-xs focus:outline-none focus:border-[#00E5FF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94A3BB] mb-1">Display Image URL</label>
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#090D22] border border-[#94A3BB]/20 text-[#FFFFFF] text-xs focus:outline-none focus:border-[#00E5FF]"
            />
          </div>

          {/* Economics Summary */}
          <div className="p-3.5 rounded-xl bg-[#4F46E5]/10 border border-[#4F46E5]/30 text-xs text-[#94A3BB] flex items-center justify-between">
            <span>Calculated Fraction Unit Price:</span>
            <span className="font-bold text-[#00E5FF] text-sm">
              LKR {Math.round(Number(formData.valuationLKR) / Number(formData.totalShares || 1)).toLocaleString()} / share
            </span>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-[#FFFFFF] font-semibold text-sm shadow-lg shadow-[#4F46E5]/25 hover:shadow-[#00E5FF]/20 border border-[#4F46E5] transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Processing Blockchain Registration..." : "Submit Property & Register on Blockchain"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
