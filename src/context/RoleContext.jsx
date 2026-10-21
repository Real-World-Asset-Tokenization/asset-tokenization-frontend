import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

const RoleContext = createContext(undefined);

export const ROLES = {
  INVESTOR: "investor",
  ASSET_OWNER: "asset_owner",
  ADMIN: "admin"
};

export const ROLE_CONFIGS = {
  investor: {
    id: "investor",
    label: "Investor",
    badgeLabel: "Investor View",
    iconName: "User",
    color: "from-blue-600 to-cyan-600",
    textColor: "text-blue-400",
    bgBadge: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    description: "Browse marketplace, purchase fractional property shares.",
    defaultRoute: "/marketplace",
    dashboardRoute: "/dashboard/investor",
    navLinks: [
      { name: "Marketplace", path: "/marketplace" },
      { name: "My Portfolio", path: "/portfolio" },
      { name: "Investment Returns", path: "/profit-dashboard" },
      { name: "Dashboard", path: "/dashboard/investor" }
    ]
  },
  asset_owner: {
    id: "asset_owner",
    label: "Asset Owner",
    badgeLabel: "Asset Owner View",
    iconName: "Building",
    color: "from-emerald-600 to-teal-600",
    textColor: "text-emerald-400",
    bgBadge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    description: "Register real estate deeds, view authority verification status, and proceed to the Tokenization Module for fractional blockchain issuance.",
    defaultRoute: "/dashboard/asset-owner",
    dashboardRoute: "/dashboard/asset-owner",
    navLinks: [
      { name: "Dashboard", path: "/dashboard/asset-owner" },
      { name: "My Assets", path: "/owner/assets" },
      { name: "Tokenization", path: "/verified-assets" },
      { name: "Holdings & Valuations", path: "/owner/portfolio" },
      { name: "Marketplace", path: "/marketplace" }
    ]
  },
  admin: {
    id: "admin",
    label: "Admin / Operator",
    badgeLabel: "Admin View",
    iconName: "Shield",
    color: "from-purple-600 to-indigo-600",
    textColor: "text-purple-400",
    bgBadge: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    description: "Review owners and properties, approve valuations, and monitor gas costs.",
    defaultRoute: "/admin",
    dashboardRoute: "/admin",
    navLinks: [
      { name: "Property Revaluation", path: "/valuations/revalue" },
      { name: "Valuation Approvals", path: "/valuations/approvals" },
      { name: "User KYC Review", path: "/dashboard/admin" },
      { name: "Gas Fee Analytics", path: "/gas-analytics" }
    ]
  }
};

const resolveRoleKey = (user) => {
  if (!user || !user.role) return ROLES.INVESTOR;
  let mapped = (user.role || "").toLowerCase();
  if (mapped === "compliance_officer") mapped = ROLES.ADMIN;
  return ROLE_CONFIGS[mapped] ? mapped : ROLES.INVESTOR;
};

export function RoleProvider({ children }) {
  const { user } = useAuth();
  const [activeRole, setActiveRole] = useState(() => resolveRoleKey(user));

  // Role strictly tracks authenticated user role for real-system security
  useEffect(() => {
    setActiveRole(resolveRoleKey(user));
  }, [user]);

  // Arbitrary role switching is disabled for security; role is strictly governed by the authenticated user account
  const switchRole = (newRole) => {
    console.warn("Security notice: In a production system, role switching is disabled. The active role is strictly governed by the authenticated user account:", user?.role);
  };

  const currentConfig = ROLE_CONFIGS[activeRole] || ROLE_CONFIGS.investor;

  return (
    <RoleContext.Provider
      value={{
        activeRole,
        switchRole,
        currentConfig,
        roleConfigs: ROLE_CONFIGS,
        isInvestor: activeRole === ROLES.INVESTOR,
        isAssetOwner: activeRole === ROLES.ASSET_OWNER,
        isAdmin: activeRole === ROLES.ADMIN
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
