import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, RefreshCw } from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { valuationApi } from "../services/valuationApi";
import { lkr, pctLabel, changeClass } from "../lib/lkr";

const TABS = [
  ["PENDING_APPROVAL", "Awaiting approval"],
  ["APPROVED", "Approved – publishing"],
  ["PUBLISHED,REJECTED", "Completed"],
];

export function StatusBadge({ p }) {
  const map = {
    PENDING_APPROVAL: ["Awaiting approval", "bg-amber-500/10 text-amber-300 border-amber-500/30"],
    REJECTED: ["Rejected", "bg-rose-500/10 text-rose-300 border-rose-500/30"],
    PUBLISHED: ["Published on-chain", "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"],
    APPROVED: [p.blockchainPublicationStatus === "FAILED" ? "Publication failed" : "Publishing…",
      p.blockchainPublicationStatus === "FAILED" ? "bg-rose-500/10 text-rose-300 border-rose-500/30" : "bg-blue-500/10 text-blue-300 border-blue-500/30"],
  };
  const [label, cls] = map[p.status] || [p.status, "bg-zinc-800 text-zinc-300 border-zinc-700"];
  return <span className={`px-2.5 py-0.5 rounded-full text-xs border ${cls}`}>{label}</span>;
}

// Authorized approver: review proposals, approve (which publishes on-chain) or reject,
// and retry publications that failed.
export default function ValuationApprovals() {
  const { user } = useAuth();
  const myId = String(user?._id || user?.id || "");
  const [perm, setPerm] = useState(null);
  const [tab, setTab] = useState(TABS[0][0]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);
  const [rejecting, setRejecting] = useState({ id: null, reason: "" });
  const [audit, setAudit] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await valuationApi.permissions();
      setPerm(p);
      if (p.canApprove || p.canPropose) setItems(await valuationApi.proposals({ status: tab }));
    } catch (e) { setNotice({ ok: false, text: e.message }); }
    finally { setLoading(false); }
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  const act = async (id, fn, ok) => {
    setBusy(id); setNotice(null);
    try {
      const r = await fn();
      if (r.publicationError) setNotice({ ok: false, text: `Approved, but blockchain publication failed: ${r.publicationError}. The official value is unchanged. Use "Retry publication".` });
      else setNotice({ ok: true, text: typeof ok === "function" ? ok(r) : ok });
      setRejecting({ id: null, reason: "" });
      await load();
    } catch (e) { setNotice({ ok: false, text: e.message }); }
    finally { setBusy(null); }
  };

  const showAudit = async (id) => {
    if (audit[id]) return setAudit((a) => ({ ...a, [id]: null }));
    try { const d = await valuationApi.proposal(id); setAudit((a) => ({ ...a, [id]: d.auditLog })); } catch (e) { setNotice({ ok: false, text: e.message }); }
  };

  const published = (r) => `Published as version ${r.valuationVersion}. New reference price ${lkr(r.approvedReferencePrice)} per token (tx ${String(r.blockchainTransactionHash).slice(0, 10)}…).`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3"><ClipboardCheck className="w-8 h-8 text-emerald-400" /> Valuation Approvals</h1>
            <p className="text-zinc-400 mt-1 text-sm">Approving locks the value and publishes it to the blockchain. The reference price updates only after the transaction is confirmed.</p>
          </div>
          <div className="flex gap-3 items-center">
            <Link to="/valuations/revalue" className="text-sm text-blue-300">New proposal →</Link>
            <button onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-zinc-800 hover:bg-zinc-900"><RefreshCw className="w-4 h-4" /> Refresh</button>
          </div>
        </div>

        {notice && <p role="status" className={`text-sm p-3 rounded-xl border ${notice.ok ? "border-emerald-500/30 text-emerald-300" : "border-rose-500/30 text-rose-300"}`}>{notice.text}</p>}

        {perm && !perm.canApprove && !perm.canPropose ? (
          <p className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-sm">Your account does not have valuation permissions.</p>
        ) : (
          <>
            {perm && !perm.canApprove && <p className="text-xs text-amber-300">You can view proposals but not approve them (no approve permission).</p>}
            <div className="flex flex-wrap gap-2">
              {TABS.map(([v, label]) => (
                <button key={v} onClick={() => setTab(v)} aria-pressed={tab === v}
                  className={`px-4 py-2 rounded-xl text-sm border ${tab === v ? "bg-indigo-600 border-indigo-500" : "border-zinc-700 text-zinc-300"}`}>{label}</button>
              ))}
            </div>

            {loading ? <p role="status" className="text-zinc-400">Loading…</p> : !items.length ? <p className="text-zinc-500 text-sm">Nothing here.</p> : items.map((p) => {
              const own = p.submittedBy?.userId === (perm?.userId || myId);
              return (
                <article key={p.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <h2 className="font-bold">{p.propertyName} <span className="text-zinc-500 font-normal">· asset #{p.assetId}{p.valuationVersion ? ` · version ${p.valuationVersion}` : ""}</span></h2>
                      <p className="text-xs text-zinc-500">Source: {p.source} · submitted by {p.submittedBy?.name} ({p.submittedBy?.role}) on {new Date(p.submittedAt).toLocaleString()}</p>
                    </div>
                    <StatusBadge p={p} />
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                    <Tile k="Previous approved value" v={lkr(p.previousApprovedValue)} />
                    <Tile k="Proposed value" v={lkr(p.proposedValue)} note={<span className={changeClass(p.valuationChangePercent)}>{pctLabel(p.valuationChangePercent)}</span>} />
                    <Tile k="Reference price / token" v={`${lkr(p.previousReferencePrice)} → ${lkr(p.approvedReferencePrice || p.proposedReferencePrice)}`} note={`${Number(p.existingTokenSupply).toLocaleString()} tokens (unchanged)`} />
                    <Tile k="Effective date" v={new Date(p.valuationEffectiveDate).toLocaleDateString()} />
                  </div>

                  <div className="text-sm space-y-1">
                    <p><span className="text-zinc-500">Reason:</span> {p.submissionReason}</p>
                    {p.comments && <p><span className="text-zinc-500">Comments:</span> {p.comments}</p>}
                    <p><span className="text-zinc-500">Evidence:</span> {p.supportingDocument?.reference || "—"}{p.supportingDocument?.fileName && ` · file ${p.supportingDocument.fileName}`}
                      <span className="block font-mono text-xs text-zinc-500 break-all">hash {p.supportingDocument?.hash}</span></p>
                    {p.status === "REJECTED" && <p className="text-rose-300">Rejected by {p.rejectedBy?.name}: {p.rejectionReason}</p>}
                    {p.approvedBy && <p className="text-zinc-400">Approved by {p.approvedBy.name} on {new Date(p.approvalTimestamp).toLocaleString()}{p.selfApproved && " (self-approved — prototype setting)"}</p>}
                    {p.blockchainTransactionHash && <p className="font-mono text-xs text-zinc-400 break-all">Tx {p.blockchainTransactionHash}{p.blockchainBlockNumber ? ` · block ${p.blockchainBlockNumber}` : ""}</p>}
                    {p.lastPublicationError && <p className="text-rose-300 text-xs">Last publication error: {p.lastPublicationError}</p>}
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    {perm?.canApprove && p.status === "PENDING_APPROVAL" && (own && !perm.selfApprovalAllowed ? (
                      <span className="text-xs text-amber-300">You submitted this proposal, so a different approver must review it.</span>
                    ) : rejecting.id === p.id ? (
                      <form className="flex flex-wrap gap-2 w-full" onSubmit={(e) => { e.preventDefault(); act(p.id, () => valuationApi.reject(p.id, rejecting.reason), "Proposal rejected. The official value is unchanged."); }}>
                        <input autoFocus required minLength={5} value={rejecting.reason} onChange={(e) => setRejecting({ id: p.id, reason: e.target.value })} placeholder="Reason for rejection" className="flex-1 min-w-0 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm" />
                        <button disabled={busy === p.id} className="px-4 py-2 bg-rose-600 rounded-xl text-sm disabled:opacity-50">Confirm reject</button>
                        <button type="button" onClick={() => setRejecting({ id: null, reason: "" })} className="px-4 py-2 bg-zinc-800 rounded-xl text-sm">Cancel</button>
                      </form>
                    ) : (
                      <>
                        <button disabled={busy != null} onClick={() => act(p.id, () => valuationApi.approve(p.id), published)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-medium disabled:opacity-50">
                          {busy === p.id ? "Approving & publishing…" : "Approve & publish"}
                        </button>
                        <button disabled={busy != null} onClick={() => setRejecting({ id: p.id, reason: "" })} className="px-4 py-2 border border-zinc-700 text-rose-300 rounded-xl text-sm disabled:opacity-50">Reject</button>
                      </>
                    ))}
                    {perm?.canApprove && p.status === "APPROVED" && (
                      <button disabled={busy != null} onClick={() => act(p.id, () => valuationApi.publish(p.id), published)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm disabled:opacity-50">
                        {busy === p.id ? "Publishing…" : "Retry publication"}
                      </button>
                    )}
                    <button onClick={() => showAudit(p.id)} className="text-sm text-blue-300">{audit[p.id] ? "Hide" : "Show"} audit log</button>
                  </div>

                  {audit[p.id] && (
                    <ol className="text-xs space-y-1 border-t border-zinc-800 pt-3">
                      {audit[p.id].map((l) => (
                        <li key={l._id}><span className="text-zinc-500">{new Date(l.timestamp).toLocaleString()}</span> · <strong>{l.action}</strong> by {l.actor?.name}{l.reason ? ` — ${l.reason}` : ""}{l.blockchainTransactionHash ? ` · tx ${l.blockchainTransactionHash.slice(0, 10)}…` : ""}</li>
                      ))}
                    </ol>
                  )}
                </article>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
}

const Tile = ({ k, v, note }) => (
  <div className="rounded-xl border border-zinc-800 p-3"><p className="text-xs text-zinc-400">{k}</p><p className="font-semibold mt-1">{v}</p>{note && <p className="text-xs mt-1">{note}</p>}</div>
);
