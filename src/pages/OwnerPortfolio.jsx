import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Wallet, Building2, Coins, ShoppingBag, RefreshCw, PlusCircle, Receipt, MapPin, Download, Printer, Copy, Check,
  FileText, Award, TrendingUp, LayoutGrid, ShieldCheck,
} from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";
import { useAuth } from "../context/AuthContext";
import { fetchVerifiedAssets, fetchTokenizationStatus } from "../services/tokenizationService";
import { getVerifiedTokenBalance, getPaymentTokenBalance } from "../services/contractService";
import { loadMyOffers, loadMyTrades, isLive } from "../services/tokenSales";
import { valuationApi } from "../services/valuationApi";
import { resolveUserWallet } from "../lib/walletResolver";
import { isAssetOwnedByUser } from "../lib/assetOwnership";
import AddWalletModal from "../components/AddWalletModal";
import ValuationPanel from "../components/ValuationPanel";
import { Card, Stat, Badge, ActionButton, Skeleton, Empty, fmtDate, pageClass } from "../components/ui/dash";

const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
const TABS = [["overview", "Overview", LayoutGrid], ["valuation", "Valuation", TrendingUp], ["report", "Report", FileText], ["certificate", "Certificate", Award]];

// ---- small helpers -------------------------------------------------------------------------
function download(filename, text, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob(["﻿" + text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const csvCell = (v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = (rows) => rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
const stamp = (d = new Date()) => d.toISOString().slice(0, 10);

function CopyButton({ text, label = "Copy" }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={() => navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {})}
      className="no-print inline-flex items-center gap-1 text-xs font-semibold text-[#98a2c3] hover:text-white">
      {done ? <><Check className="w-3.5 h-3.5 text-emerald-300" />Copied</> : <><Copy className="w-3.5 h-3.5" />{label}</>}
    </button>
  );
}

// ---- printable "paper" documents (always dark text on white, in both themes) ----------------
const INK = { text: "#111827", mute: "#4b5563", line: "#d1d5db", soft: "#f3f4f6", green: "#15803d" };
function PaperRow({ k, v, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "7px 0", borderBottom: `1px solid ${INK.line}`, fontSize: 13 }}>
      <span style={{ color: INK.mute }}>{k}</span>
      <span style={{ color: INK.text, fontWeight: 600, textAlign: "right", wordBreak: "break-all", fontFamily: mono ? "ui-monospace, monospace" : undefined, fontSize: mono ? 12 : 13 }}>{v}</span>
    </div>
  );
}
function PaperSection({ n, title, children }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ color: INK.green, fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{n}. {title}</div>
      {children}
    </div>
  );
}
function PaperTable({ head, rows, empty }) {
  if (!rows.length) return <div style={{ color: INK.mute, fontSize: 13, padding: "6px 0" }}>{empty}</div>;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
      <thead><tr>{head.map((h, i) => <th key={h} style={{ textAlign: i === 0 ? "left" : "right", color: INK.mute, fontWeight: 600, padding: "6px 4px", borderBottom: `2px solid ${INK.line}` }}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ textAlign: j === 0 ? "left" : "right", color: INK.text, padding: "6px 4px", borderBottom: `1px solid ${INK.line}` }}>{c}</td>)}</tr>)}</tbody>
    </table>
  );
}

// Everything the report and certificate need for one property, from real data only.
function buildFacts(a, det, trades, offers, formatLKR, formatMUSD) {
  const tokenId = a.blockchainAssetId ?? a.assetId;
  const record = det?.status?.databaseRecord;
  const listed = offers == null ? null : offers.filter((o) => Number(o.assetId) === Number(tokenId) && isLive(o)).reduce((s, o) => s + o.amount, 0);
  const free = listed == null ? null : Math.max(0, a.balance - listed);
  const myTrades = (trades || []).filter((t) => Number(t.assetId) === Number(tokenId));
  return {
    tokenId, record, listed, free, myTrades,
    tokenized: a.tokenizationStatus === "TOKENIZED",
    entries: det?.history?.entries || [],
    earned: myTrades.filter((t) => t.side === "Sold").reduce((s, t) => s + (t.received || 0), 0),
    spent: myTrades.filter((t) => t.side === "Bought").reduce((s, t) => s + t.total, 0),
    formatLKR, formatMUSD,
  };
}

