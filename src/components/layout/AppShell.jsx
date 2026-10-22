import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Hexagon, LayoutDashboard, ShieldCheck, Activity, Building2, PlusCircle, Coins, Wallet,
  ShoppingBag, Search, PanelLeftClose, PanelLeftOpen, Menu, X, LogOut, ChevronDown,
  TrendingUp, Gift, Users, Scale, ClipboardCheck, Banknote, Fuel, Tag, Sun, Moon, Settings, Gavel,
} from "lucide-react";
import Navbar from "../Navbar";
import { ShellContext } from "./shellContext";
import { useAuth } from "../../context/AuthContext";
import { useRole } from "../../context/RoleContext";

// Every item links to a page that exists. Design items with no backing feature
// (notifications, settings, SPV management, bank accounts) are intentionally absent.
const NAV_BY_ROLE = {
  asset_owner: {
    home: "/dashboard/asset-owner",
    search: { placeholder: "Search your assets…", to: "/owner/assets" },
    groups: [
      { title: "Overview", items: [{ to: "/dashboard/asset-owner", label: "Dashboard", icon: LayoutDashboard }] },
      { title: "Verification", items: [
        { to: "/owner/kyc", label: "Complete KYC", icon: ShieldCheck },
        { to: "/owner/kyc/status", label: "KYC Status", icon: Activity },
      ] },
      { title: "Assets", items: [
        { to: "/owner/assets", label: "My Assets", icon: Building2 },
        { to: "/owner/assets/new", label: "Submit Asset", icon: PlusCircle },
        { to: "/verified-assets", label: "Tokenization", icon: Coins },
        { to: "/owner/release", label: "Release Tokens", icon: Tag },
        { to: "/owner/portfolio", label: "Holdings & Valuations", icon: Wallet },
        { to: "/marketplace", label: "Marketplace", icon: ShoppingBag },
        { to: "/sales", label: "Property Sales", icon: Gavel },
      ] },
      { title: "Account", items: [{ to: "/settings", label: "Settings", icon: Settings }] },
    ],
  },
  investor: {
    home: "/dashboard/investor",
    search: { placeholder: "Search properties…", to: "/marketplace" },
    groups: [
      { title: "Overview", items: [{ to: "/dashboard/investor", label: "Dashboard", icon: LayoutDashboard }] },
      { title: "Invest", items: [
        { to: "/marketplace", label: "Marketplace", icon: ShoppingBag },
        { to: "/portfolio", label: "My Portfolio", icon: Wallet },
        { to: "/sales", label: "Property Sales", icon: Gavel },
      ] },
      { title: "Returns", items: [
        { to: "/profit-dashboard", label: "Returns", icon: TrendingUp },
      ] },
      { title: "Account", items: [
        { to: "/investor/kyc", label: "KYC Verification", icon: ShieldCheck },
        { to: "/settings", label: "Settings", icon: Settings },
      ] },
    ],
  },
  admin: {
    home: "/admin",
    search: { placeholder: "Search users or assets…", to: "/dashboard/admin" },
    groups: [
      { title: "Overview", items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
      { title: "Review", items: [{ to: "/dashboard/admin", label: "KYC & Asset Review", icon: Users }] },
      { title: "Valuation", items: [
        { to: "/valuations/revalue", label: "Property Revaluation", icon: Scale },
        { to: "/valuations/approvals", label: "Valuation Approvals", icon: ClipboardCheck },
      ] },
      { title: "Operations", items: [
        { to: "/sales", label: "Property Sales", icon: Gavel },
        { to: "/gas-analytics", label: "Gas Analytics", icon: Fuel, adminOnly: true },
        { to: "/marketplace", label: "Marketplace", icon: ShoppingBag },
      ] },
      { title: "Account", items: [{ to: "/settings", label: "Settings", icon: Settings }] },
    ],
  },
};

const initials = (name = "") => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const { currentConfig, activeRole } = useRole();
  const config = NAV_BY_ROLE[activeRole] || NAV_BY_ROLE.investor;
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("app_sidebar_collapsed") === "1"; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("app_theme") === "light" ? "light" : "dark"; } catch { return "dark"; }
  });
  const searchRef = useRef(null);

  useEffect(() => { setMobileOpen(false); setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    try { localStorage.setItem("app_sidebar_collapsed", collapsed ? "1" : "0"); } catch { /* storage unavailable */ }
  }, [collapsed]);
  useEffect(() => {
    try { localStorage.setItem("app_theme", theme); } catch { /* storage unavailable */ }
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  // The Settings page changes the theme through this event.
  useEffect(() => {
    const onTheme = (e) => setTheme(e.detail === "light" ? "light" : "dark");
    window.addEventListener("app-theme", onTheme);
    return () => window.removeEventListener("app-theme", onTheme);
  }, []);
  // Ctrl/Cmd + K focuses search.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const search = (e) => {
    e.preventDefault();
    navigate(`${config.search.to}${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`);
  };
  const signOut = () => { logout(); navigate("/login"); };

  const sidebar = (isMobile) => (
    <aside className={`flex flex-col h-full bg-[#0a1022] border-r border-[#1b2440] ${isMobile ? "w-72" : collapsed ? "w-[76px]" : "w-64"} transition-[width] duration-200`}>
      <Link to="/" aria-label="TerraToken home" className="h-16 shrink-0 flex items-center gap-3 px-4 border-b border-[#1b2440]">
        <span className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0"><Hexagon className="w-5 h-5 text-white" /></span>
        {(!collapsed || isMobile) && (
          <span className="leading-tight">
            <span className="block font-bold tracking-tight text-white">TerraToken</span>
            <span className="block text-[11px] tracking-wide text-[#98a2c3]">RWA Tokenization</span>
          </span>
        )}
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Main">
        {config.groups.map((group) => (
          <div key={group.title}>
            {(!collapsed || isMobile) && <p className="px-3 mb-2 text-[11px] font-semibold tracking-widest text-[#6b7599] uppercase">{group.title}</p>}
            <ul className="space-y-1">
              {group.items.filter((item) => !item.adminOnly || user?.role === "admin").map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to !== "/owner/release"}
                    title={collapsed && !isMobile ? label : undefined}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive ? "bg-indigo-600/15 text-white" : "text-[#98a2c3] hover:bg-[#141c33] hover:text-white"
                      } ${collapsed && !isMobile ? "justify-center" : ""}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-indigo-400" />}
                        <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-indigo-300" : ""}`} />
                        {(!collapsed || isMobile) && <span>{label}</span>}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-[#1b2440] p-3 space-y-2">
        {(!collapsed || isMobile) && (
          <div className="rounded-xl border border-[#1b2440] bg-[#0e1426] px-3 py-2.5">
            <p className="text-[10px] font-semibold tracking-widest text-[#6b7599] uppercase">Signed in as</p>
            <p className="text-sm font-semibold text-white truncate">{currentConfig.label}</p>
          </div>
        )}
        {!isMobile && (
          <button onClick={() => setCollapsed((c) => !c)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[#c3cae2] hover:bg-[#141c33] ${collapsed ? "justify-center" : ""}`}>
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <ShellContext.Provider value={true}>
      <div className={`app-shell theme-${theme} min-h-screen flex text-zinc-100`}>
        <a href="#main" className="skip-link">Skip to content</a>
        <div className="hidden lg:block sticky top-0 h-screen shrink-0">{sidebar(false)}</div>

        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="h-full">{sidebar(true)}</div>
            <button aria-label="Close menu" className="flex-1 bg-black/60" onClick={() => setMobileOpen(false)} />
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-40 h-16 flex items-center gap-3 px-4 sm:px-6 border-b border-[#1b2440] bg-[#070b18]/90 backdrop-blur" style={{ top: "env(safe-area-inset-top, 0px)" }}>
            <button className="lg:hidden p-2 rounded-lg hover:bg-[#141c33]" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>

            <form onSubmit={search} className="flex-1 max-w-xl relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7599]" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={config.search.placeholder}
                className="w-full pl-9 pr-14 py-2 rounded-xl bg-[#0e1426] border border-[#1b2440] text-sm text-white placeholder:text-[#6b7599] focus:outline-none focus:border-indigo-500"
              />
              {query ? (
                <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7599]" aria-label="Clear search"><X className="w-4 h-4" /></button>
              ) : (
                <kbd className="hidden sm:block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded border border-[#29345a] text-[#6b7599]">Ctrl K</kbd>
              )}
            </form>

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#1b2440] bg-[#0e1426] text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />{currentConfig.label}
              </span>
              <button
                type="button"
                onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")}
                className="p-2 rounded-xl border border-[#1b2440] bg-[#0e1426] text-[#c3cae2] hover:bg-[#141c33] hover:text-white"
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <div className="hidden sm:block"><Navbar embedded /></div>
              <div className="relative">
                <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-1" aria-haspopup="menu" aria-expanded={menuOpen}>
                  <span className="w-9 h-9 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center">{initials(user?.name)}</span>
                  <ChevronDown className="w-4 h-4 text-[#98a2c3] hidden sm:block" />
                </button>
                {menuOpen && (
                  <div role="menu" className="rise absolute right-0 mt-2 w-60 rounded-xl border border-[#1b2440] bg-[#0e1426] shadow-[var(--shadow-pop)] p-2 text-sm">
                    <p className="px-3 pt-1 font-semibold text-white truncate">{user?.name}</p>
                    <p className="px-3 pb-2 text-xs text-[#98a2c3] truncate border-b border-[#1b2440]">{user?.email}</p>
                    <div className="sm:hidden py-2 border-b border-[#1b2440]"><Navbar embedded /></div>
                    <button role="menuitem" onClick={signOut} className="w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-rose-300 hover:bg-[#141c33]">
                      <LogOut className="w-4 h-4" /> Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main id="main" tabIndex={-1} className="flex-1 min-w-0 outline-none">{children}</main>
        </div>
      </div>
    </ShellContext.Provider>
  );
}
