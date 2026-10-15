import React, { useState, useEffect } from "react";
import { fetchAssets, fetchStats } from "../services/apiService";
import { useWallet } from "../hooks/useWallet";
import { getTokenBalance } from "../services/contractService";

export default function InvestorDashboard({ user, onLogout }) {
  const wallet = useWallet();
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState(null);
  const [userBalances, setUserBalances] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadBalances();
  }, [wallet.account, assets]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [assetList, platformStats] = await Promise.all([
        fetchAssets(),
        fetchStats(),
      ]);
      setAssets(assetList || []);
      setStats(platformStats);
    } catch (err) {
      console.error("Failed to load platform data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async () => {
    if (!wallet.account || assets.length === 0) {
      setUserBalances({});
      return;
    }

    const balances = {};
    for (const asset of assets) {
      if (asset.status === "Tokenized") {
        const bal = await getTokenBalance(wallet.account, asset.assetId);
        balances[asset.assetId] = bal;
      } else {
        balances[asset.assetId] = 0;
      }
    }
    setUserBalances(balances);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    onLogout();
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Investor Dashboard</h1>
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
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h3 className="text-slate-400 text-sm mb-2">Total Assets</h3>
              <p className="text-3xl font-bold">{stats.totalAssets || 0}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h3 className="text-slate-400 text-sm mb-2">Tokenized Assets</h3>
              <p className="text-3xl font-bold">{stats.tokenizedAssetsCount || 0}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h3 className="text-slate-400 text-sm mb-2">Total Valuation</h3>
              <p className="text-3xl font-bold">
                LKR {(stats.totalValuationLKR || 0).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Wallet Connection */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Wallet Connection</h2>
          {wallet.account ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Connected Account</p>
                <p className="font-mono text-sm">{wallet.account}</p>
              </div>
              <button
                onClick={() => wallet.disconnect()}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md text-sm"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => wallet.connect()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-md"
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* Assets List */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Available Assets</h2>
          {loading ? (
            <p className="text-slate-400">Loading assets...</p>
          ) : assets.length === 0 ? (
            <p className="text-slate-400">No assets available</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assets.map((asset) => (
                <div
                  key={asset.assetId}
                  className="bg-slate-800 border border-slate-700 rounded-lg p-4"
                >
                  <h3 className="font-bold text-lg mb-2">{asset.name}</h3>
                  <p className="text-slate-400 text-sm mb-2">{asset.symbol}</p>
                  <p className="text-slate-400 text-sm mb-2">{asset.location}</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Valuation:</span>
                      <span>LKR {asset.valuationLKR?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Share Price:</span>
                      <span>LKR {asset.sharePriceLKR?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Total Shares:</span>
                      <span>{asset.totalShares}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Your Balance:</span>
                      <span>{userBalances[asset.assetId] || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Status:</span>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          asset.status === "Tokenized"
                            ? "bg-green-600"
                            : "bg-yellow-600"
                        }`}
                      >
                        {asset.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
