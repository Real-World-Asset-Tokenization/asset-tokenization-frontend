import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import InvestorDashboard from './pages/dashboard/InvestorDashboard';
import AssetOwnerDashboard from './pages/dashboard/AssetOwnerDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import ComplianceOfficerDashboard from './pages/dashboard/ComplianceOfficerDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard/investor" element={<InvestorDashboard />} />
          <Route path="/dashboard/asset-owner" element={<AssetOwnerDashboard />} />
          <Route path="/dashboard/admin" element={<AdminDashboard />} />
          <Route path="/dashboard/compliance-officer" element={<ComplianceOfficerDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