function AssetReport({ a, f, owner, wallet, currency }) {
  const now = new Date();
  const own = a.ownershipPercentage.toFixed(2);
  return (
    <div className="print-area" style={{ background: "#fff", color: INK.text, borderRadius: 12, padding: "32px 34px", maxWidth: 820, margin: "0 auto", boxShadow: "0 10px 40px -16px rgba(0,0,0,0.6)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, borderBottom: `3px solid ${INK.green}`, paddingBottom: 14 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: INK.green, letterSpacing: "0.1em" }}>TERRATOKEN</div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>Asset report</div>
          <div style={{ fontSize: 15, color: INK.mute, marginTop: 2 }}>{a.name}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 12, color: INK.mute, lineHeight: 1.6 }}>
          <div>Report no. <b style={{ color: INK.text }}>R-{a.assetId}-{stamp(now).replace(/-/g, "")}</b></div>
          <div>Generated {now.toLocaleString()}</div>
          <div>Prepared for {owner || "Asset owner"}</div>
          <div style={{ fontFamily: "ui-monospace, monospace" }}>{short(wallet)}</div>
        </div>
      </div>

      <PaperSection n={1} title="Property">
        <PaperRow k="Name" v={a.name} />
        <PaperRow k="Location" v={a.location || "Not provided"} />
        <PaperRow k="Type" v={(a.propertyType || a.assetType || "—").toString().replace(/_/g, " ")} />
        <PaperRow k="Status" v={f.tokenized ? "Tokens created" : "Verified, tokens not created yet"} />
        <PaperRow k="Token number" v={`#${f.tokenId}${a.symbol ? ` · ${a.symbol}` : ""}`} />
        {a.documentHash && <PaperRow k="Deed fingerprint" v={a.documentHash} mono />}
      </PaperSection>

      <PaperSection n={2} title="Valuation and pricing">
        <PaperRow k="Approved property value" v={f.formatLKR(a.valuationLKR)} />
        <PaperRow k="Total tokens" v={a.totalShares.toLocaleString()} />
        <PaperRow k="Starting price per token" v={a.referencePriceLKR != null ? f.formatLKR(a.referencePriceLKR) : "—"} />
        <PaperRow k="Valuation versions on record" v={f.entries.length || "—"} />
      </PaperSection>

      <PaperSection n={3} title="Token holding">
        <PaperRow k="Tokens you hold" v={`${a.balance.toLocaleString()} (${own}% of the property)`} />
        <PaperRow k="Released for sale" v={f.listed == null ? "Unavailable" : f.listed.toLocaleString()} />
        <PaperRow k="Not released (free in wallet)" v={f.free == null ? "Unavailable" : f.free.toLocaleString()} />
        <PaperRow k="Estimated worth of your tokens" v={a.indicativeHoldingVal != null ? f.formatLKR(a.indicativeHoldingVal) : "—"} />
      </PaperSection>

      <PaperSection n={4} title="Valuation history">
        <PaperTable head={["Version", "Approved value", "Effective", "Change"]}
          rows={[...f.entries].reverse().map((h) => [`v${h.version}`, f.formatLKR(h.approvedValue), h.effectiveDate ? fmtDate(h.effectiveDate) : "—", h.changePercent != null ? `${Number(h.changePercent) > 0 ? "+" : ""}${h.changePercent}%` : "—"])}
          empty="No valuation history has been published for this property." />
      </PaperSection>

      <PaperSection n={5} title="Sales activity (this property)">
        <PaperTable head={["Date", "Type", "Tokens", "Total (mUSD)", "You received"]}
          rows={f.myTrades.map((t) => [t.at.toLocaleDateString(), t.side, t.amount.toLocaleString(), f.formatMUSD(t.total), t.received != null ? f.formatMUSD(t.received) : "—"])}
          empty="No completed trades for this property yet." />
        {f.myTrades.length > 0 && <div style={{ marginTop: 8, fontSize: 13, color: INK.mute }}>Received from sales: <b style={{ color: INK.text }}>{f.formatMUSD(f.earned)}</b> · Spent on purchases: <b style={{ color: INK.text }}>{f.formatMUSD(f.spent)}</b></div>}
      </PaperSection>

      <div style={{ marginTop: 26, paddingTop: 12, borderTop: `1px solid ${INK.line}`, fontSize: 11, color: INK.mute, lineHeight: 1.6 }}>
        Amounts are shown in {currency} using the app's indicative exchange rates. Token balances and trades are read from the demo blockchain network; values are indicative and are not an offer, a guaranteed sale price or financial advice.
      </div>
    </div>
  );
}

