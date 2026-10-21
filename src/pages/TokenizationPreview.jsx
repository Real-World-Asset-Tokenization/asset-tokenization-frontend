import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import AddToChainButton from "../components/AddToChainButton";
import { useCurrency } from "../context/CurrencyContext";
import { useRole } from "../context/RoleContext";
import {
  fetchTokenizationPreview,
  executeOwnerTokenization,
} from "../services/tokenizationService";
import {
  ShieldCheck, Coins, ArrowRight, CheckCircle2, AlertTriangle, Clock, Wallet, Zap,
  Building2, Lock, ShoppingBag, MapPin, Circle, RefreshCw,
} from "lucide-react";
import { Card, Stat, Badge, ActionButton, Skeleton, pageClass } from "../components/ui/dash";

const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");

// One step in the "ready to tokenize?" checklist.
function Step({ state, title, text, action }) {
  const done = state === "done", bad = state === "problem";
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 w-6 h-6 shrink-0 rounded-full flex items-center justify-center border ${done ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : bad ? "border-amber-500/50 bg-amber-500/10 text-amber-300" : "border-[#29345a] text-[#98a2c3]"}`}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : bad ? <AlertTriangle className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-white leading-tight">{title}</p>
        <p className="text-sm text-[#98a2c3] mt-0.5">{text}</p>
        {action}
      </div>
    </li>
  );
}

export default function TokenizationPreview() {
  const { assetId } = useParams();
  const { formatLKR } = useCurrency();
  const { isInvestor } = useRole();

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [isTokenizing, setIsTokenizing] = useState(false);
  const [tokenizedResult, setTokenizedResult] = useState(null);
  const [connectedAccount, setConnectedAccount] = useState("");

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then((accs) => {
        if (accs && accs.length > 0) setConnectedAccount(accs[0]);
      });
      const handleAccounts = (accs) => setConnectedAccount(accs.length > 0 ? accs[0] : "");
      window.ethereum.on("accountsChanged", handleAccounts);
      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener("accountsChanged", handleAccounts);
        }
      };
    }
  }, []);

  const loadPreview = async () => {
    setLoading(true);
    setError("");
    try {
      setPreview(await fetchTokenizationPreview(assetId, connectedAccount || null));
    } catch (err) {
      setError(err.message || "Failed to load asset tokenization preview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assetId) loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId, connectedAccount]);

  const isWalletMismatch =
    Boolean(connectedAccount) &&
    Boolean(preview?.ownerWallet) &&
    connectedAccount.toLowerCase() !== preview.ownerWallet.toLowerCase();

  const handleSwitchAccount = async () => {
    try {
      if (window.ethereum) {
        await window.ethereum.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts && accounts.length > 0) setConnectedAccount(accounts[0]);
      }
    } catch (err) {
      console.warn("Account switch request error:", err.message);
    }
  };

  const handleTokenize = async () => {
    if (!preview) return;
    setError("");
    setIsTokenizing(true);
    setStatusMsg("Waiting for you to approve in MetaMask…");

    try {
      const freshPreview = await fetchTokenizationPreview(preview.assetId, connectedAccount || null);
      setPreview(freshPreview);
      if (!freshPreview.isEligible) throw new Error(freshPreview.blockingReason || "Asset is not ready for tokenization.");
      const res = await executeOwnerTokenization(freshPreview.blockchainAssetId, (msg) => setStatusMsg(msg), preview.assetId);
      setTokenizedResult(res);
      setStatusMsg("");
    } catch (err) {
      console.error("Tokenization execution failed:", err);
      setStatusMsg("");
      setError(err.message || "Tokenization transaction failed or was rejected.");
    } finally {
      setIsTokenizing(false);
    }
  };

  if (loading && !preview) {
    return (
      <div className={pageClass} role="status">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /></div>
      </div>
    );
  }

  if (error && !preview) {
    return (
      <div className={pageClass}>
        <Card title="We couldn't load this property" subtitle={error}>
          <div className="flex flex-wrap gap-3">
            <ActionButton onClick={loadPreview} icon={RefreshCw}>Try again</ActionButton>
            <ActionButton to="/verified-assets">Back to verified assets</ActionButton>
          </div>
        </Card>
      </div>
    );
  }

  const walletState = !connectedAccount ? "todo" : isWalletMismatch ? "problem" : "done";
  const approvedState = preview.isEligible || preview.existingStatus === "TOKENIZED" ? "done" : "problem";
  const canTokenize = !isInvestor && preview.isEligible && !isWalletMismatch && !isTokenizing;

  return (
    <div className={pageClass}>
      <nav aria-label="Breadcrumb" className="text-sm text-[#98a2c3] flex items-center gap-2">
        <Link to="/verified-assets" className="hover:text-white">Verified assets</Link>
        <span aria-hidden>/</span>
        <span className="text-white">{preview.assetName}</span>
      </nav>

      {tokenizedResult ? (
        <Card className="text-center">
          <div className="py-4 space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 mx-auto flex items-center justify-center"><CheckCircle2 className="w-9 h-9" /></div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{preview.assetName} is now tokenized</h1>
              <p className="mt-2 text-[#98a2c3] max-w-lg mx-auto">
                {preview.approvedTokenSupply.toLocaleString()} tokens were created and sent to your wallet. Each token is a small share of this property.
              </p>
            </div>
            <dl className="max-w-md mx-auto rounded-xl border border-[#1b2440] bg-[#0e1426] p-4 text-sm text-left space-y-2.5">
              <div className="flex justify-between gap-4"><dt className="text-[#98a2c3]">Tokens created</dt><dd className="text-white font-semibold">{preview.approvedTokenSupply.toLocaleString()}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#98a2c3]">Starting price per token</dt><dd className="text-white font-semibold">{formatLKR(preview.calculatedReferencePrice)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#98a2c3]">Network fee used</dt><dd className="text-[#c3cae2]">{tokenizedResult.gasUsed.toLocaleString()} units</dd></div>
              <div className="border-t border-[#1b2440] pt-2.5"><dt className="text-[#98a2c3]">Receipt (transaction ID)</dt><dd className="text-xs font-mono text-[#c3cae2] break-all mt-1">{tokenizedResult.txHash}</dd></div>
            </dl>
            <div className="flex flex-wrap justify-center gap-3">
              <ActionButton primary icon={ShoppingBag} to={`/owner/release${preview.blockchainAssetId != null ? `?asset=${preview.blockchainAssetId}` : ""}`}>Put tokens on the marketplace</ActionButton>
              <ActionButton to="/owner/portfolio">View my portfolio</ActionButton>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Who and what */}
          <section className="rounded-2xl border border-[#1b2440] bg-[#0b1124] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge tone="brand">Property #{preview.assetId}</Badge>
                {preview.assetSymbol && <span className="font-mono text-[#98a2c3]">{preview.assetSymbol}</span>}
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-white truncate">{preview.assetName}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-[#98a2c3]">
                <MapPin className="w-4 h-4 shrink-0" />{[preview.location, preview.propertyType].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="rounded-xl border border-[#1b2440] bg-[#0e1426] px-4 py-3">
              <p className="text-xs text-[#98a2c3]">Verification</p>
              <p className="mt-0.5 flex items-center gap-1.5 font-semibold text-emerald-300"><ShieldCheck className="w-4 h-4" />Officially approved</p>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1fr_380px] items-start">
            <div className="space-y-6 min-w-0">
              {/* The three numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <Stat label="Property value" value={formatLKR(preview.approvedValuation)} tone="up" icon={Lock} note="Set by the verifier. You can't change it." />
                <Stat label="Tokens to create" value={preview.approvedTokenSupply.toLocaleString()} icon={Coins} note="All created at once, then fixed." />
                <Stat label="Starting price per token" value={formatLKR(preview.calculatedReferencePrice)} icon={Building2} note="Value ÷ number of tokens." />
              </div>

              <Card title="How the price is worked out" subtitle="Tokens are small shares of the property. Each one starts at an equal slice of its value.">
                <p className="rounded-xl border border-[#1b2440] bg-[#0e1426] px-4 py-3 text-base font-semibold text-white tabular-nums">{preview.formulaExplanation}</p>
                <ul className="mt-4 space-y-2 text-sm text-[#c3cae2] list-disc pl-5 leading-relaxed">
                  <li>This is a starting guide, not a promised price. Buyers and sellers on the marketplace can ask for more or less.</li>
                  <li>If the property is revalued later and approved, the guide price updates. The number of tokens stays the same.</li>
                </ul>
              </Card>

              <Card title="Where your tokens go" subtitle="Creating tokens needs one approval from the verified owner's wallet.">
                <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-[#1b2440] bg-[#0e1426] p-4">
                    <dt className="text-xs text-[#98a2c3] flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" />Tokens are sent to</dt>
                    <dd className="mt-1 font-mono font-semibold text-emerald-300 break-all">{preview.ownerWallet}</dd>
                    <p className="mt-1 text-xs text-[#98a2c3]">The verified owner's wallet.</p>
                  </div>
                  <div className="rounded-xl border border-[#1b2440] bg-[#0e1426] p-4">
                    <dt className="text-xs text-[#98a2c3] flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" />Estimated network fee</dt>
                    <dd className="mt-1 font-semibold text-amber-300">about {preview.estimatedGasUnits.toLocaleString()} units</dd>
                    <p className="mt-1 text-xs text-[#98a2c3]">Paid from your wallet when you approve.</p>
                  </div>
                </dl>
              </Card>
            </div>

            {/* Action panel */}
            <aside className="xl:sticky xl:top-24 space-y-4" aria-label="Tokenize this property">
              <Card title="Ready to tokenize?" subtitle="Check these, then approve in MetaMask.">
                <ol className="space-y-4">
                  <Step state={approvedState} title="Property approved"
                    text={approvedState === "done" ? "Verified and ready." : (preview.blockingReason || "Registration or approval is still needed.")} />
                  <Step state={walletState} title="Right wallet connected"
                    text={walletState === "done" ? `Connected as ${short(connectedAccount)}.`
                      : walletState === "problem" ? `MetaMask is on ${short(connectedAccount)}, but this property belongs to ${short(preview.ownerWallet)}.`
                      : "Connect MetaMask with the owner's wallet."}
                    action={walletState !== "done" && (
                      <button type="button" onClick={handleSwitchAccount} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 px-3 py-1.5 text-sm font-semibold">
                        <Wallet className="w-3.5 h-3.5" />{walletState === "problem" ? "Switch to the owner wallet" : "Connect wallet"}
                      </button>)} />
                  <Step state={tokenizedResult ? "done" : "todo"} title="Create the tokens" text="One click, then confirm in MetaMask." />
                </ol>

                {!isInvestor && preview.existingStatus === "REGISTRATION_REQUIRED" && (
                  <div className="mt-4">
                    <AddToChainButton
                      asset={{ ...preview, name: preview.assetName, symbol: preview.assetSymbol, valuationLKR: preview.approvedValuation, totalShares: preview.approvedTokenSupply }}
                      chainStatus={preview.blockchainAssetId == null ? "missing" : "pending"}
                      onDone={async () => setPreview(await fetchTokenizationPreview(preview.assetId, connectedAccount || null))}
                    />
                  </div>
                )}

                {statusMsg && <p role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-sm text-indigo-200"><Clock className="w-4 h-4 animate-spin shrink-0" />{statusMsg}</p>}
                {error && <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span className="break-words">{error}</span></p>}

                <div className="mt-5">
                  {isInvestor ? (
                    <p className="rounded-xl border border-[#1b2440] bg-[#0e1426] p-4 text-sm text-[#c3cae2]">Investor accounts can look but not tokenize. Only the verified property owner can do this.</p>
                  ) : (
                    <button onClick={handleTokenize} disabled={!canTokenize}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-3.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed">
                      <Coins className="w-5 h-5" />
                      {isTokenizing ? "Waiting for MetaMask…"
                        : isWalletMismatch ? "Switch wallet to continue"
                        : !preview.isEligible ? (preview.existingStatus === "TOKENIZED" ? "Already tokenized" : "Approval needed first")
                        : "Create tokens"}
                      {canTokenize && <ArrowRight className="w-4 h-4" />}
                    </button>
                  )}
                  <p className="mt-3 text-xs text-[#98a2c3] leading-relaxed">MetaMask will ask you to confirm once. It checks the property's deed, creates exactly {preview.approvedTokenSupply.toLocaleString()} tokens, and sends them to your wallet.</p>
                </div>
              </Card>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
