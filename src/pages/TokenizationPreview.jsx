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
  Building2, Lock, ShoppingBag, MapPin, RefreshCw, Copy, Check, Info, Tag, Users, Home, FileCheck2,
} from "lucide-react";
import { Card, Badge, ActionButton, Skeleton, pageClass } from "../components/ui/dash";

const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");
const well = "rounded-2xl border border-[#1b2440] bg-[#0e1426]";

// A small square icon badge used at the top of a tile.
function IconTile({ icon: Icon, tone = "brand" }) {
  const tones = {
    brand: "bg-indigo-500/10 text-indigo-300",
    good: "bg-emerald-500/10 text-emerald-300",
    warn: "bg-amber-500/10 text-amber-300",
  };
  return <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}><Icon className="w-[18px] h-[18px]" /></span>;
}

// The three stages across the top: property approved, owner wallet connected, tokens created.
function Progress({ steps }) {
  return (
    <ol className="flex items-center" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s.label} className="flex items-center flex-1 last:flex-none min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold border ${
              s.state === "done" ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300"
              : s.state === "problem" ? "border-amber-400/60 bg-amber-400/15 text-amber-300"
              : s.state === "current" ? "border-indigo-400 bg-indigo-500/20 text-indigo-200"
              : "border-[#29345a] text-[#6b7599]"}`}>
              {s.state === "done" ? <Check className="w-4 h-4" /> : s.state === "problem" ? <AlertTriangle className="w-4 h-4" /> : i + 1}
            </span>
            <span className={`hidden sm:block text-sm font-semibold truncate ${s.state === "todo" ? "text-[#6b7599]" : "text-white"}`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && <span aria-hidden className={`mx-3 h-px flex-1 ${s.state === "done" ? "bg-emerald-400/40" : "bg-[#1b2440]"}`} />}
        </li>
      ))}
    </ol>
  );
}

// One line of the "ready to tokenize?" checklist.
function Check3({ state, title, text, action }) {
  const done = state === "done", bad = state === "problem";
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 w-7 h-7 shrink-0 rounded-full flex items-center justify-center border ${done ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : bad ? "border-amber-500/50 bg-amber-500/10 text-amber-300" : "border-[#29345a] text-[#6b7599]"}`}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : bad ? <AlertTriangle className="w-3.5 h-3.5" /> : <span className="w-2 h-2 rounded-full bg-current" />}
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-white leading-tight">{title}</p>
        <p className="text-sm text-[#98a2c3] mt-0.5 break-words">{text}</p>
        {action}
      </div>
    </li>
  );
}

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unavailable: the address stays selectable */ }
  };
  return (
    <button type="button" onClick={copy} aria-label={label}
      className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-[#1b2440] bg-[#17181a] hover:bg-[#2c2d31] px-2.5 py-1.5 text-xs font-semibold text-[#d4d4d8]">
      {copied ? <><Check className="w-3.5 h-3.5 text-emerald-300" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
    </button>
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
      <div className={pageClass} role="status" aria-label="Loading property">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-44 w-full rounded-3xl" />
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-32 rounded-2xl" /></div>
            <Skeleton className="h-56 rounded-2xl" />
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
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
  const supply = preview.approvedTokenSupply;
  const feeKnown = preview.estimatedFeeEth != null && preview.estimatedGasUnits != null;

  const progress = [
    { label: "Property approved", state: approvedState },
    { label: "Owner wallet connected", state: approvedState !== "done" ? "todo" : walletState === "done" ? "done" : walletState === "problem" ? "problem" : "current" },
    { label: "Create tokens", state: tokenizedResult ? "done" : approvedState === "done" && walletState === "done" ? "current" : "todo" },
  ];

  return (
    <div className={pageClass}>
      <nav aria-label="Breadcrumb" className="text-sm text-[#98a2c3] flex items-center gap-2">
        <Link to="/verified-assets" className="hover:text-white">Verified assets</Link>
        <span aria-hidden>/</span>
        <span className="text-white">{preview.assetName}</span>
      </nav>

      {tokenizedResult ? (
        <section className="rounded-3xl border border-[#1b2440] bg-[#0b1124] p-6 sm:p-10">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 mx-auto flex items-center justify-center"><CheckCircle2 className="w-10 h-10" /></div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{preview.assetName} is now tokenized</h1>
              <p className="mt-2 text-[#98a2c3]">
                {supply.toLocaleString()} tokens were created and sent to your wallet. Each token is a small share of this property.
              </p>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <div className={`${well} p-4`}><dt className="text-xs text-[#98a2c3]">Tokens created</dt><dd className="mt-1 text-xl font-bold text-white tabular-nums">{supply.toLocaleString()}</dd></div>
              <div className={`${well} p-4`}><dt className="text-xs text-[#98a2c3]">Starting price per token</dt><dd className="mt-1 text-xl font-bold text-white tabular-nums">{formatLKR(preview.calculatedReferencePrice)}</dd></div>
              <div className={`${well} p-4`}><dt className="text-xs text-[#98a2c3]">Network fee used</dt><dd className="mt-1 text-xl font-bold text-amber-300 tabular-nums">{tokenizedResult.gasUsed.toLocaleString()} <span className="text-xs font-normal text-[#98a2c3]">gas</span></dd></div>
            </dl>
            <div className={`${well} p-4 text-left`}>
              <p className="text-xs text-[#98a2c3]">Receipt (transaction ID)</p>
              <div className="mt-1.5 flex items-start justify-between gap-3">
                <p className="text-xs font-mono text-[#c3cae2] break-all">{tokenizedResult.txHash}</p>
                <CopyButton value={tokenizedResult.txHash} label="Copy the transaction ID" />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-3">What would you like to do next?</p>
              <div className="grid sm:grid-cols-2 gap-3 text-left">
                <Link to={`/owner/release${preview.blockchainAssetId != null ? `?asset=${preview.blockchainAssetId}` : ""}`} className={`${well} p-4 flex items-start gap-3 hover:border-indigo-500/50 transition-colors`}>
                  <IconTile icon={ShoppingBag} />
                  <span><span className="block font-semibold text-white">Put tokens on the marketplace</span><span className="block text-sm text-[#98a2c3] mt-0.5">Choose how many to sell and at what price. You keep the rest.</span></span>
                </Link>
                <Link to="/owner/portfolio" className={`${well} p-4 flex items-start gap-3 hover:border-indigo-500/50 transition-colors`}>
                  <IconTile icon={Wallet} tone="good" />
                  <span><span className="block font-semibold text-white">View my portfolio</span><span className="block text-sm text-[#98a2c3] mt-0.5">See your holdings and the property's value.</span></span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Who and what */}
          <section className="rounded-3xl border border-[#1b2440] bg-[#0b1124] p-5 sm:p-7 space-y-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
              <div className="flex items-start gap-4 min-w-0">
                <span className="hidden sm:flex w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 items-center justify-center shrink-0"><Building2 className="w-8 h-8 text-indigo-300" /></span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge tone="brand">Property #{preview.assetId}</Badge>
                    {preview.assetSymbol && <span className="font-mono text-[#98a2c3] rounded-md border border-[#1b2440] px-2 py-0.5">{preview.assetSymbol}</span>}
                  </div>
                  <h1 className="mt-2 text-2xl sm:text-4xl font-bold tracking-tight text-white break-words">{preview.assetName}</h1>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm text-[#c3cae2]">
                    {preview.location && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1b1c1f] px-3 py-1"><MapPin className="w-3.5 h-3.5 text-[#98a2c3]" />{preview.location}</span>}
                    {preview.propertyType && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1b1c1f] px-3 py-1"><Home className="w-3.5 h-3.5 text-[#98a2c3]" />{preview.propertyType}</span>}
                  </div>
                </div>
              </div>
              <div className={`${well} px-4 py-3 shrink-0`}>
                <p className="text-xs text-[#98a2c3]">Verification</p>
                <p className="mt-0.5 flex items-center gap-1.5 font-semibold text-emerald-300"><ShieldCheck className="w-4 h-4" />Officially approved</p>
              </div>
            </div>
            <div className="border-t border-[#1b2440] pt-5"><Progress steps={progress} /></div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1fr_380px] items-start">
            <div className="space-y-6 min-w-0">
              {/* The numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className={`${well} p-5`}>
                  <IconTile icon={Lock} tone="good" />
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2c3]">Property value</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-300 tabular-nums break-words">{formatLKR(preview.approvedValuation)}</p>
                  <p className="mt-1.5 text-xs text-[#98a2c3]">Set by the verifier. You can't change it.</p>
                </div>
                <div className={`${well} p-5`}>
                  <IconTile icon={Coins} />
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2c3]">Tokens to create</p>
                  <p className="mt-1 text-2xl font-bold text-white tabular-nums">{supply.toLocaleString()}</p>
                  <p className="mt-1.5 text-xs text-[#98a2c3]">All created at once, then fixed.</p>
                </div>
                <div className={`${well} p-5`}>
                  <IconTile icon={Tag} tone="warn" />
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2c3]">Starting price per token</p>
                  <p className="mt-1 text-2xl font-bold text-white tabular-nums break-words">{formatLKR(preview.calculatedReferencePrice)}</p>
                  <p className="mt-1.5 text-xs text-[#98a2c3]">Value ÷ number of tokens.</p>
                </div>
              </div>

              <Card title="How the price is worked out" subtitle="Tokens are small shares of the property. Each one starts at an equal slice of its value.">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3 text-center">
                  <div className={`${well} p-4`}><p className="text-xs text-[#98a2c3]">Property value</p><p className="mt-1 font-bold text-white tabular-nums">{formatLKR(preview.approvedValuation)}</p></div>
                  <span aria-hidden className="text-2xl font-light text-[#6b7599]">÷</span>
                  <div className={`${well} p-4`}><p className="text-xs text-[#98a2c3]">Tokens</p><p className="mt-1 font-bold text-white tabular-nums">{supply.toLocaleString()}</p></div>
                  <span aria-hidden className="text-2xl font-light text-[#6b7599]">=</span>
                  <div className="rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-4"><p className="text-xs text-indigo-200">Price per token</p><p className="mt-1 font-bold text-white tabular-nums">{formatLKR(preview.calculatedReferencePrice)}</p></div>
                </div>
                <ul className="mt-5 space-y-3 text-sm text-[#c3cae2] leading-relaxed">
                  <li className="flex gap-3"><Info className="w-4 h-4 shrink-0 mt-0.5 text-[#98a2c3]" />This is a starting guide, not a promised price. Buyers and sellers on the marketplace can ask for more or less.</li>
                  <li className="flex gap-3"><RefreshCw className="w-4 h-4 shrink-0 mt-0.5 text-[#98a2c3]" />If the property is revalued later and approved, the guide price updates. The number of tokens stays the same.</li>
                </ul>
              </Card>

              <Card title="What happens after you create the tokens" subtitle="You start with every token in your wallet and decide how many to sell.">
                <ol className="grid sm:grid-cols-3 gap-3">
                  {[
                    [Coins, "Tokens are created", `All ${supply.toLocaleString()} tokens go to your wallet. You own 100% of the property's tokens.`],
                    [ShoppingBag, "You release some for sale", "Pick how many tokens to sell and the price. The rest stay with you."],
                    [Users, "Investors buy shares", "Buyers pay you for tokens. They can resell them to other investors later."],
                  ].map(([Icon, title, text], i) => (
                    <li key={title} className={`${well} p-4`}>
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-[#1b1c1f] text-xs font-bold text-[#d4d4d8] flex items-center justify-center">{i + 1}</span>
                        <Icon className="w-4 h-4 text-indigo-300" />
                      </div>
                      <p className="mt-3 font-semibold text-white">{title}</p>
                      <p className="mt-1 text-sm text-[#98a2c3] leading-relaxed">{text}</p>
                    </li>
                  ))}
                </ol>
              </Card>

              <Card title="Where your tokens go and what it costs" subtitle="Creating tokens needs one approval from the verified owner's wallet.">
                <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className={`${well} p-4`}>
                    <dt className="text-xs text-[#98a2c3] flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" />Tokens are sent to</dt>
                    <dd className="mt-2 flex items-start justify-between gap-3">
                      <span className="font-mono text-[13px] font-semibold text-emerald-300 break-all">{preview.ownerWallet}</span>
                      <CopyButton value={preview.ownerWallet} label="Copy the owner wallet address" />
                    </dd>
                    <p className="mt-2 text-xs text-[#98a2c3]">The verified owner's wallet.</p>
                  </div>
                  <div className={`${well} p-4`}>
                    <dt className="text-xs text-[#98a2c3] flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" />Estimated network fee</dt>
                    {feeKnown ? (
                      <>
                        <dd className="mt-2 text-xl font-bold text-amber-300 tabular-nums">≈ {preview.estimatedFeeEth.toFixed(6)} ETH</dd>
                        <p className="mt-1 text-xs text-[#98a2c3]">
                          {preview.estimatedGasUnits.toLocaleString()} gas{preview.estimatedGasPriceGwei != null ? ` × ${preview.estimatedGasPriceGwei.toFixed(2)} gwei` : ""}. Paid from your wallet when you approve, not by the platform.
                        </p>
                      </>
                    ) : (
                      <>
                        <dd className="mt-2 text-base font-semibold text-[#c3cae2]">Shown once the property is approved</dd>
                        <p className="mt-1 text-xs text-[#98a2c3]">The fee is read from the blockchain at the moment you are ready to create the tokens.</p>
                      </>
                    )}
                  </div>
                </dl>
                <p className="mt-4 flex items-start gap-2 text-xs text-[#98a2c3]"><FileCheck2 className="w-4 h-4 shrink-0 mt-0.5" />The transaction checks the property's deed hash before creating any tokens.</p>
              </Card>
            </div>

            {/* Action panel */}
            <aside className="xl:sticky xl:top-24 space-y-4" aria-label="Tokenize this property">
              <Card title="Ready to tokenize?" subtitle="Check these, then approve in MetaMask.">
                <ol className="space-y-5">
                  <Check3 state={approvedState} title="Property approved"
                    text={approvedState === "done" ? "Verified and ready." : (preview.blockingReason || "Registration or approval is still needed.")} />
                  <Check3 state={walletState} title="Right wallet connected"
                    text={walletState === "done" ? `Connected as ${short(connectedAccount)}.`
                      : walletState === "problem" ? `MetaMask is on ${short(connectedAccount)}, but this property belongs to ${short(preview.ownerWallet)}.`
                      : "Connect MetaMask with the owner's wallet."}
                    action={walletState !== "done" && (
                      <button type="button" onClick={handleSwitchAccount} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 px-3 py-1.5 text-sm font-semibold">
                        <Wallet className="w-3.5 h-3.5" />{walletState === "problem" ? "Switch to the owner wallet" : "Connect wallet"}
                      </button>)} />
                  <Check3 state={tokenizedResult ? "done" : "todo"} title="Create the tokens" text="One click, then confirm in MetaMask." />
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

                <div className="mt-6">
                  {isInvestor ? (
                    <p className={`${well} p-4 text-sm text-[#c3cae2]`}>Investor accounts can look but not tokenize. Only the verified property owner can do this.</p>
                  ) : (
                    <button onClick={handleTokenize} disabled={!canTokenize}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 py-4 text-base font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed">
                      <Coins className="w-5 h-5" />
                      {isTokenizing ? "Waiting for MetaMask…"
                        : isWalletMismatch ? "Switch wallet to continue"
                        : !preview.isEligible ? (preview.existingStatus === "TOKENIZED" ? "Already tokenized" : "Approval needed first")
                        : `Create ${supply.toLocaleString()} tokens`}
                      {canTokenize && <ArrowRight className="w-4 h-4" />}
                    </button>
                  )}
                  <p className="mt-3 text-xs text-[#98a2c3] leading-relaxed">MetaMask will ask you to confirm once. It checks the property's deed, creates exactly {supply.toLocaleString()} tokens, and sends them to your wallet.</p>
                </div>
              </Card>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
