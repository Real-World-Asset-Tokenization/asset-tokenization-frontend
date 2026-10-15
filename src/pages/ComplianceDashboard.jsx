import React, { useState, useEffect } from "react";
import { getAllUsers, getAllAssetsAdmin, updateAssetVerificationStatus, updateKYCStatus, getKYCDetails } from "../services/apiService";

export default function ComplianceDashboard({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [kycRecords, setKycRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("kyc"); // kyc | assets

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === "kyc") {
        const data = await getAllUsers();
        setUsers(data.users || []);
        // Load KYC details for each user
        const kycData = {};
        for (const u of data.users || []) {
          try {
            const kyc = await getKYCDetails(u._id);
            kycData[u._id] = kyc;
          } catch (err) {
            kycData[u._id] = null;
          }
        }
        setKycRecords(kycData);
      } else if (activeTab === "assets") {
        const data = await getAllAssetsAdmin();
        setAssets(data.assets || []);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    onLogout();
  };

  const handleUpdateKYCStatus = async (userId, status) => {
    try {
      await updateKYCStatus(userId, status);
      loadData();
    } catch (err) {
      console.error("Failed to update KYC status:", err);
    }
  };

  const handleUpdateAssetStatus = async (assetId, status, rejectionReason = "") => {
    try {
      await updateAssetVerificationStatus(assetId, status, rejectionReason);
      loadData();
    } catch (err) {
      console.error("Failed to update asset status:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Compliance Officer Dashboard</h1>
            <p className="text-slate-400 text-sm">Welcome, {user?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-indigo-600 rounded-full text-sm">
              {user?.role}
            </span>
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
        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("kyc")}
            className={`px-4 py-2 rounded-md ${
              activeTab === "kyc"
                ? "bg-indigo-600"
                : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            KYC Reviews
          </button>
          <button
            onClick={() => setActiveTab("assets")}
            className={`px-4 py-2 rounded-md ${
              activeTab === "assets"
                ? "bg-indigo-600"
                : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            Asset Reviews
          </button>
        </div>

        {/* KYC Tab */}
        {activeTab === "kyc" && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">KYC Verification Requests</h2>
            {loading ? (
              <p className="text-slate-400">Loading KYC records...</p>
            ) : users.length === 0 ? (
              <p className="text-slate-400">No users found</p>
            ) : (
              <div className="space-y-4">
                {users.map((u) => {
                  const kyc = kycRecords[u._id];
                  if (!kyc) return null;

                  return (
                    <div
                      key={u._id}
                      className="bg-slate-800 border border-slate-700 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg">{u.name}</h3>
                          <p className="text-slate-400 text-sm">{u.email}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs ${
                            kyc.verificationStatus === "approved"
                              ? "bg-green-600"
                              : kyc.verificationStatus === "rejected"
                              ? "bg-red-600"
                              : "bg-yellow-600"
                          }`}
                        >
                          {kyc.verificationStatus}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-slate-400">ID Type</p>
                          <p className="font-medium">{kyc.idType}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">ID Number</p>
                          <p className="font-medium">{kyc.idNumber}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Face Score</p>
                          <p className="font-medium">{kyc.faceScore || 0}%</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Risk Score</p>
                          <p className="font-medium">{kyc.riskScore || 0}</p>
                        </div>
                      </div>
                      {kyc.verificationStatus === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateKYCStatus(u._id, "approved")}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt("Enter rejection reason:");
                              if (reason) {
                                handleUpdateKYCStatus(u._id, "rejected");
                              }
                            }}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Assets Tab */}
        {activeTab === "assets" && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Asset Verification Requests</h2>
            {loading ? (
              <p className="text-slate-400">Loading assets...</p>
            ) : assets.length === 0 ? (
              <p className="text-slate-400">No assets found</p>
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
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
                        <p className="text-slate-400">Document Authentic</p>
                        <p className="font-medium">
                          {asset.documentAuthentic ? "Yes" : "No"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Ownership Verified</p>
                        <p className="font-medium">
                          {asset.ownershipVerified ? "Yes" : "No"}
                        </p>
                      </div>
                    </div>
                    {asset.verificationStatus === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateAssetStatus(asset._id, "approved")}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt("Enter rejection reason:");
                            if (reason) {
                              handleUpdateAssetStatus(asset._id, "rejected", reason);
                            }
                          }}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
