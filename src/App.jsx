import React, { useState, useEffect, useCallback } from "react";
import Navbar from "./components/Navbar";
import DashboardView from "./components/DashboardView";
import MarketplaceView from "./components/MarketplaceView";
import GovernanceView from "./components/GovernanceView";
import ProfitDistributionView from "./components/ProfitDistributionView";
import AssetDetailsModal from "./components/AssetDetailsModal";
import RegisterAssetModal from "./components/RegisterAssetModal";
import AdminApprovalModal from "./components/AdminApprovalModal";
import TransferModal from "./components/TransferModal";
import BuyModal from "./components/BuyModal";
import MultiUserGuideModal from "./components/MultiUserGuideModal";
import TeammatesHubModal from "./components/TeammatesHubModal";
import { useWallet } from "./hooks/useWallet";
import { fetchAssets, fetchStats } from "./services/apiService";
import { getTokenBalance } from "./services/contractService";

export default function App() {
  const wallet = useWallet();

  const [currentView, setCurrentView] = useState("dashboard"); // "dashboard" | "marketplace" | "governance" | "profit_distribution"
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState(null);
  const [userBalances, setUserBalances] = useState({});
  const [loading, setLoading] = useState(true);

  // Modal states
  const [detailsAsset, setDetailsAsset] = useState(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [transferAsset, setTransferAsset] = useState(null);
  const [buyAsset, setBuyAsset] = useState(null);
  const [teammatesOpen, setTeammatesOpen] = useState(false);
  const [multiUserOpen, setMultiUserOpen] = useState(false);

  // Load backend assets and platform stats
  const loadData = useCallback(async () => {
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
  }, []);

  // Update on-chain balances when wallet or assets change
  const loadBalances = useCallback(async () => {
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
  }, [wallet.account, assets]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  return (
    <div className="min-h-screen bg-[#050816] text-[#FFFFFF] flex flex-col selection:bg-[#4F46E5] selection:text-white">
      {/* Navigation Header */}
      <Navbar
        wallet={wallet}
        currentView={currentView}
        onSelectView={(view) => setCurrentView(view)}
        onOpenRegister={() => setRegisterOpen(true)}
        onOpenAdmin={() => setAdminOpen(true)}
        onOpenTeammates={() => setTeammatesOpen(true)}
        onOpenMultiUser={() => setMultiUserOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === "dashboard" && (
          <DashboardView
            wallet={wallet}
            assets={assets}
            userBalances={userBalances}
            onNavigateMarketplace={() => setCurrentView("marketplace")}
            onViewDetails={(a) => setDetailsAsset(a)}
            onOpenTransfer={(a) => setTransferAsset(a)}
            onOpenBuy={(a) => setBuyAsset(a)}
          />
        )}

        {currentView === "marketplace" && (
          <MarketplaceView
            wallet={wallet}
            assets={assets}
            stats={stats}
            userBalances={userBalances}
            loading={loading}
            onRefresh={() => {
              loadData();
              loadBalances();
            }}
            onOpenRegister={() => setRegisterOpen(true)}
            onOpenAdmin={() => setAdminOpen(true)}
            onOpenTeammates={() => setTeammatesOpen(true)}
            onViewDetails={(a) => setDetailsAsset(a)}
            onOpenTransfer={(a) => setTransferAsset(a)}
            onOpenBuy={(a) => setBuyAsset(a)}
          />
        )}

        {currentView === "governance" && (
          <GovernanceView
            wallet={wallet}
            assets={assets}
            userBalances={userBalances}
          />
        )}

        {currentView === "profit_distribution" && (
          <ProfitDistributionView
            wallet={wallet}
            assets={assets}
            userBalances={userBalances}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© 2026 AssetToken Research Project • University Implementation</p>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentView("dashboard")}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Dashboard
            </button>
            <span>•</span>
            <button
              onClick={() => setCurrentView("marketplace")}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Marketplace
            </button>
            <span>•</span>
            <button
              onClick={() => setCurrentView("governance")}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Governance
            </button>
            <span>•</span>
            <button
              onClick={() => setCurrentView("profit_distribution")}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Profit Distribution
            </button>
            <span>•</span>
            <button
              onClick={() => setTeammatesOpen(true)}
              className="hover:text-amber-400 transition-colors cursor-pointer"
            >
              Teammate Hub
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {detailsAsset && (
        <AssetDetailsModal
          asset={detailsAsset}
          userBalance={userBalances[detailsAsset.assetId] || 0}
          onClose={() => setDetailsAsset(null)}
          onOpenTransfer={(a) => setTransferAsset(a)}
          onOpenBuy={(a) => setBuyAsset(a)}
        />
      )}

      {registerOpen && (
        <RegisterAssetModal
          wallet={wallet}
          onClose={() => setRegisterOpen(false)}
          onSuccess={() => {
            loadData();
            loadBalances();
          }}
        />
      )}

      {adminOpen && (
        <AdminApprovalModal
          wallet={wallet}
          assets={assets}
          onClose={() => setAdminOpen(false)}
          onRefresh={() => {
            loadData();
            loadBalances();
          }}
        />
      )}

      {transferAsset && (
        <TransferModal
          asset={transferAsset}
          userBalance={userBalances[transferAsset.assetId] || 0}
          wallet={wallet}
          onClose={() => setTransferAsset(null)}
          onSuccess={() => {
            loadData();
            loadBalances();
            if (wallet.account) wallet.connect();
          }}
        />
      )}

      {buyAsset && (
        <BuyModal
          asset={buyAsset}
          userBalance={userBalances[buyAsset.assetId] || 0}
          wallet={wallet}
          allAssets={assets}
          userBalances={userBalances}
          onClose={() => setBuyAsset(null)}
          onSuccess={() => {
            loadData();
            loadBalances();
            if (wallet.account) wallet.connect();
          }}
        />
      )}

      {multiUserOpen && (
        <MultiUserGuideModal wallet={wallet} onClose={() => setMultiUserOpen(false)} />
      )}

      {teammatesOpen && (
        <TeammatesHubModal onClose={() => setTeammatesOpen(false)} />
      )}
    </div>
  );
}