function Certificate({ a, f, wallet, formatLKR }) {
  const r = f.record;
  const txHash = r?.mintingTxHash;
  const certNo = txHash ? `TC-${txHash.slice(2, 10).toUpperCase()}` : "";
  const issuedOn = r?.tokenizedAt ? new Date(r.tokenizedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : null;
  const supply = r?.approvedTokenSupply ?? a.totalShares;
  return (
    <div className="print-area" style={{ background: "#fff", borderRadius: 12, maxWidth: 820, margin: "0 auto", padding: 14, boxShadow: "0 10px 40px -16px rgba(0,0,0,0.6)" }}>
      <div style={{ border: `3px double ${INK.green}`, borderRadius: 6, padding: "34px 36px", color: INK.text, textAlign: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", color: INK.green }}>TERRATOKEN · REAL ASSET TOKENIZATION</div>
        <div style={{ fontSize: 34, fontWeight: 800, marginTop: 10, fontFamily: "Georgia, 'Times New Roman', serif" }}>Certificate of Tokenization</div>
        <div style={{ width: 90, height: 3, background: INK.green, margin: "14px auto 18px" }} />
        <div style={{ fontSize: 14, color: INK.mute }}>This certifies that the property</div>
        <div style={{ fontSize: 28, fontWeight: 700, margin: "6px 0 2px", fontFamily: "Georgia, 'Times New Roman', serif" }}>{a.name}</div>
        <div style={{ fontSize: 14, color: INK.mute }}>{a.location || ""}</div>
        <div style={{ fontSize: 14, color: INK.text, maxWidth: 560, margin: "16px auto 0", lineHeight: 1.7 }}>
          has been verified and divided into <b>{Number(supply).toLocaleString()} digital tokens</b>, each representing an equal share of the property.
          The tokens were issued to the owner wallet below{issuedOn ? <> on <b>{issuedOn}</b></> : null}.
        </div>

        <div style={{ textAlign: "left", margin: "24px auto 0", maxWidth: 600 }}>
          <PaperRow k="Certificate number" v={certNo} mono />
          <PaperRow k="Approved property value" v={formatLKR(r?.approvedValuation ?? a.valuationLKR)} />
          <PaperRow k="Starting price per token" v={a.referencePriceLKR != null ? formatLKR(a.referencePriceLKR) : "—"} />
          <PaperRow k="Token number" v={`#${f.tokenId}`} />
          <PaperRow k="Issued to (owner wallet)" v={r?.ownerWallet || wallet} mono />
          <PaperRow k="Token contract" v={r?.contractAddress || "—"} mono />
          <PaperRow k="Transaction ID" v={txHash} mono />
        </div>

        <div style={{ marginTop: 22, fontSize: 11, color: INK.mute, lineHeight: 1.6 }}>
          Recorded on the demo test network and saved to the platform database. This certificate proves the tokens were created by the platform; it is not a legal title document.
        </div>
      </div>
    </div>
  );
}

// ---- the page --------------------------------------------------------------------------------
export default function OwnerPortfolio() {
  const { user } = useAuth();
  const { formatLKR, formatMUSD, currency } = useCurrency();
  const wallet = resolveUserWallet(user);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loaded, setLoaded] = useState([]);
  const [cash, setCash] = useState(null);
  const [offers, setOffers] = useState(null);
  const [trades, setTrades] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState("overview");
  const [detail, setDetail] = useState({});
  const [showAddWallet, setShowAddWallet] = useState(false);
  const requested = useRef(new Set());

  const load = useCallback(async () => {
    if (!wallet) { setLoaded([]); setCash(null); setLoading(false); return; }
    setLoading(true); setLoadError("");
    requested.current.clear(); setDetail({});
    try {
      const [verified, mBal, offerRows, tradeRows] = await Promise.all([
        fetchVerifiedAssets(null, true),
        getPaymentTokenBalance(wallet),
        loadMyOffers(wallet).then((r) => r.offers).catch(() => null),
        loadMyTrades(wallet).catch(() => null),
      ]);
      setCash(mBal); setOffers(offerRows); setTrades(tradeRows);
      const enriched = await Promise.all(verified.map(async (asset) => {
        let bal = 0;
        try { bal = await getVerifiedTokenBalance(wallet, asset); } catch { bal = 0; }
        const totalShares = asset.totalShares || 1000;
        const refPrice = asset.referencePriceLKR || (asset.valuationLKR ? asset.valuationLKR / totalShares : null);
        return { ...asset, balance: bal, totalShares, ownershipPercentage: totalShares > 0 ? (bal / totalShares) * 100 : 0, referencePriceLKR: refPrice, indicativeHoldingVal: refPrice != null ? bal * refPrice : null };
      }));
      setLoaded(enriched);
    } catch (err) {
      console.error("Error loading owner holdings:", err);
      setLoadError(err.message || "Unable to load your properties.");
    } finally { setLoading(false); }
  }, [wallet]);

  useEffect(() => {
    load();
    if (!window.ethereum?.on) return undefined;
    window.ethereum.on("accountsChanged", load);
    return () => window.ethereum.removeListener?.("accountsChanged", load);
  }, [load]);

  const assets = loaded.filter((a) => isAssetOwnedByUser(a, user));
  const selected = assets.find((a) => a.assetId === selectedId) || assets.find((a) => a.balance > 0) || assets[0] || null;

  // Status record and valuation history for the selected property, fetched once.
  useEffect(() => {
    if (!selected || requested.current.has(selected.assetId)) return;
    requested.current.add(selected.assetId);
    const key = selected.assetId, tokenId = selected.blockchainAssetId ?? selected.assetId;
    setDetail((d) => ({ ...d, [key]: { loading: true } }));
    Promise.all([fetchTokenizationStatus(selected.assetId).catch(() => null), valuationApi.history(tokenId).catch(() => null)])
      .then(([status, history]) => setDetail((d) => ({ ...d, [key]: { loading: false, status, history } })));
  }, [selected]);

  const held = assets.filter((a) => a.balance > 0);
  const totalValueLKR = held.reduce((s, h) => s + (h.indicativeHoldingVal || 0), 0);
  const totalTokens = held.reduce((s, h) => s + h.balance, 0);
  const v = (x) => (loading ? "…" : x);
  const det = selected ? detail[selected.assetId] : null;
  const f = selected ? buildFacts(selected, det, trades, offers, formatLKR, formatMUSD) : null;

  const exportPortfolio = () => download(`portfolio-${stamp()}.csv`, csv([
    ["Property", "Location", "Status", "Tokens held", "Total tokens", "Ownership %", "Approved value (LKR)", "Price per token (LKR)", "Estimated worth (LKR)"],
    ...assets.map((a) => [a.name, a.location || "", a.tokenizationStatus === "TOKENIZED" ? "Tokens created" : "Not tokenized", a.balance, a.totalShares, a.ownershipPercentage.toFixed(2), a.valuationLKR, a.referencePriceLKR ?? "", a.indicativeHoldingVal ?? ""]),
  ]));
  const exportAsset = () => download(`report-${(selected.name || "asset").replace(/\W+/g, "-").toLowerCase()}-${stamp()}.csv`, csv([
    ["Asset report", selected.name], ["Generated", new Date().toLocaleString()], ["Prepared for", `${user?.name || ""} ${wallet}`], [],
    ["Property"], ["Location", selected.location || ""], ["Type", selected.propertyType || selected.assetType || ""], ["Status", f.tokenized ? "Tokens created" : "Not tokenized"], ["Token number", f.tokenId], ["Deed fingerprint", selected.documentHash || ""], [],
    ["Valuation and pricing"], ["Approved value (LKR)", selected.valuationLKR], ["Total tokens", selected.totalShares], ["Price per token (LKR)", selected.referencePriceLKR ?? ""], [],
    ["Token holding"], ["Tokens held", selected.balance], ["Ownership %", selected.ownershipPercentage.toFixed(2)], ["Released for sale", f.listed ?? ""], ["Free in wallet", f.free ?? ""], ["Estimated worth (LKR)", selected.indicativeHoldingVal ?? ""], [],
    ["Valuation history"], ["Version", "Approved value (LKR)", "Effective", "Change %"], ...f.entries.map((h) => [h.version, h.approvedValue, h.effectiveDate || "", h.changePercent ?? ""]), [],
    ["Sales activity (mUSD)"], ["Date", "Type", "Tokens", "Total", "Received", "Transaction"], ...f.myTrades.map((t) => [t.at.toISOString(), t.side, t.amount, t.total, t.received ?? "", t.txHash]),
  ]));

  if (!wallet) {
    return (
      <div className={pageClass}>
        <div className="rise"><h1 className="text-2xl sm:text-[2rem] font-bold text-white">Holdings & valuations</h1></div>
        <Card title="Link a wallet to get started" subtitle="Your tokens live in a digital wallet. Link yours to see your properties, valuations, reports and certificates.">
          <ActionButton primary icon={PlusCircle} onClick={() => setShowAddWallet(true)}>Link my wallet</ActionButton>
        </Card>
        <AddWalletModal isOpen={showAddWallet} onClose={() => setShowAddWallet(false)} onSuccess={load} />
      </div>
    );
  }

  return (
    <div className={pageClass}>
      <style>{`@page { margin: 14mm; } @media print { body * { visibility: hidden !important; } .print-area, .print-area * { visibility: visible !important; } .print-area { position: absolute !important; left: 0; top: 0; width: 100% !important; max-width: none !important; box-shadow: none !important; } .no-print { display: none !important; } }`}</style>

      <div className="no-print rise flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-[2rem] font-bold tracking-[-0.02em] leading-tight text-white">Holdings & valuations</h1>
          <p className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-[#98a2c3]">Pick a property to see where its tokens are, what it is worth, and to create a report or a tokenization certificate.</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <ActionButton onClick={load} icon={RefreshCw}>Refresh</ActionButton>
          <ActionButton onClick={exportPortfolio} icon={Download}>Export all (CSV)</ActionButton>
        </div>
      </div>

      {loadError && <p role="alert" className="no-print text-sm text-amber-300 flex flex-wrap items-center gap-2">{loadError}<button onClick={load} className="underline inline-flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Retry</button></p>}

      <div className="no-print grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Stat icon={Building2} label="Properties" value={v(assets.length)} note={`${held.length} with tokens in your wallet`} />
        <Stat icon={Coins} label="Tokens you hold" value={v(totalTokens.toLocaleString())} note="across all properties" />
        <Stat icon={TrendingUp} label="Estimated worth" value={v(formatLKR(totalValueLKR))} tone="up" note="Tokens × starting price" />
        <Stat icon={Wallet} label="Cash available" value={v(formatMUSD(cash))} note="Demo mUSD" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[300px_1fr] items-start">
        {/* Property picker */}
        <nav aria-label="Your properties" className="no-print rounded-2xl border border-[#1b2440] bg-[#0b1124] p-3 xl:sticky xl:top-24">
          <p className="px-2 pt-1 pb-2 text-xs font-semibold uppercase tracking-wider text-[#98a2c3]">Your properties</p>
          {loading ? <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
            : !assets.length ? <p className="px-2 pb-2 text-sm text-[#98a2c3]">No verified properties yet. <Link to="/owner/assets/new" className="text-indigo-300 underline">Submit one</Link>.</p>
            : <ul className="space-y-1.5">
              {assets.map((a) => {
                const on = selected?.assetId === a.assetId;
                return (
                  <li key={a.assetId}>
                    <button type="button" onClick={() => setSelectedId(a.assetId)} aria-current={on ? "true" : undefined}
                      className={`w-full text-left rounded-xl border px-3.5 py-3 ${on ? "border-emerald-500/50 bg-emerald-500/10" : "border-transparent hover:bg-[#141c33]"}`}>
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-white truncate">{a.name}</span>
                        <span aria-hidden className="w-2 h-2 rounded-full shrink-0" style={{ background: a.tokenizationStatus === "TOKENIZED" ? "#1fe06f" : "#fbbf24" }} />
                      </span>
                      <span className="block text-xs text-[#98a2c3] mt-0.5">
                        {a.tokenizationStatus === "TOKENIZED" ? `${a.balance.toLocaleString()} tokens · ${a.ownershipPercentage.toFixed(a.ownershipPercentage < 1 && a.ownershipPercentage > 0 ? 2 : 1)}%` : "Tokens not created yet"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>}
        </nav>

        {/* Selected property workspace */}
        <div className="space-y-5 min-w-0">
          {loading ? <Skeleton className="h-72 w-full rounded-2xl" /> : !selected ? (
            <Card><Empty>Select a property to see its details.</Empty></Card>
          ) : (
            <>
              <section className="no-print rounded-2xl border border-[#1b2440] bg-[#0b1124] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold text-white">{selected.name}</h2>
                    <p className="text-sm text-[#98a2c3] mt-0.5 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{[selected.location, selected.propertyType].filter(Boolean).join(" · ") || "Location not provided"}</span></p>
                  </div>
                  <Badge tone={f.tokenized ? "good" : "warn"}>{f.tokenized ? "Tokens created" : "Ready to create tokens"}</Badge>
                </div>
                <div role="tablist" aria-label="Property sections" className="mt-4 flex gap-1 overflow-x-auto">
                  {TABS.map(([k, label, Icon]) => (
                    <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className="px-4 py-2 text-sm font-semibold whitespace-nowrap inline-flex items-center gap-2"><Icon className="w-4 h-4" />{label}</button>
                  ))}
                </div>
              </section>

              {tab === "overview" && (
                <div className="space-y-5">
                  <Card title="Where your tokens are" subtitle={`This property has ${selected.totalShares.toLocaleString()} tokens in total.`}>
                    {(() => {
                      const others = Math.max(0, selected.totalShares - selected.balance);
                      const parts = [["Free in your wallet", f.free, "#38bdf8"], ["Released for sale", f.listed, "#fbbf24"], ["Held by others", others, "#1fe06f"]];
                      const share = (n) => `${(n / selected.totalShares * 100).toFixed(2)}%`;
                      return (
                        <div className="space-y-3">
                          <div role="img" aria-label={parts.map(([l, n]) => `${l} ${n ?? 0}`).join(", ")} className="flex h-3 overflow-hidden rounded-full bg-[#3f4045]">
                            {parts.map(([l, n, c]) => n > 0 && <div key={l} title={`${l}: ${n.toLocaleString()}`} style={{ width: `${(n / selected.totalShares) * 100}%`, background: c }} />)}
                          </div>
                          <ul className="grid sm:grid-cols-3 gap-3">
                            {parts.map(([l, n, c]) => (
                              <li key={l} className="rounded-xl bg-[#0e1426] px-4 py-3">
                                <span className="flex items-center gap-2 text-xs text-[#98a2c3]"><span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />{l}</span>
                                <span className="block mt-1 text-lg font-semibold text-white tabular-nums">{n == null ? "Unavailable" : n.toLocaleString()}</span>
                                {n != null && <span className="text-xs text-[#98a2c3]">{share(n)} of the property</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })()}
                  </Card>

                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                    <Stat label="Approved value" value={formatLKR(selected.valuationLKR)} />
                    <Stat label="Price per token" value={selected.referencePriceLKR != null ? formatLKR(selected.referencePriceLKR) : "—"} note="Starting price" />
                    <Stat label="Your tokens" value={selected.balance.toLocaleString()} note={`${selected.ownershipPercentage.toFixed(2)}% of the property`} />
                    <Stat label="Worth about" tone="up" value={selected.indicativeHoldingVal != null ? formatLKR(selected.indicativeHoldingVal) : "—"} />
                  </div>

                  <Card title="Recent sales of this property" subtitle="Completed trades from the blockchain.">
                    {trades == null ? <Empty>Sales history could not be loaded.</Empty> : !f.myTrades.length ? <Empty>No tokens of this property have been traded from your wallet yet.</Empty> : (
                      <div className="overflow-x-auto"><table className="w-full text-sm min-w-[480px]">
                        <thead><tr className="text-left text-xs uppercase tracking-wider text-[#98a2c3]"><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Type</th><th className="py-2 pr-3 text-right">Tokens</th><th className="py-2 text-right">Amount</th></tr></thead>
                        <tbody>{f.myTrades.slice(0, 6).map((t) => (
                          <tr key={`${t.txHash}-${t.listingId}`} className="border-t border-[#1b2440]">
                            <td className="py-2.5 pr-3 text-[#c3cae2]">{t.at.toLocaleDateString()}</td>
                            <td className="py-2.5 pr-3" style={{ color: t.side === "Sold" ? "var(--up)" : "var(--ink-2)" }}>{t.side === "Sold" ? "▲ Sold" : "Bought"}</td>
                            <td className="py-2.5 pr-3 text-right text-white tabular-nums">{t.amount.toLocaleString()}</td>
                            <td className="py-2.5 text-right text-white tabular-nums">{formatMUSD(t.side === "Sold" ? t.received : t.total)}</td>
                          </tr>))}</tbody>
                      </table></div>
                    )}
                  </Card>

                  <div className="flex flex-wrap gap-2">
                    {selected.balance > 0
                      ? <ActionButton primary icon={ShoppingBag} to={`/owner/release?asset=${f.tokenId}`}>Put tokens on sale</ActionButton>
                      : <ActionButton primary icon={Coins} to={`/tokenization/preview/${selected.assetId}`}>Create tokens</ActionButton>}
                    <ActionButton icon={Receipt} to={`/tokenization/status/${selected.assetId}`}>Ownership record</ActionButton>
                    <ActionButton icon={FileText} onClick={() => setTab("report")}>Make a report</ActionButton>
                  </div>
                </div>
              )}

              {tab === "valuation" && (
                <div className="space-y-5">
                  <Card title="Official valuation" subtitle="The approved value sets the starting price of each token. You can ask for a review if you think it is out of date.">
                    {f.tokenized
                      ? <ValuationPanel assetId={f.tokenId} balance={selected.balance} allowReviewRequest title="Approved valuation & reference price" />
                      : <Empty>Valuation tracking starts once the tokens are created. The approved value for now is <strong className="text-white">{formatLKR(selected.valuationLKR)}</strong>.</Empty>}
                  </Card>
                  <Card title="Valuation history" subtitle="Every approved value, newest first.">
                    {det?.loading ? <Skeleton className="h-24 w-full" /> : !f.entries.length ? <Empty>No valuation history has been published for this property yet.</Empty> : (
                      <ol className="divide-y divide-[#1b2440]">
                        {[...f.entries].reverse().map((h) => (
                          <li key={h.version} className="flex items-center justify-between gap-3 py-3">
                            <span className="min-w-0"><span className="block font-semibold text-white tabular-nums">{formatLKR(h.approvedValue)}</span><span className="block text-xs text-[#98a2c3]">Version {h.version} · {h.effectiveDate ? fmtDate(h.effectiveDate) : "—"}{h.note ? ` · ${h.note}` : ""}</span></span>
                            {h.changePercent != null && <span className="font-semibold tabular-nums" style={{ color: Number(h.changePercent) < 0 ? "var(--down)" : "var(--up)" }}>{Number(h.changePercent) < 0 ? "▼" : "▲"} {Number(h.changePercent) > 0 ? "+" : ""}{h.changePercent}%</span>}
                          </li>))}
                      </ol>
                    )}
                  </Card>
                </div>
              )}

              {tab === "report" && (
                <div className="space-y-4">
                  <div className="no-print flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-[#98a2c3]">A one-page summary of this property: details, valuation, your holding, history and sales.</p>
                    <div className="flex flex-wrap gap-2">
                      <ActionButton primary icon={Printer} onClick={() => window.print()}>Print / save as PDF</ActionButton>
                      <ActionButton icon={Download} onClick={exportAsset}>Download CSV</ActionButton>
                    </div>
                  </div>
                  {det?.loading ? <Skeleton className="h-96 w-full rounded-2xl" /> : <AssetReport a={selected} f={f} owner={user?.name} wallet={wallet} currency={currency} />}
                </div>
              )}

              {tab === "certificate" && (
                f.tokenized && f.record?.mintingTxHash ? (
                  <div className="space-y-4">
                    <div className="no-print flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-[#98a2c3]">Proof that these tokens were created for this property. Print it or save it as a PDF.</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <CopyButton text={`TC-${f.record.mintingTxHash.slice(2, 10).toUpperCase()}`} label="Copy certificate no." />
                        <ActionButton primary icon={Printer} onClick={() => window.print()}>Print / save as PDF</ActionButton>
                      </div>
                    </div>
                    <Certificate a={selected} f={f} wallet={wallet} formatLKR={formatLKR} />
                  </div>
                ) : det?.loading ? <Skeleton className="h-96 w-full rounded-2xl" /> : (
                  <Card title="No certificate yet" subtitle="A certificate is issued once the tokens for this property have been created and recorded.">
                    <div className="flex flex-wrap items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-[#98a2c3]" />
                      <span className="text-sm text-[#98a2c3]">{f.tokenized ? "The tokens exist, but the creation receipt could not be found. Try Refresh." : "This property has not been tokenized."}</span>
                      {!f.tokenized && <ActionButton primary icon={Coins} to={`/tokenization/preview/${selected.assetId}`}>Create tokens</ActionButton>}
                    </div>
                  </Card>
                )
              )}
            </>
          )}
        </div>
      </div>

      <AddWalletModal isOpen={showAddWallet} onClose={() => setShowAddWallet(false)} onSuccess={load} />
    </div>
  );
}
