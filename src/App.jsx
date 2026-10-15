import React, { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import InvestorDashboard from "./pages/InvestorDashboard";
import AssetOwnerDashboard from "./pages/AssetOwnerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ComplianceDashboard from "./pages/ComplianceDashboard";

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState("login"); // login | register | dashboard

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setCurrentPage("dashboard");
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentPage("dashboard");
  };

  const handleRegister = (userData) => {
    setUser(userData);
    setCurrentPage("dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage("login");
  };

  const renderDashboard = () => {
    switch (user?.role) {
      case "investor":
        return <InvestorDashboard user={user} onLogout={handleLogout} />;
      case "asset_owner":
        return <AssetOwnerDashboard user={user} onLogout={handleLogout} />;
      case "admin":
        return <AdminDashboard user={user} onLogout={handleLogout} />;
      case "compliance_officer":
        return <ComplianceDashboard user={user} onLogout={handleLogout} />;
      default:
        return <InvestorDashboard user={user} onLogout={handleLogout} />;
    }
  };

  if (currentPage === "login") {
    return (
      <LoginPage
        onLogin={handleLogin}
        onNavigateToRegister={() => setCurrentPage("register")}
      />
    );
  }

  if (currentPage === "register") {
    return (
      <RegisterPage
        onRegister={handleRegister}
        onNavigateToLogin={() => setCurrentPage("login")}
      />
    );
  }

  if (currentPage === "dashboard" && user) {
    return renderDashboard();
  }

  return null;
}
