import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoleProvider } from './context/RoleContext';
import { CurrencyProvider } from './context/CurrencyContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import InvestorDashboard from './pages/dashboard/InvestorDashboard';
import AssetOwnerDashboard from './pages/dashboard/AssetOwnerDashboard';
import OwnerAssets from './pages/owner/OwnerAssets';
import OwnerAssetDetail from './pages/owner/OwnerAssetDetail';
import OwnerHome from './pages/dashboard/OwnerHome';
import InvestorHome from './pages/dashboard/InvestorHome';
import AdminHome from './pages/dashboard/AdminHome';
import AdminDashboard from './pages/dashboard/AdminDashboard';

import Marketplace from './pages/Marketplace';
import CreateListing from './pages/marketplace/CreateListing';
import ReleaseTokens from './pages/owner/ReleaseTokens';
import Portfolio from './pages/Portfolio';
import ProfitDashboard from './pages/ProfitDashboard';
import GasAnalytics from './pages/GasAnalytics';
import PropertySales from './pages/PropertySales';
import VerifiedAssets from './pages/VerifiedAssets';
import TokenizationPreview from './pages/TokenizationPreview';
import TokenizationStatus from './pages/TokenizationStatus';
import OwnerPortfolio from './pages/OwnerPortfolio';
import PropertyRevaluation from './pages/PropertyRevaluation';
import ValuationApprovals from './pages/ValuationApprovals';
import Settings from './pages/Settings';
import AppShell from './components/layout/AppShell';

const PUBLIC_PATHS = ['/', '/login', '/register'];

// Every signed-in role gets the sidebar workspace; public pages keep the top bar.
function AppRoutes() {
  const { isAuthenticated, user } = useAuth();
  const { pathname } = useLocation();

  const routes = (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/marketplace/sell" element={<CreateListing />} />
      <Route path="/owner/release" element={<ReleaseTokens />} />
      <Route path="/owner/release/:assetId" element={<CreateListing mode="release" />} />
      <Route path="/marketplace/assets/:assetId" element={<Marketplace />} />
      <Route path="/portfolio" element={<Portfolio />} />
      <Route path="/owner/portfolio" element={<OwnerPortfolio />} />
      <Route path="/owner/assets" element={<OwnerAssets />} />
      <Route path="/owner/assets/new" element={<AssetOwnerDashboard view="assets" openNew />} />
      <Route path="/owner/assets/:assetId" element={<OwnerAssetDetail />} />
      <Route path="/owner/kyc" element={<AssetOwnerDashboard view="kyc" />} />
      <Route path="/owner/kyc/status" element={<AssetOwnerDashboard view="kycStatus" />} />
      <Route path="/verified-assets" element={<VerifiedAssets />} />
      <Route path="/tokenization/preview/:assetId" element={<TokenizationPreview />} />
      <Route path="/tokenization/status/:assetId" element={<TokenizationStatus />} />
      <Route path="/profit-dashboard" element={<ProfitDashboard />} />
      <Route path="/sales" element={<PropertySales />} />
      <Route path="/gas-analytics" element={user?.role === 'admin' ? <GasAnalytics /> : <Navigate to="/login" replace />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/valuations/revalue" element={<PropertyRevaluation />} />
      <Route path="/valuations/approvals" element={<ValuationApprovals />} />
      <Route path="/dashboard/investor" element={<InvestorHome />} />
      <Route path="/investor/kyc" element={<InvestorDashboard view="kyc" />} />
      <Route path="/investor/portal" element={<InvestorDashboard />} />
      <Route path="/dashboard/asset-owner" element={<OwnerHome />} />
      <Route path="/admin" element={<AdminHome />} />
      <Route path="/dashboard/admin" element={<AdminDashboard />} />
      <Route path="/dashboard/compliance-officer" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

  if (isAuthenticated && !PUBLIC_PATHS.includes(pathname)) {
    return <AppShell>{routes}</AppShell>;
  }
  return routes;
}

function App() {
  return (
    <AuthProvider>
      <RoleProvider>
        <CurrencyProvider>
          <Router>
            <AppRoutes />
          </Router>
        </CurrencyProvider>
      </RoleProvider>
    </AuthProvider>
  );
}

export default App;
