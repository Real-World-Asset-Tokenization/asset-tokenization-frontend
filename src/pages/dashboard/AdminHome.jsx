import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, ShieldCheck, Building2, Coins, Scale, ChevronRight, RefreshCw, ClipboardCheck } from "lucide-react";
import api, { authAPI, kycAPI } from "../../lib/api";
import { valuationApi } from "../../services/valuationApi";
import { useCurrency } from "../../context/CurrencyContext";
import { Card, CardLink, PageHeader, ActionButton, Stat, Badge, Empty, ago, pageClass } from "../../components/ui/dash";

const ROLE_LABEL = { investor: "Investors", asset_owner: "Asset owners", compliance_officer: "Compliance officers", admin: "Admins" };
const STATUS_TONE = { approved: "good", rejected: "bad", pending: "warn", under_review: "info" };

// Admin / compliance home: work queues and platform totals from live data.
export default function AdminHome() {
  const { formatLKR, formatMUSD } = useCurrency();
  const [d, setD] = useState(null);
  const [errors, setErrors] = useState([]);

  const load = useCallback(async () => {
    setD(null); setErrors([]);
    const errs = [];
    const safe = (p, label, fallback) => p.catch(() => { errs.push(label); return fallback; });
    const perms = await valuationApi.permissions().catch(() => ({}));
    const canSee = perms.canApprove || perms.canPropose;
    const [users, assets, kyc, chain, pending, approved, requests] = await Promise.all([
      safe(authAPI.getAllUsers().then((r) => r.data.data.users), "users", []),
      safe(kycAPI.getAllAssets().then((r) => r.data.data.assets), "assets", []),
      safe(api.get("/kyc/admin/summary").then((r) => r.data.data), "KYC summary", null),
      safe(valuationApi.assets(), "on-chain assets", []),
      canSee ? safe(valuationApi.proposals({ status: "PENDING_APPROVAL" }), "valuation proposals", []) : [],
      canSee ? safe(valuationApi.proposals({ status: "APPROVED" }), "valuation proposals", []) : [],
      canSee ? safe(valuationApi.reviewRequests(), "review requests", []) : [],
    ]);
    setErrors([...new Set(errs)]);
    setD({ perms, canSee, users, assets, kyc, chain, pending, approved, requests });
  }, []);

  useEffect(() => { load(); }, [load]);

  const loading = d == null;
  const v = (x) => (loading ? "…" : x);
  const byRole = d ? d.users.reduce((m, u) => ({ ...m, [u.role]: (m[u.role] || 0) + 1 }), {}) : {};
  const kycQueue = d?.kyc ? (d.kyc.counts.pending || 0) + (d.kyc.counts.under_review || 0) : null;
  const assetQueue = d ? d.assets.filter((a) => ["pending", "under_review"].includes(a.verificationStatus)) : [];
  const unverifiedUsers = d ? d.users.filter((u) => !u.isVerified).length : 0;
  const chainValue = d ? d.chain.reduce((s, a) => s + Number(a.valuation), 0) : 0;
  const failedPublications = d ? d.approved.filter((p) => p.blockchainPublicationStatus === "FAILED") : [];

  const queue = d ? [
    { label: "KYC submissions to review", count: kycQueue, to: "/dashboard/admin" },
    { label: "Assets awaiting verification", count: assetQueue.length, to: "/dashboard/admin" },
    { label: "Accounts not yet verified", count: unverifiedUsers, to: "/dashboard/admin" },
    d.canSee && { label: "Valuations awaiting approval", count: d.pending.length, to: "/valuations/approvals" },
    d.canSee && failedPublications.length > 0 && { label: "Valuation publications failed", count: failedPublications.length, to: "/valuations/approvals", bad: true },
    d.canSee && { label: "Owner revaluation requests", count: d.requests.length, to: "/valuations/revalue" },
  ].filter(Boolean) : [];

  return (
    <div className={pageClass}>
      <PageHeader
        title="Platform overview"
        subtitle="Review queues, verification activity and tokenized properties."
        actions={<>
          <ActionButton onClick={load} icon={RefreshCw}>Refresh</ActionButton>
          <ActionButton to="/dashboard/admin" primary icon={ClipboardCheck}>Review queue</ActionButton>
        </>}
      />

      {errors.length > 0 && <p role="alert" className="text-sm text-amber-300">Could not load: {errors.join(", ")}.</p>}

      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-3 sm:gap-4">
        <Stat label="Users" icon={Users} value={v(d?.users.length)} note={loading ? "" : `${byRole.investor || 0} investors · ${byRole.asset_owner || 0} owners`} />
        <Stat label="KYC to review" icon={ShieldCheck} to="/dashboard/admin" tone={kycQueue ? "warn" : undefined}
          value={v(kycQueue ?? "—")} note={loading || !d.kyc ? "" : `${d.kyc.counts.approved || 0} approved of ${d.kyc.total}`} />
        <Stat label="Assets to verify" icon={Building2} to="/dashboard/admin" tone={assetQueue.length ? "warn" : undefined}
          value={v(assetQueue.length)} note={loading ? "" : `${d.assets.length} submitted in total`} />
        <Stat label="Tokenized properties" icon={Coins} value={v(d?.chain.length)} note={loading ? "" : `${formatLKR(chainValue, { compact: true })} approved value`} />
        <Stat label="Valuations pending" icon={Scale} to="/valuations/approvals" tone={d?.pending?.length ? "warn" : undefined}
          value={v(d?.canSee ? d.pending.length : "—")} note={loading ? "" : d.canSee ? "Awaiting approval" : "Needs valuation permission"} />
      </div>

      <div className="grid xl:grid-cols-[1fr_380px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <Card title="Recent asset submissions" padded={false} action={<CardLink to="/dashboard/admin">Review</CardLink>}>
            {loading ? <p className="px-6 pb-6 text-[#98a2c3]">Loading…</p> : !d.assets.length ? <div className="px-6 pb-6"><Empty>No assets submitted yet.</Empty></div> : (
              <ul>
                {[...d.assets].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6).map((a) => (
                  <li key={a._id || a.assetId} className="border-t border-[#1b2440] first:border-t-0 flex items-center gap-3 px-5 sm:px-6 py-3.5">
                    <span className="w-10 h-10 rounded-xl bg-[#141c33] flex items-center justify-center shrink-0"><Building2 className="w-5 h-5 text-indigo-300" /></span>
                    <span className="flex-1 min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold truncate">{a.assetName || a.name}</span>
                        <Badge tone={STATUS_TONE[a.verificationStatus] || "muted"}>{(a.verificationStatus || "unknown").replace("_", " ")}</Badge>
                      </span>
                      <span className="block text-sm text-[#98a2c3] truncate">{[a.owner?.name, a.location].filter(Boolean).join(" · ") || "—"}</span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block font-semibold">{formatLKR(a.valuation, { compact: true })}</span>
                      <span className="block text-xs text-[#6b7599]">{a.createdAt ? ago(a.createdAt) : ""}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Tokenized properties" subtitle="Official values from the blockchain." padded={false} action={<CardLink to="/valuations/revalue">Revalue</CardLink>}>
            {loading ? <p className="px-6 pb-6 text-[#98a2c3]">Loading…</p> : !d.chain.length ? <div className="px-6 pb-6"><Empty>No tokenized properties on-chain.</Empty></div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-[#6b7599]">
                    <tr>{["Property", "Approved value", "Price / token", "Tokens", "Version"].map((h) => <th key={h} className="px-5 sm:px-6 py-2 font-semibold whitespace-nowrap">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {d.chain.map((a) => (
                      <tr key={a.assetId} className="border-t border-[#1b2440]">
                        <td className="px-5 sm:px-6 py-3 font-semibold whitespace-nowrap">{a.name} <span className="text-[#6b7599] font-normal">#{a.assetId}</span></td>
                        <td className="px-5 sm:px-6 py-3 whitespace-nowrap">{formatLKR(a.valuation, { showCode: true })}</td>
                        <td className="px-5 sm:px-6 py-3 whitespace-nowrap">{formatLKR(a.referencePrice, { showCode: true })}</td>
                        <td className="px-5 sm:px-6 py-3">{Number(a.tokenSupply).toLocaleString()}</td>
                        <td className="px-5 sm:px-6 py-3">v{a.latestVersion}{a.openProposal && <span className="ml-2"><Badge tone="warn">proposal open</Badge></span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Needs attention">
            {loading ? <Empty>Loading…</Empty> : (
              <ul className="space-y-1">
                {queue.map((q) => (
                  <li key={q.label}>
                    <Link to={q.to} className="flex items-center gap-3 px-3 py-2.5 -mx-3 rounded-xl hover:bg-[#141c33]">
                      <span className={`min-w-8 h-8 px-2 rounded-lg flex items-center justify-center text-sm font-bold ${q.bad ? "bg-rose-500/15 text-rose-300" : q.count ? "bg-amber-500/15 text-amber-300" : "bg-[#141c33] text-[#6b7599]"}`}>{q.count ?? "—"}</span>
                      <span className="flex-1 text-sm text-[#c3cae2]">{q.label}</span>
                      <ChevronRight className="w-4 h-4 text-[#6b7599]" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Recent KYC submissions" action={<CardLink to="/dashboard/admin">Open</CardLink>}>
            {loading ? <Empty>Loading…</Empty> : !d.kyc?.recent?.length ? <Empty>No KYC submissions yet.</Empty> : (
              <ul className="space-y-3">
                {d.kyc.recent.map((k, i) => (
                  <li key={`${k.userId}-${i}`} className="flex items-center gap-3 text-sm">
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-[#dde2f2]">{k.name || "Unknown user"}</span>
                      <span className="block text-xs text-[#6b7599]">{(k.role || "").replace("_", " ")} · {ago(k.submittedAt)}</span>
                    </span>
                    <Badge tone={STATUS_TONE[k.status] || "muted"}>{(k.status || "").replace("_", " ")}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Users by role">
            {loading ? <Empty>Loading…</Empty> : (
              <ul className="space-y-3">
                {Object.entries(ROLE_LABEL).map(([role, label]) => {
                  const n = byRole[role] || 0;
                  return (
                    <li key={role} className="text-sm">
                      <div className="flex justify-between mb-1"><span className="text-[#c3cae2]">{label}</span><span className="font-semibold">{n}</span></div>
                      <div className="h-1.5 rounded-full bg-[#1b2440] overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${d.users.length ? (n / d.users.length) * 100 : 0}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
