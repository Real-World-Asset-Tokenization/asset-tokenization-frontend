import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Copy, KeyRound, LogOut, Moon, RefreshCw, ShieldCheck, Sun, Wallet } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import { useCurrency } from "../context/CurrencyContext";
import { authAPI } from "../lib/api";
import { resolveUserWallet, sameWallet } from "../lib/walletResolver";
import { LOCAL_CHAIN_HEX, checkAndSwitchNetwork, getPaymentTokenBalance, selectLinkedWallet, walletImportHelp } from "../services/contractService";
import CurrencyPicker from "../components/CurrencyPicker";
import AddWalletModal from "../components/AddWalletModal";
import { Card, PageHeader, ActionButton, Badge, cardClass, fmtDate, pageClass } from "../components/ui/dash";

const KYC_LINK = { investor: "/investor/kyc", asset_owner: "/owner/kyc/status" };
const TAKEN_MSG = "This wallet is already linked to another user in this system. Each wallet can belong to only one account.";

const Row = ({ label, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-6 py-3 border-b border-white/5 last:border-0">
    <dt className="text-sm text-[#a1a1aa] shrink-0">{label}</dt>
    <dd className="text-sm font-medium text-white sm:text-right min-w-0 break-all">{children}</dd>
  </div>
);

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout, linkWallet } = useAuth();
  const { currentConfig, activeRole } = useRole();
  const { formatMUSD } = useCurrency();
  const linked = resolveUserWallet(user);

  const [profile, setProfile] = useState(null);
  const [mmAccount, setMmAccount] = useState(null);
  const [chainOk, setChainOk] = useState(null);
  const [balance, setBalance] = useState(null);
  const [busy, setBusy] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState(null); // { tone: "good" | "bad", text }
  const [manualOpen, setManualOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("app_theme") === "light" ? "light" : "dark"; } catch { return "dark"; }
  });

  useEffect(() => {
    let cancelled = false;
    authAPI.getMe().then((r) => { if (!cancelled) setProfile(r.data?.data?.user || null); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Which MetaMask account and network are active right now.
  const readWallet = useCallback(async () => {
    if (!window.ethereum) { setMmAccount(null); setChainOk(null); return; }
    try {
      const [accounts, chain] = await Promise.all([window.ethereum.request({ method: "eth_accounts" }), window.ethereum.request({ method: "eth_chainId" })]);
      setMmAccount(accounts[0] ? accounts[0].toLowerCase() : "");
      setChainOk(chain?.toLowerCase() === LOCAL_CHAIN_HEX);
    } catch { setMmAccount(null); }
  }, []);
  useEffect(() => {
    readWallet();
    const eth = window.ethereum;
    eth?.on?.("accountsChanged", readWallet);
    eth?.on?.("chainChanged", readWallet);
    return () => { eth?.removeListener?.("accountsChanged", readWallet); eth?.removeListener?.("chainChanged", readWallet); };
  }, [readWallet]);

  useEffect(() => {
    let cancelled = false;
    setBalance(null);
    if (linked) getPaymentTokenBalance(linked).then((b) => { if (!cancelled) setBalance(b); }).catch(() => {});
    return () => { cancelled = true; };
  }, [linked]);

  const run = async (key, fn) => {
    setBusy(key); setMsg(null);
    try { await fn(); } catch (e) { setMsg({ tone: "bad", text: e?.shortMessage || e?.response?.data?.message || e?.message || "Something went wrong. Try again." }); }
    finally { setBusy(""); }
  };

  const switchAccount = () => run("switch", async () => {
    if (!window.ethereum) throw new Error("MetaMask is not installed in this browser.");
    if (linked) await selectLinkedWallet(linked);
    else await window.ethereum.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
    await readWallet();
  });

  const connect = () => run("connect", async () => {
    if (!window.ethereum) throw new Error("MetaMask is not installed in this browser.");
    await window.ethereum.request({ method: "eth_requestAccounts" });
    await readWallet();
  });

  const switchNetwork = () => run("network", async () => { await checkAndSwitchNetwork(); await readWallet(); });

  const changeWallet = () => run("link", async () => {
    const owner = await authAPI.checkWallet(mmAccount).then((r) => r.data?.data?.status).catch(() => null);
    if (owner === "other_user") throw new Error(TAKEN_MSG);
    await linkWallet(mmAccount);
    setConfirming(false);
    setMsg({ tone: "good", text: "Your account now uses the new wallet." });
  });

  const copy = async () => {
    try { await navigator.clipboard.writeText(linked); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };

  const pickTheme = (t) => {
    setTheme(t);
    try { localStorage.setItem("app_theme", t); } catch { /* storage unavailable */ }
    window.dispatchEvent(new CustomEvent("app-theme", { detail: t }));
  };

  const synced = Boolean(linked && mmAccount && sameWallet(linked, mmAccount));
  const canChange = Boolean(mmAccount && !sameWallet(linked, mmAccount));
  const me = profile || user;
  const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  return (
    <div className={pageClass}>
      <PageHeader title="Settings" subtitle="Your profile, wallet and preferences." />

      {msg && (
        <div role={msg.tone === "bad" ? "alert" : "status"} className={`flex items-start gap-3 rounded-2xl border px-5 py-4 text-sm ${msg.tone === "bad" ? "border-amber-500/40 bg-amber-500/10 text-amber-200" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"}`}>
          {msg.tone === "bad" ? <AlertTriangle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
          <p className="break-words">{msg.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {/* Wallet */}
          <Card title="Wallet" subtitle="The wallet linked to your account receives your tokens and dividends and signs your transactions.">
            <div className="rounded-2xl bg-[#1b1c1f] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-[#8e8f98]">Linked wallet</p>
                  {linked ? (
                    <p className="mt-1 font-mono text-sm sm:text-base text-white break-all">{linked}</p>
                  ) : (
                    <p className="mt-1 text-sm text-amber-300">No wallet linked yet</p>
                  )}
                </div>
                {linked && (
                  <button onClick={copy} aria-label="Copy wallet address" className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer">
                    {copied ? <><CheckCircle2 size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                  </button>
                )}
              </div>
              {linked && (
                <p className="mt-3 text-sm text-[#a1a1aa]">Payment token balance: <span className="font-semibold text-white tabular-nums">{balance == null ? "Loading…" : formatMUSD(balance)}</span></p>
              )}
            </div>

            <dl className="mt-4">
              <Row label="MetaMask account">
                {!window.ethereum ? <Badge tone="bad">MetaMask not installed</Badge>
                  : mmAccount === null ? <Badge tone="muted">Checking…</Badge>
                  : mmAccount === "" ? <Badge tone="warn">Not connected</Badge>
                  : <span className="inline-flex items-center gap-2 flex-wrap sm:justify-end"><span className="font-mono">{short(mmAccount)}</span>{linked && <Badge tone={synced ? "good" : "warn"}>{synced ? "Matches your account" : "Different wallet"}</Badge>}</span>}
              </Row>
              <Row label="Network">
                {chainOk == null ? <Badge tone="muted">Unknown</Badge> : chainOk ? <Badge tone="good">Correct network</Badge> : <Badge tone="warn">Wrong network</Badge>}
              </Row>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              {mmAccount === "" && <ActionButton onClick={connect} icon={Wallet} primary>{busy === "connect" ? "Opening MetaMask…" : "Connect MetaMask"}</ActionButton>}
              {mmAccount && <ActionButton onClick={switchAccount} icon={RefreshCw}>{busy === "switch" ? "Opening MetaMask…" : "Switch MetaMask account"}</ActionButton>}
              {chainOk === false && <ActionButton onClick={switchNetwork} icon={RefreshCw}>{busy === "network" ? "Switching…" : "Switch network"}</ActionButton>}
              {canChange && !confirming && <ActionButton onClick={() => setConfirming(true)} icon={Wallet} primary>{linked ? "Use this account instead" : "Link this account"}</ActionButton>}
              <ActionButton onClick={() => setManualOpen(true)} icon={KeyRound}>Enter an address</ActionButton>
            </div>

            {linked && mmAccount && !synced && (
              <p className="mt-4 text-sm text-[#a1a1aa] leading-relaxed">
                MetaMask is on a different account than your login. Click <strong className="text-white">Switch MetaMask account</strong> and tick the wallet that matches the linked address above. {walletImportHelp}
              </p>
            )}

            {confirming && canChange && (
              <div className={`${cardClass} mt-4 p-4 sm:p-5 border-amber-500/40`} role="alertdialog" aria-label="Confirm wallet change">
                <p className="font-semibold text-white">{linked ? "Change your wallet?" : "Link this wallet?"}</p>
                {linked && <p className="mt-2 text-sm text-[#a1a1aa]">From <span className="font-mono text-white">{short(linked)}</span> to <span className="font-mono text-white">{short(mmAccount)}</span></p>}
                <p className="mt-2 text-sm text-amber-200/90 leading-relaxed">Changing your wallet does not move anything. Tokens and payment tokens stay on the old wallet. New purchases and dividends will go to the new one. Each wallet can belong to only one account.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={changeWallet} disabled={busy === "link"} className="px-5 py-2.5 rounded-full bg-indigo-600 hover:brightness-110 text-sm font-bold disabled:opacity-60 cursor-pointer">{busy === "link" ? "Saving…" : "Yes, change wallet"}</button>
                  <button onClick={() => setConfirming(false)} className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-sm font-semibold text-white cursor-pointer">Cancel</button>
                </div>
              </div>
            )}
          </Card>

          {/* Preferences */}
          <Card title="Preferences" subtitle="These are saved in this browser.">
            <dl>
              <Row label="Display currency"><CurrencyPicker /></Row>
              <Row label="Theme">
                <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-full bg-[#1b1c1f] p-1">
                  {[["dark", "Dark", Moon], ["light", "Light", Sun]].map(([key, label, Icon]) => (
                    <button key={key} role="radio" aria-checked={theme === key} onClick={() => pickTheme(key)}
                      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold cursor-pointer ${theme === key ? "bg-indigo-600 text-[#0b1a10]" : "text-[#a1a1aa] hover:text-white"}`}>
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
              </Row>
            </dl>
          </Card>
        </div>

        <div className="space-y-6 min-w-0">
          {/* Profile */}
          <Card title="Profile">
            <dl>
              <Row label="Name">{me?.name || "–"}</Row>
              <Row label="Email">{me?.email || "–"}</Row>
              <Row label="Role">{currentConfig?.label || activeRole}</Row>
              {profile?.createdAt && <Row label="Member since">{fmtDate(profile.createdAt)}</Row>}
            </dl>
          </Card>

          {/* Verification */}
          <Card title="Verification" subtitle="Identity checks are needed before you can trade or tokenize.">
            <div className="flex items-center justify-between gap-3">
              {profile ? <Badge tone={profile.isVerified ? "good" : "warn"}>{profile.isVerified ? "Verified" : "Not verified yet"}</Badge> : <Badge tone="muted">Checking…</Badge>}
              {KYC_LINK[activeRole] && (
                <Link to={KYC_LINK[activeRole]} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#22e07a] hover:underline"><ShieldCheck size={15} /> Open KYC</Link>
              )}
            </div>
          </Card>

          {/* Session */}
          <Card title="Session">
            <button onClick={() => { logout(); navigate("/login"); }} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/15 text-rose-200 text-sm font-semibold cursor-pointer">
              <LogOut size={16} /> Sign out
            </button>
          </Card>
        </div>
      </div>

      <AddWalletModal isOpen={manualOpen} onClose={() => setManualOpen(false)} onSuccess={() => setMsg({ tone: "good", text: "Your account now uses the new wallet." })} />
    </div>
  );
}
