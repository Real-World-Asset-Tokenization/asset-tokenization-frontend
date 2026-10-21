import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../lib/api";

const TAKEN_MSG = "This wallet is already linked to another user in this system. Each wallet can belong to only one account, so pick a different MetaMask account.";

// "other_user" when another account already owns the wallet; null if the check could not run.
const walletOwner = (addr) => authAPI.checkWallet(addr.toLowerCase()).then((r) => r.data?.data?.status).catch(() => null);
import { Wallet, ShieldAlert, CheckCircle2, AlertCircle, X, Sparkles, ArrowRight } from "lucide-react";

export default function AddWalletModal({ isOpen, onClose, onSuccess }) {
  const { user, linkWallet } = useAuth();
  const [walletInput, setWalletInput] = useState("");
  const [detectingMM, setDetectingMM] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isOpen) {
      setWalletInput("");
      setError("");
      setSuccess("");
      setSaving(false);
      setDetectingMM(false);
    }
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !saving) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, saving, onClose]);

  if (!isOpen) return null;

  const handleDetectMetaMask = async () => {
    setError("");
    if (!window.ethereum) {
      setError("MetaMask is not detected in your browser. Please install the MetaMask extension or enter your wallet address manually.");
      return;
    }

    try {
      setDetectingMM(true);
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts && accounts.length > 0) {
        setWalletInput(accounts[0]);
        if ((await walletOwner(accounts[0])) === "other_user") setError(TAKEN_MSG);
      } else {
        setError("No accounts found in MetaMask. Please unlock MetaMask and try again.");
      }
    } catch (err) {
      console.warn("MetaMask account detection error:", err);
      setError(err?.message || "Failed to detect account from MetaMask. Please enter your wallet address manually.");
    } finally {
      setDetectingMM(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmed = walletInput.trim().toLowerCase();

    // Validate Ethereum address format
    if (!/^0x[a-f0-9]{40}$/i.test(trimmed)) {
      setError("Please enter a valid Ethereum wallet address (0x followed by 40 hexadecimal characters).");
      return;
    }

    try {
      setSaving(true);
      if ((await walletOwner(trimmed)) === "other_user") {
        setError(TAKEN_MSG);
        return;
      }
      await linkWallet(trimmed);
      setSuccess("Wallet address successfully linked to your account!");
      if (onSuccess) {
        onSuccess(trimmed);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || err.message;
      if (serverMsg && (serverMsg.includes("already associated") || serverMsg.includes("already linked") || serverMsg.includes("duplicate"))) {
        setError(TAKEN_MSG);
      } else {
        setError(serverMsg || "Failed to link wallet. Please verify the address and try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-indigo-950/60 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Add Account Wallet
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Required
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Link your dedicated personal Ethereum wallet address
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Active Account Identity Card */}
          <div className="p-3.5 bg-zinc-950/70 border border-zinc-800 rounded-xl flex items-center justify-between text-xs">
            <div className="flex flex-col">
              <span className="text-[11px] text-zinc-500 uppercase font-semibold tracking-wider">Account</span>
              <span className="font-semibold text-white truncate max-w-[260px]">
                {user?.name ? `${user.name} (${user.email})` : user?.email}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-zinc-500 uppercase font-semibold tracking-wider">Role</span>
              <span className="block font-semibold capitalize text-blue-400">
                {user?.role?.replace("_", " ") || "User"}
              </span>
            </div>
          </div>

          {/* Uniqueness Security Notice */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-start gap-2.5 text-xs text-amber-300">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Security Rule: </span>
              The same wallet address cannot belong to different users. Each account must have its own unique wallet ID.
            </div>
          </div>

          {/* Quick Auto-Detect from MetaMask */}
          <div className="flex items-center justify-between gap-3 p-3 bg-zinc-800/40 border border-zinc-700/50 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
              <span className="text-xs text-zinc-300 font-medium">Have MetaMask installed?</span>
            </div>
            <button
              type="button"
              onClick={handleDetectMetaMask}
              disabled={detectingMM || saving}
              className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>{detectingMM ? "Detecting..." : "Detect from MetaMask"}</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Ethereum Wallet Address (0x...)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={walletInput}
                  onChange={(e) => {
                    setWalletInput(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs font-mono text-white placeholder-zinc-600 outline-none transition-colors"
                  required
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Enter your 42-character hex address. This wallet will hold your tokens and payments.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !walletInput.trim()}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Linking Wallet...</span>
                  </>
                ) : (
                  <>
                    <span>Link Wallet to Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
