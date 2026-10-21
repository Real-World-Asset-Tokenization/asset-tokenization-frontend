import { useState, useEffect, useCallback, useRef, useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Wallet, ShieldCheck, RefreshCw, AlertTriangle, ExternalLink, User, Building, LogOut, LogIn, PlusCircle, Check } from "lucide-react";
import { checkAndSwitchNetwork, LOCAL_CHAIN_ID, getPaymentTokenBalance, selectLinkedWallet, walletImportHelp } from "../services/contractService";
import CurrencyPicker from "./CurrencyPicker";
import AddWalletModal from "./AddWalletModal";
import { useCurrency } from "../context/CurrencyContext";
import { useRole } from "../context/RoleContext";
import { useAuth } from "../context/AuthContext";
import { resolveUserWallet, sameWallet } from "../lib/walletResolver";
import { authAPI } from "../lib/api";
import { ShellContext } from "./layout/shellContext";

const formatAddr = (addr) => (addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "");

// Inside the asset-owner workspace the sidebar layout replaces this top bar; pages
// still render <Navbar /> and it simply steps aside. The workspace top bar renders
// <Navbar embedded /> to reuse the wallet, network and currency controls.
export default function Navbar({ embedded = false }) {
  const inShell = useContext(ShellContext);
  if (inShell && !embedded) return null;
  return <NavbarInner embedded={embedded} />;
}

