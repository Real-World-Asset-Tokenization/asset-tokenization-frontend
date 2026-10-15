import React, { useState, useEffect } from "react";
import { getAllUsers, verifyUser, getAllAssetsAdmin, updateAssetVerificationStatus, fetchStats } from "../services/apiService";

export default function AdminDashboard({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users"); // users | assets | stats

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === "users") {
        const data = await getAllUsers();
        setUsers(data.users || []);
      } else if (activeTab === "assets") {
        const data = await getAllAssetsAdmin();
        setAssets(data.assets || []);
      } else if (activeTab === "stats") {
        const data = await fetchStats();
        setStats(data);
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

  const handleVerifyUser = async (userId) => {
    try {
      await verifyUser(userId);
      loadData();
    } catch (err) {
      console.error("Failed to verify user:", err);
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
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
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
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-md ${
              activeTab === "users"
                ? "bg-indigo-600"
                : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab("assets")}
            className={`px-4 py-2 rounded-md ${
              activeTab === "assets"
                ? "bg-indigo-600"
                : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            Assets
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-4 py-2 rounded-md ${
              activeTab === "stats"
                ? "bg-indigo-600"
                : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            Platform Stats
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">All Users</h2>
            {loading ? (
              <p className="text-slate-400">Loading users...</p>
            ) : users.length === 0 ? (
              <p className="text-slate-400">No users found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4">Name</th>
                      <th className="text-left py-3 px-4">Email</th>
                      <th className="text-left py-3 px-4">Role</th>
                      <th className="text-left py-3 px-4">Verified</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id} className="border-b border-slate-800">
                        <td className="py-3 px-4">{u.name}</td>
                        <td className="py-3 px-4">{u.email}</td>
                        <td className="py-3 px-4">{u.role}</td>
                        <td className="py-3 px-4">
                          {u.isVerified ? (
                            <span className="px-2 py-1 bg-green-600 rounded text-xs">
                              Verified
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-600 rounded text-xs">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {!u.isVerified && (
                            <button
                              onClick={() => handleVerifyUser(u._id)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                            >
                              Verify
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Assets Tab */}
        {activeTab === "assets" && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">All Assets</h2>
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

        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Platform Statistics</h2>
            {loading ? (
              <p className="text-slate-400">Loading stats...</p>
            ) : stats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-slate-400 text-sm mb-2">Total Assets</h3>
                  <p className="text-3xl font-bold">{stats.totalAssets || 0}</p>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-slate-400 text-sm mb-2">Tokenized Assets</h3>
                  <p className="text-3xl font-bold">{stats.tokenizedAssetsCount || 0}</p>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-slate-400 text-sm mb-2">Pending Verification</h3>
                  <p className="text-3xl font-bold">
                    {stats.pendingVerificationCount || 0}
                  </p>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-slate-400 text-sm mb-2">Total Valuation</h3>
                  <p className="text-3xl font-bold">
                    LKR {(stats.totalValuationLKR || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-slate-400 text-sm mb-2">Total Fractional Shares</h3>
                  <p className="text-3xl font-bold">
                    {stats.totalFractionalShares || 0}
                  </p>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-slate-400 text-sm mb-2">Tokenized Valuation</h3>
                  <p className="text-3xl font-bold">
                    LKR {(stats.tokenizedValuationLKR || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-slate-400">No stats available</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
