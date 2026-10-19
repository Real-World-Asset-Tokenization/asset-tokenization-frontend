import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Wallet, ShieldCheck, RefreshCw, AlertTriangle, ExternalLink, User, Building, LogOut, LogIn, PlusCircle, Check } from "lucide-react";
import { checkAndSwitchNetwork, LOCAL_CHAIN_ID, getPaymentTokenBalance } from "../services/contractService";
import CurrencyPicker from "./CurrencyPicker";
import AddWalletModal from "./AddWalletModal";
import { useCurrency } from "../context/CurrencyContext";
import { useRole } from "../context/RoleContext";
import { useAuth } from "../context/AuthContext";
import { resolveUserWallet } from "../lib/walletResolver";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, linkWallet } = useAuth();
  const { currency, formatMUSD } = useCurrency();
  const { currentConfig, activeRole } = useRole();
  const [metaMaskAccount, setMetaMaskAccount] = useState("");
  const [mUsdBalance, setMUsdBalance] = useState(0);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [linking, setLinking] = useState(false);
  const [showAddWalletModal, setShowAddWalletModal] = useState(false);

  // Authoritative linked wallet on user account
  const userWallet = isAuthenticated
    ? (user?.walletAddress || resolveUserWallet(user) || "")
    : "";

  // The active Web3 wallet in the browser: MetaMask account if connected, else user's linked account wallet
  const activeWallet = metaMaskAccount || userWallet;
  const displayWallet = activeWallet;

  const isMismatch = Boolean(
    isAuthenticated &&
    userWallet &&
    metaMaskAccount &&
    userWallet.toLowerCase() !== metaMaskAccount.toLowerCase()
  );

  const isDisconnectedMM = Boolean(
    isAuthenticated &&
    userWallet &&
    !metaMaskAccount
  );

  const fetchBalance = useCallback(async (address) => {
    if (!address) {
      setMUsdBalance(0);
      return;
    }
    try {
      const bal = await getPaymentTokenBalance(address);
      setMUsdBalance(bal);
    } catch (err) {
      console.warn("Could not fetch balance:", err);
      setMUsdBalance(0);
    }
  }, []);

  const handleLogout = () => {
    logout();
    setMetaMaskAccount("");
    setMUsdBalance(0);
    navigate("/login");
  };

  useEffect(() => {
    checkConnection();
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", () => window.location.reload());
    }
    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      }
    };
  }, []);

  // Fetch balance whenever active wallet or route changes
  useEffect(() => {
    if (activeWallet) {
      fetchBalance(activeWallet);
    } else {
      setMUsdBalance(0);
    }
  }, [activeWallet, location.pathname, fetchBalance]);

  // Periodic poll & focus refresh so on-chain balance stays 100% accurate
  useEffect(() => {
    if (!activeWallet) return;
    const interval = setInterval(() => {
      fetchBalance(activeWallet);
    }, 6000);
    const onFocus = () => fetchBalance(activeWallet);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [activeWallet, fetchBalance]);

  const handleAccountsChanged = (accounts) => {
    const nextAcc = accounts && accounts.length > 0 ? accounts[0] : "";
    setMetaMaskAccount(nextAcc);
    const nextActive = nextAcc || userWallet;
    if (nextActive) {
      fetchBalance(nextActive);
    } else {
      setMUsdBalance(0);
    }
  };

  const checkConnection = async () => {
    if (!window.ethereum) return;
    try {
      const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
      const currentChainId = parseInt(chainIdHex, 16);
      setIsWrongNetwork(currentChainId !== LOCAL_CHAIN_ID);

      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts && accounts.length > 0) {
        setMetaMaskAccount(accounts[0]);
        fetchBalance(accounts[0]);
      } else {
        setMetaMaskAccount("");
        if (userWallet) fetchBalance(userWallet);
      }
    } catch (err) {
      console.warn("Connection check error:", err);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to interact with the blockchain.");
      return;
    }
    try {
      setConnecting(true);
      await checkAndSwitchNetwork();
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts && accounts.length > 0) {
        setMetaMaskAccount(accounts[0]);
        fetchBalance(accounts[0]);
      }
    } catch (err) {
      console.error("Wallet connection failed:", err);
    } finally {
      setConnecting(false);
    }
  };

  const handleLinkCurrentMetaMask = async () => {
    if (!metaMaskAccount) return;
    setLinking(true);
    try {
      await linkWallet(metaMaskAccount);
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Failed to link wallet to profile");
    } finally {
      setLinking(false);
    }
  };

  const switchMetaMaskAccount = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts && accounts.length > 0) {
        setMetaMaskAccount(accounts[0]);
      }
    } catch (err) {
      console.warn("Account switch request error:", err);
    }
  };

  // Nav links are strictly filtered based on the active user role view
  const navLinks = currentConfig.navLinks || [];

  const formatAddr = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <>
      <header className="sticky top-0 z-50 backdrop-blur-md bg-zinc-950/85 border-b border-zinc-800 text-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-lg text-white">RWA Platform</span>
              {isAuthenticated && (
                <span className={`hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded border ${currentConfig.bgBadge}`}>
                  {currentConfig.label}
                </span>
              )}
            </div>
          </Link>

          {/* Role-isolated Navigation: Only shows the active user's navigation links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-zinc-800 text-blue-400 border border-zinc-700/60 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Header Controls: Authenticated Role Badge, Currency Picker, Network, Wallet */}
          <div className="flex items-center gap-2">
            {/* Authenticated User Role Badge (Static, non-interactive - no dropdown switcher for real-system security) */}
            {isAuthenticated && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${currentConfig.bgBadge}`}
                title={`Logged in role: ${currentConfig.label}`}
              >
                {activeRole === "asset_owner" ? (
                  <Building className="w-3.5 h-3.5" />
                ) : activeRole === "admin" ? (
                  <ShieldCheck className="w-3.5 h-3.5" />
                ) : (
                  <User className="w-3.5 h-3.5" />
                )}
                <span>{currentConfig.label}</span>
              </div>
            )}

            {/* Global Currency Picker */}
            <CurrencyPicker />

            {isWrongNetwork && (
              <button
                onClick={checkAndSwitchNetwork}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/20"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Switch Network (31337)
              </button>
            )}

            {isAuthenticated ? (
              displayWallet ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex flex-col text-right whitespace-nowrap">
                    <span className="text-xs text-zinc-400">Balance</span>
                    <span className="text-xs font-semibold text-emerald-400">
                      {mUsdBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} mUSD
                    </span>
                    {currency !== "USD" && (
                      <span className="text-[10px] text-zinc-400 font-mono whitespace-nowrap">
                        ≈ {formatMUSD(mUsdBalance)}
                      </span>
                    )}
                  </div>
                  <div
                    onClick={isMismatch ? switchMetaMaskAccount : (isDisconnectedMM ? connectWallet : undefined)}
                    className={`flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border rounded-lg text-xs font-mono transition-all ${
                      isMismatch
                        ? "border-amber-500/40 text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                        : isDisconnectedMM
                        ? "border-zinc-700 text-zinc-400 hover:bg-zinc-800 cursor-pointer"
                        : "border-zinc-800 text-zinc-300"
                    }`}
                    title={
                      isMismatch
                        ? `MetaMask is currently on ${formatAddr(metaMaskAccount)}. Click to switch MetaMask to your logged-in wallet (${formatAddr(displayWallet)}).`
                        : isDisconnectedMM
                        ? "MetaMask is not connected. Click to connect."
                        : "Your authenticated wallet (MetaMask is synced)"
                    }
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isMismatch
                          ? "bg-amber-400"
                          : isDisconnectedMM
                          ? "bg-zinc-500"
                          : "bg-emerald-400 animate-pulse"
                      }`}
                    ></div>
                    <span>{formatAddr(displayWallet)}</span>
                    {isMismatch && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded font-sans uppercase font-bold">
                        Sync MM
                      </span>
                    )}
                    {isDisconnectedMM && (
                      <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 py-0.5 rounded font-sans uppercase font-bold">
                        Connect MM
                      </span>
                    )}
                  </div>

                  {/* 1-click button to save active MetaMask wallet as account wallet */}
                  {metaMaskAccount && (!userWallet || isMismatch) && (
                    <button
                      onClick={handleLinkCurrentMetaMask}
                      disabled={linking}
                      className="hidden md:flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg transition-all cursor-pointer"
                      title={`Set ${formatAddr(metaMaskAccount)} as your official account wallet`}
                    >
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>{linking ? "Linking..." : "Link to Account"}</span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  id="navbar-add-wallet-btn"
                  onClick={() => setShowAddWalletModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] cursor-pointer"
                  title="Link an Ethereum wallet address to your account"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Wallet</span>
                </button>
              )
            ) : null}
          </div>

          {/* Auth Control: Logout / Login Button */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-800">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="hidden xl:inline-block text-[11px] text-zinc-400 font-medium max-w-[90px] truncate" title={user?.email}>
                  {user?.name || user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 rounded-xl transition-all cursor-pointer shadow-sm"
                  title="Log out of account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5 text-blue-400" />
                  <span>Login</span>
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all cursor-pointer shadow-sm shadow-blue-500/20"
                >
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Add Wallet Modal */}
      <AddWalletModal
        isOpen={showAddWalletModal}
        onClose={() => setShowAddWalletModal(false)}
      />
    </>
  );
}
