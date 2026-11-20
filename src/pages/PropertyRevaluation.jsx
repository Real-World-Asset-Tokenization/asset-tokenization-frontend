import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Scale, FileText, AlertTriangle } from "lucide-react";
import Navbar from "../components/Navbar";
import { valuationApi } from "../services/valuationApi";
import { parseWholeLkr, referencePriceCents, centsToDecimal, percentChange, lkr, pctLabel, changeClass } from "../lib/lkr";
import { StatusBadge } from "./ValuationApprovals";

const field = "w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60";
const today = () => new Date().toISOString().slice(0, 10);
const empty = { proposedValuation: "", effectiveDate: today(), reason: "", documentReference: "", comments: "" };

// Authorized valuer: enter a new property value. It becomes a PENDING_APPROVAL proposal;
// nothing official changes until an approver approves and it is published on-chain.
export default function PropertyRevaluation() {
  const [perm, setPerm] = useState(null);
  const [assets, setAssets] = useState([]);
  const [assetId, setAssetId] = useState("");
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [mine, setMine] = useState([]);
  const [requests, setRequests] = useState([]);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await valuationApi.permissions();
      setPerm(p);
      if (!p.canPropose) return;
      const [a, props, reqs] = await Promise.all([valuationApi.assets(), valuationApi.proposals(), valuationApi.reviewRequests()]);
      setAssets(a); setMine(props.slice(0, 10)); setRequests(reqs);
    } catch (e) {
      setNotice({ ok: false, text: e.message });
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const asset = assets.find((a) => String(a.assetId) === String(assetId));
  const proposed = parseWholeLkr(form.proposedValuation);
  const preview = asset && proposed ? {
    valuationChange: percentChange(asset.valuation, proposed),
    price: centsToDecimal(referencePriceCents(proposed, asset.tokenSupply)),
    priceChange: percentChange(asset.referencePriceCents, referencePriceCents(proposed, asset.tokenSupply)),
  } : null;
  const minDate = asset?.latestRecord ? asset.latestRecord.effectiveDate.slice(0, 10) : undefined;

  const submit = async (e) => {
    e.preventDefault();
    setNotice(null);
    if (!proposed) return setNotice({ ok: false, text: "Enter the proposed valuation as a whole number of LKR." });
    if (!file && !form.documentReference.trim()) return setNotice({ ok: false, text: "Attach the valuation report or enter its reference number." });
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("assetId", assetId);
      fd.append("currency", "LKR");
      for (const [k, v] of Object.entries(form)) fd.append(k, v);
      if (file) fd.append("document", file);
      const p = await valuationApi.submit(fd);
      setNotice({ ok: true, text: `Proposal submitted for ${p.propertyName}: ${lkr(p.proposedValue)} (${lkr(p.proposedReferencePrice)} per token). It is awaiting approval; the official value has not changed.` });
      setForm(empty); setFile(null); setFileKey((k) => k + 1);
      await load();
    } catch (err) {
      setNotice({ ok: false, text: err.message });
    } finally { setBusy(false); }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3"><Scale className="w-8 h-8 text-indigo-400" /> Property Revaluation</h1>
          <p className="text-zinc-400 mt-1 text-sm">Submit an updated valuation from an independent valuer's report. An authorized approver must approve it before it is published on-chain.</p>
        </div>

        {notice && <p role="status" className={`text-sm p-3 rounded-xl border ${notice.ok ? "border-emerald-500/30 text-emerald-300" : "border-rose-500/30 text-rose-300"}`}>{notice.text}</p>}

        {loading ? <p role="status" className="text-zinc-400">Loading…</p> : !perm?.canPropose ? (
          <p className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-sm">Your account does not have the valuation proposal permission. An operator can grant it with <code className="text-indigo-300">npm run valuation:grant -- your@email PROPOSE</code>.</p>
        ) : (
          <>
            {requests.length > 0 && (
              <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
                <h2 className="font-semibold mb-2">Owner review requests</h2>
                <ul className="text-sm space-y-2">
                  {requests.map((r) => (
                    <li key={r._id} className="flex flex-wrap justify-between gap-2">
                      <span><strong>{r.propertyName}</strong> (#{r.assetId}): {r.reason} <span className="text-zinc-500">— {r.requestedBy?.name}</span></span>
                      <button onClick={() => setAssetId(String(r.assetId))} className="text-blue-300">Revalue this property</button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 items-start">
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
                <h2 className="font-semibold">1. Select property</h2>
                <select className={field} value={assetId} onChange={(e) => { setAssetId(e.target.value); setNotice(null); }}>
                  <option value="">Select a tokenized property…</option>
                  {assets.map((a) => <option key={a.assetId} value={a.assetId}>{a.name} (#{a.assetId})</option>)}
                </select>
                {!assets.length && <p className="text-xs text-zinc-500">No tokenized properties found on-chain.</p>}
                {asset && (
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <Info k="Property ID / token ID" v={`#${asset.assetId}`} />
                    <Info k="Current approved value" v={lkr(asset.valuation)} />
                    <Info k="Reference price / token" v={lkr(asset.referencePrice)} />
                    <Info k="Issued token supply" v={Number(asset.tokenSupply).toLocaleString()} />
                    <Info k="Last valuation date" v={new Date(asset.lastValuationDate).toLocaleDateString()} />
                    <Info k="Valuation version" v={asset.latestVersion} />
                    <div className="col-span-2"><dt className="text-xs text-zinc-500">Token contract (ERC-1155)</dt><dd className="font-mono text-xs break-all">{asset.tokenContract}</dd></div>
                  </dl>
                )}
                {asset?.openProposal && (
                  <p className="text-xs text-amber-300 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />This property already has a proposal that is {asset.openProposal.status.replace("_", " ").toLowerCase()}. It must be approved or rejected before another can be submitted.</p>
                )}
              </section>

              <form onSubmit={submit} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
                <h2 className="font-semibold">2. Enter the new valuation</h2>
                <fieldset disabled={!asset || !!asset.openProposal || busy} className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="text-xs text-zinc-400">Asset<input className={field} value={asset?.name || ""} readOnly /></label>
                    <label className="text-xs text-zinc-400">Existing valuation<input className={field} value={asset ? lkr(asset.valuation) : ""} readOnly /></label>
                    <label className="text-xs text-zinc-400">New proposed valuation (LKR) *
                      <input className={field} inputMode="numeric" placeholder="e.g. 12,000,000" value={form.proposedValuation} onChange={set("proposedValuation")} required />
                    </label>
                    <label className="text-xs text-zinc-400">Currency<select className={field} value="LKR" disabled><option>LKR</option></select></label>
                    <label className="text-xs text-zinc-400">Effective valuation date *
                      <input className={field} type="date" max={today()} min={minDate} value={form.effectiveDate} onChange={set("effectiveDate")} required />
                    </label>
                    <label className="text-xs text-zinc-400">Valuation report reference
                      <input className={field} placeholder="e.g. VAL-2026-0412" value={form.documentReference} onChange={set("documentReference")} />
                    </label>
                  </div>
                  <label className="block text-xs text-zinc-400">Supporting document (PDF, JPG or PNG, max 5 MB)
                    <input key={fileKey} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block mt-1 text-sm" />
                  </label>
                  <label className="block text-xs text-zinc-400">Reason for revaluation *
                    <textarea className={field} rows={3} minLength={10} value={form.reason} onChange={set("reason")} required placeholder="e.g. Six-monthly independent valuation; comparable sales in the area rose 18%" />
                  </label>
                  <label className="block text-xs text-zinc-400">Comments (optional)<textarea className={field} rows={2} value={form.comments} onChange={set("comments")} /></label>
                </fieldset>

                {asset && (
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm space-y-1.5">
                    <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Preview (calculated automatically)</p>
                    <Row k="Current property value" v={lkr(asset.valuation)} />
                    <Row k="Proposed property value" v={proposed ? lkr(proposed.toString()) : "—"} />
                    <Row k="Valuation change" v={<span className={changeClass(preview?.valuationChange)}>{pctLabel(preview?.valuationChange)}</span>} />
                    <Row k="Token supply (fixed)" v={Number(asset.tokenSupply).toLocaleString()} />
                    <Row k="Current reference price" v={lkr(asset.referencePrice)} />
                    <Row k="Proposed reference price" v={preview ? lkr(preview.price) : "—"} bold />
                    <Row k="Reference price change" v={<span className={changeClass(preview?.priceChange)}>{pctLabel(preview?.priceChange)}</span>} />
                  </div>
                )}
                <button disabled={!asset || !!asset?.openProposal || busy} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium disabled:opacity-50">
                  {busy ? "Submitting…" : "Submit for approval"}
                </button>
              </form>
            </div>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex justify-between mb-3"><h2 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> Recent proposals</h2><Link to="/valuations/approvals" className="text-sm text-blue-300">Approvals →</Link></div>
              {!mine.length ? <p className="text-sm text-zinc-500">No proposals yet.</p> : (
                <ul className="divide-y divide-zinc-800 text-sm">
                  {mine.map((p) => (
                    <li key={p.id} className="py-2 flex flex-wrap justify-between gap-2">
                      <span>{p.propertyName}: {lkr(p.previousApprovedValue)} → {lkr(p.proposedValue)} <span className="text-zinc-500">by {p.submittedBy?.name}, {new Date(p.submittedAt).toLocaleDateString()}</span></span>
                      <StatusBadge p={p} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

const Info = ({ k, v }) => <div><dt className="text-xs text-zinc-500">{k}</dt><dd className="font-semibold">{v}</dd></div>;
const Row = ({ k, v, bold }) => <div className={`flex justify-between ${bold ? "font-semibold text-white" : "text-zinc-400"}`}><span>{k}</span><span>{v}</span></div>;