function NavbarInner({ embedded }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, linkWallet } = useAuth();
  const { currency, formatMUSD } = useCurrency();
  const { currentConfig, activeRole } = useRole();
  const [metaMaskAccount, setMetaMaskAccount] = useState("");
  const [mUsdBalance, setMUsdBalance] = useState(null);
  const [balanceError, setBalanceError] = useState("");
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showAddWalletModal, setShowAddWalletModal] = useState(false);

  // The wallet saved on the signed-in account is the only wallet the header shows.
  // MetaMask is just the signer and must be on that same address.
  const userWallet = isAuthenticated ? (resolveUserWallet(user) || "") : "";
  const activeWallet = userWallet;
  const walletRef = useRef(activeWallet);
  walletRef.current = activeWallet;

  // Whose wallet MetaMask is currently on: "yours" | "other_user" | "unlinked" | null (unknown).
  const [mmOwner, setMmOwner] = useState(null);
  const [walletError, setWalletError] = useState("");
  const [dismissedKey, setDismissedKey] = useState("");
  // Errors appear only after the user tries to connect, never on page load.
  const triedConnect = useRef(false);

  const mmConnected = Boolean(metaMaskAccount);
  const isSynced = Boolean(userWallet && mmConnected && sameWallet(userWallet, metaMaskAccount));
  const isMismatch = Boolean(userWallet && mmConnected && !isSynced);
  const mmBelongsToOther = mmConnected && !isSynced && mmOwner === "other_user";

  // Ask the backend whether the MetaMask account belongs to another user of the system.
  useEffect(() => {
    let cancelled = false;
    setMmOwner(null);
    if (!isAuthenticated || !metaMaskAccount || sameWallet(userWallet, metaMaskAccount)) return;
    authAPI.checkWallet(metaMaskAccount.toLowerCase())
      .then((r) => { if (!cancelled) setMmOwner(r.data?.data?.status || null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isAuthenticated, metaMaskAccount, userWallet]);

  // After a connect attempt, explain why another user's wallet was not accepted.
  useEffect(() => {
    if (mmBelongsToOther && triedConnect.current) {
      setWalletError(
        "The account selected in MetaMask is linked to another user in this system. " +
        (userWallet ? "Select your own wallet in MetaMask, then click Connect wallet." : "Choose a wallet that is not used by another account.")
      );
    } else if (isSynced || !mmConnected) {
      setWalletError("");
    }
  }, [mmBelongsToOther, isSynced, mmConnected, metaMaskAccount, userWallet]);

  const fetchBalance = useCallback(async (address) => {
    if (!address) {
      setMUsdBalance(0);
      return;
    }
    try {
      const bal = await getPaymentTokenBalance(address, { throwOnError: true });
      if (walletRef.current === address) {
        setMUsdBalance(bal);
        setBalanceError("");
      }
    } catch (err) {
      console.warn("Could not fetch balance:", err);
      if (walletRef.current === address) {
        setMUsdBalance(null);
        setBalanceError(err.code === "PAYMENT_TOKEN_NOT_DEPLOYED" ? "Local chain needs setup" : "Balance unavailable");
      }
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
    setMUsdBalance(null);
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
    // If MetaMask shares several accounts, prefer the one saved on this login.
    const nextAcc = accounts?.find((a) => sameWallet(walletRef.current, a)) || accounts?.[0] || "";
    setMetaMaskAccount(nextAcc);
  };

  const checkConnection = async () => {
    if (!window.ethereum) return;
    try {
      const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
      const currentChainId = parseInt(chainIdHex, 16);
      setIsWrongNetwork(currentChainId !== LOCAL_CHAIN_ID);

      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      setMetaMaskAccount(accounts?.find((a) => sameWallet(walletRef.current, a)) || accounts?.[0] || "");
    } catch (err) {
      console.warn("Connection check error:", err);
    }
  };

  const connectWallet = async () => {
    triedConnect.current = true;
    if (!window.ethereum) {
      // No MetaMask: let the user type the address instead.
      if (!userWallet) setShowAddWalletModal(true);
      else setWalletError("MetaMask is not installed in this browser.");
      return;
    }
    try {
      setConnecting(true);
      await checkAndSwitchNetwork();
      setWalletError("");
      // With a saved wallet, open MetaMask's account chooser (plain eth_requestAccounts would just
      // return the account MetaMask already shares and never let the user switch).
      const accounts = userWallet
        ? await selectLinkedWallet(userWallet)
        : await window.ethereum.request({ method: "eth_requestAccounts" });
      const picked = accounts?.find((a) => sameWallet(userWallet, a)) || accounts?.[0];
      if (!picked) return;
      setMetaMaskAccount(picked);
      if (userWallet) {
        if (!sameWallet(userWallet, picked)) {
          setWalletError("MetaMask is on a different account than this login.");
        }
        return;
      }
      // First connection: save this wallet on the account so future logins show it automatically.
      const owner = await authAPI.checkWallet(picked.toLowerCase()).then((res) => res.data?.data?.status).catch(() => null);
      if (owner === "other_user") {
        setWalletError("This MetaMask account is already linked to another user in this system. Select a different account in MetaMask.");
        return;
      }
      await linkWallet(picked);
    } catch (err) {
      console.error("Wallet connection failed:", err);
      setWalletError(err.code === -32002
        ? "MetaMask already has a request open. Click the MetaMask icon to finish it."
        : err.code === 4001 ? "Connection was cancelled in MetaMask." : (err.response?.data?.message || err.message || "Could not connect MetaMask."));
    } finally {
      setConnecting(false);
    }
  };

  const switchMetaMaskAccount = async () => {
    triedConnect.current = true;
    if (!window.ethereum) return;
    try {
      setWalletError("");
      let accounts;
      if (userWallet) {
        accounts = await selectLinkedWallet(userWallet);
      } else {
        await window.ethereum.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
        accounts = await window.ethereum.request({ method: "eth_accounts" });
      }
      if (accounts && accounts.length > 0) {
        const picked = accounts.find((a) => sameWallet(userWallet, a)) || accounts[0];
        setMetaMaskAccount(picked);
        setWalletError(userWallet && !sameWallet(userWallet, picked)
          ? "MetaMask is still on a different account. Tick the wallet linked to this login."
          : "");
      }
    } catch (err) {
      console.warn("Account switch request error:", err);
      setWalletError(err?.message || "Could not switch the MetaMask account.");
    }
  };

  // Nav links are strictly filtered based on the active user role view
  const navLinks = currentConfig.navLinks || [];


  const controls = (
    <>
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
              <div className="relative flex items-center gap-2">
                {userWallet ? (
                  <>
                    <div className="hidden sm:flex flex-col text-right whitespace-nowrap">
                      <span className="text-xs text-zinc-400">Demo balance</span>
                      <span className="text-xs font-semibold text-emerald-400">
                        {mUsdBalance == null ? (balanceError || "Loading balance…") : formatMUSD(mUsdBalance, { showCode: true })}
                      </span>
                    </div>

                    {/* The wallet saved on this account is always shown. If MetaMask is not
                        connected to it yet, the chip doubles as the connect button. */}
                    <button
                      type="button"
                      onClick={isSynced ? undefined : isMismatch ? switchMetaMaskAccount : connectWallet}
                      disabled={connecting}
                      className={`flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 ${isSynced ? "cursor-default" : "hover:bg-zinc-800 cursor-pointer"}`}
                      title={isSynced ? `Connected in MetaMask: ${userWallet}` : `Your wallet ${userWallet}. Click to connect it in MetaMask.`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isSynced ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
                      <span>{formatAddr(userWallet)}</span>
                      {!isSynced && (
                        <span className="font-sans text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                          {connecting ? "…" : "Connect"}
                        </span>
                      )}
                    </button>
                  </>
                ) : (
                  // No wallet saved yet: connecting MetaMask once saves it on the account.
                  <button
                    id="navbar-add-wallet-btn"
                    onClick={connectWallet}
                    disabled={connecting}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-60"
                    title="Connect MetaMask and save the wallet on your account"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>{connecting ? "Connecting…" : "Connect wallet"}</span>
                  </button>
                )}

                {(() => {
                  const key = `${metaMaskAccount}|${userWallet}`;
                  const wrongAccount = Boolean(userWallet && mmConnected && !isSynced);
                  if (!(walletError || wrongAccount) || dismissedKey === key) return null;
                  return (
                    <div role="alert" className="absolute right-0 top-full mt-2 z-50 w-72 max-w-[calc(100vw-2rem)] p-3 rounded-xl border border-rose-500/40 bg-zinc-950 text-xs text-rose-200 shadow-xl">
                      <div className="flex gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span className="flex-1 leading-snug">
                          {walletError || "MetaMask is on a different account than this login."}
                          {userWallet && <span className="block mt-1 text-zinc-400">This login uses <span className="font-mono text-zinc-200">{formatAddr(userWallet)}</span>.</span>}
                        </span>
                        <button onClick={() => { setWalletError(""); setDismissedKey(key); }} className="text-zinc-400 hover:text-white cursor-pointer" aria-label="Dismiss">×</button>
                      </div>
                      {userWallet && (
                        <button onClick={switchMetaMaskAccount} className="mt-3 w-full px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold cursor-pointer">
                          Change account
                        </button>
                      )}
                      <details className="mt-2 text-zinc-400">
                        <summary className="cursor-pointer hover:text-white">Account not in MetaMask?</summary>
                        <p className="mt-1 leading-snug">{walletImportHelp}</p>
                      </details>
                    </div>
                  );
                })()}
              </div>
            ) : null}
    </>
  );

  if (embedded) {
    return (
      <>
        <div className="flex items-center gap-2">{controls}</div>
        <AddWalletModal isOpen={showAddWalletModal} onClose={() => setShowAddWalletModal(false)} />
      </>
    );
  }

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

            {controls}
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
