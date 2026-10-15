import React, { useState, useEffect } from "react";
import { getUserAssets, uploadAssetDocuments, verifyAsset } from "../services/apiService";

export default function AssetOwnerDashboard({ user, onLogout }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadData, setUploadData] = useState({
    assetName: "",
    assetType: "real_estate",
    valuation: "",
    currency: "LKR",
    location: "",
    totalShares: "",
    sharePriceLKR: "",
  });
  const [files, setFiles] = useState({
    deed: null,
    surveyPlan: null,
    extracts: null,
    priorDeeds: null,
    certificates: null,
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const data = await getUserAssets();
      setAssets(data.assets || []);
    } catch (err) {
      console.error("Failed to load assets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    onLogout();
  };

  const handleFileChange = (field, file) => {
    setFiles({ ...files, [field]: file });
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("assetName", uploadData.assetName);
      formData.append("assetType", uploadData.assetType);
      formData.append("valuation", uploadData.valuation);
      formData.append("currency", uploadData.currency);
      formData.append("location", uploadData.location);
      formData.append("totalShares", uploadData.totalShares);
      formData.append("sharePriceLKR", uploadData.sharePriceLKR);

      Object.entries(files).forEach(([key, file]) => {
        if (file) {
          formData.append(key, file);
        }
      });

      await uploadAssetDocuments(formData);
      setUploadModalOpen(false);
      loadAssets();
      // Reset form
      setUploadData({
        assetName: "",
        assetType: "real_estate",
        valuation: "",
        currency: "LKR",
        location: "",
        totalShares: "",
        sharePriceLKR: "",
      });
      setFiles({
        deed: null,
        surveyPlan: null,
        extracts: null,
        priorDeeds: null,
        certificates: null,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleVerifyAsset = async (assetId) => {
    try {
      await verifyAsset(assetId);
      loadAssets();
    } catch (err) {
      console.error("Failed to verify asset:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Asset Owner Dashboard</h1>
            <p className="text-slate-400 text-sm">Welcome, {user?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-indigo-600 rounded-full text-sm">
              {user?.role}
            </span>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm"
            >
              Upload Asset
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Assets List */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">My Assets</h2>
          {loading ? (
            <p className="text-slate-400">Loading assets...</p>
          ) : assets.length === 0 ? (
            <p className="text-slate-400">No assets uploaded yet</p>
          ) : (
            <div className="space-y-4">
              {assets.map((asset) => (
                <div
                  key={asset.assetId}
                  className="bg-slate-800 border border-slate-700 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{asset.assetName}</h3>
                      <p className="text-slate-400 text-sm">{asset.assetType}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs ${
                        asset.verificationStatus === "approved"
                          ? "bg-green-600"
                          : asset.verificationStatus === "rejected"
                          ? "bg-red-600"
                          : "bg-yellow-600"
                      }`}
                    >
                      {asset.verificationStatus}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">Valuation</p>
                      <p className="font-medium">
                        LKR {asset.valuation?.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Location</p>
                      <p className="font-medium">{asset.location}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Total Shares</p>
                      <p className="font-medium">{asset.totalShares}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Share Price</p>
                      <p className="font-medium">
                        LKR {asset.sharePriceLKR?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {asset.verificationStatus === "pending" && (
                    <button
                      onClick={() => handleVerifyAsset(asset._id)}
                      className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm"
                    >
                      Request Verification
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Upload New Asset</h2>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Asset Name
                </label>
                <input
                  type="text"
                  required
                  value={uploadData.assetName}
                  onChange={(e) =>
                    setUploadData({ ...uploadData, assetName: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Asset Type
                </label>
                <select
                  value={uploadData.assetType}
                  onChange={(e) =>
                    setUploadData({ ...uploadData, assetType: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                >
                  <option value="real_estate">Real Estate</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="equipment">Equipment</option>
                  <option value="intellectual_property">Intellectual Property</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Valuation (LKR)
                </label>
                <input
                  type="number"
                  required
                  value={uploadData.valuation}
                  onChange={(e) =>
                    setUploadData({ ...uploadData, valuation: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  required
                  value={uploadData.location}
                  onChange={(e) =>
                    setUploadData({ ...uploadData, location: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Total Shares
                  </label>
                  <input
                    type="number"
                    required
                    value={uploadData.totalShares}
                    onChange={(e) =>
                      setUploadData({ ...uploadData, totalShares: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Share Price (LKR)
                  </label>
                  <input
                    type="number"
                    required
                    value={uploadData.sharePriceLKR}
                    onChange={(e) =>
                      setUploadData({
                        ...uploadData,
                        sharePriceLKR: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Documents
                </label>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm text-slate-400">Deed (Required)</label>
                    <input
                      type="file"
                      required
                      onChange={(e) => handleFileChange("deed", e.target.files[0])}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Survey Plan (Required)</label>
                    <input
                      type="file"
                      required
                      onChange={(e) =>
                        handleFileChange("surveyPlan", e.target.files[0])
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Extracts (Optional)</label>
                    <input
                      type="file"
                      onChange={(e) =>
                        handleFileChange("extracts", e.target.files[0])
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Prior Deeds (Optional)</label>
                    <input
                      type="file"
                      onChange={(e) =>
                        handleFileChange("priorDeeds", e.target.files[0])
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Certificates (Optional)</label>
                    <input
                      type="file"
                      onChange={(e) =>
                        handleFileChange("certificates", e.target.files[0])
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
