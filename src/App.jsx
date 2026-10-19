import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RoleProvider } from './context/RoleContext';
import { CurrencyProvider } from './context/CurrencyContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import InvestorDashboard from './pages/dashboard/InvestorDashboard';
import AssetOwnerDashboard from './pages/dashboard/AssetOwnerDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';

import Marketplace from './pages/Marketplace';
import Portfolio from './pages/Portfolio';
import ProfitDashboard from './pages/ProfitDashboard';
import ProfitClaims from './pages/ProfitClaims';
import AdminDistributions from './pages/AdminDistributions';
import GasAnalytics from './pages/GasAnalytics';
import VerifiedAssets from './pages/VerifiedAssets';
import TokenizationPreview from './pages/TokenizationPreview';
import TokenizationStatus from './pages/TokenizationStatus';
import OwnerPortfolio from './pages/OwnerPortfolio';

function App() {
  return (
    <AuthProvider>
      <RoleProvider>
        <CurrencyProvider>
          <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/owner/portfolio" element={<OwnerPortfolio />} />
            <Route path="/verified-assets" element={<VerifiedAssets />} />
            <Route path="/tokenization/preview/:assetId" element={<TokenizationPreview />} />
            <Route path="/tokenization/status/:assetId" element={<TokenizationStatus />} />
            <Route path="/profit-dashboard" element={<ProfitDashboard />} />
            <Route path="/claims" element={<ProfitClaims />} />
            <Route path="/admin/distributions" element={<AdminDistributions />} />
            <Route path="/gas-analytics" element={<GasAnalytics />} />
            <Route path="/dashboard/investor" element={<InvestorDashboard />} />
            <Route path="/dashboard/asset-owner" element={<AssetOwnerDashboard />} />
            <Route path="/dashboard/admin" element={<AdminDashboard />} />
            <Route path="/dashboard/compliance-officer" element={<Navigate to="/dashboard/admin" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </CurrencyProvider>
    </RoleProvider>
  </AuthProvider>
  );
}

export default App;
