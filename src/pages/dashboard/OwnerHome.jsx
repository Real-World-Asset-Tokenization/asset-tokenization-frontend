import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  ShieldCheck, FileText, Plus, ArrowRight, ChevronRight, CheckCircle2, Circle, Building2, Clock, RefreshCw,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useOwnerData, effectiveStage, STAGE_LABEL, kycSteps, lkrCompact } from "../../lib/ownerData";
import { resolveUserWallet } from "../../lib/walletResolver";
import OwnerSales from "../../components/owner/OwnerSales";

const card = "rounded-2xl border border-[#1b2440] bg-[#0b1124]";
const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

function ago(d) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return fmtDate(d);
}

const BADGE = {
  tokenized: "border-emerald-500/50 text-emerald-300 bg-emerald-500/10",
  approved: "border-sky-500/50 text-sky-300 bg-sky-500/10",
  pending: "border-indigo-400/50 text-indigo-300 bg-indigo-500/10",
  rejected: "border-rose-500/50 text-rose-300 bg-rose-500/10",
  offchain: "border-amber-500/50 text-amber-300 bg-amber-500/10",
  verified: "border-emerald-500/50 text-emerald-300 bg-emerald-500/10",
  waiting: "border-amber-500/50 text-amber-300 bg-amber-500/10",
  none: "border-[#29345a] text-[#98a2c3] bg-transparent",
};
const Badge = ({ tone, children }) => (
  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium whitespace-nowrap ${BADGE[tone]}`}>
    <span className="w-1.5 h-1.5 rounded-full bg-current" />{children}
  </span>
);

function ProgressRing({ percent }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" className="w-32 h-32" role="img" aria-label={`${percent}% complete`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="#1b2440" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="#22c55e" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} transform="rotate(-90 60 60)" />
      <text x="60" y="66" textAnchor="middle" className="fill-indigo-300" style={{ fontSize: 26, fontWeight: 700 }}>
        {percent}<tspan style={{ fontSize: 14 }}>%</tspan>
      </text>
    </svg>
  );
}

export default function OwnerHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { loading, me, kyc, assets, chain, errors, reload, valueOf } = useOwnerData(user?.token);
  const assetStage = (a) => effectiveStage(a, chain);

  // Only redirect once the signed-in role is known (it defaults to investor while loading).
  useEffect(() => { if (user?.role === "investor") navigate("/dashboard/investor", { replace: true }); }, [user?.role, navigate]);

  const firstName = (me?.name || user?.name || "").split(" ")[0];
  const steps = kycSteps(kyc);
  const kycPercent = Math.round((steps.filter((s) => s.done).length / steps.length) * 100);
  const kycState = kyc?.verificationStatus === "approved" ? "approved" : kyc?.verificationStatus === "rejected" ? "rejected" : kyc ? "in_progress" : "none";

  const stages = assets.map(assetStage);
  const profile = [
    { label: "Account created", done: true, note: me?.createdAt && fmtDate(me.createdAt) },
    { label: "Account verified by administrator", done: Boolean(me?.isVerified) },
    { label: "Wallet linked", done: Boolean(me?.walletAddress || user?.walletAddress) },
    { label: "KYC documents uploaded", done: steps[0].done && steps[1].done },
    { label: "KYC approved", done: steps[3].done },
    { label: "First asset submitted", done: assets.length > 0 },
  ];
  const profilePercent = Math.round((profile.filter((p) => p.done).length / profile.length) * 100);

  const verifiedCount = stages.filter((s) => s === "approved" || s === "tokenized" || s === "offchain").length;
  const pendingCount = stages.filter((s) => s === "pending").length;
  const totalValue = assets.reduce((sum, a) => sum + (valueOf(a) || 0), 0);

  const activity = [
    me?.createdAt && { at: me.createdAt, text: "Account created" },
    kyc?.createdAt && { at: kyc.createdAt, text: "Submitted KYC documents" },
    kyc?.verifiedAt && kyc.verificationStatus === "approved" && { at: kyc.verifiedAt, text: "KYC approved" },
    ...assets.flatMap((a) => [
      a.createdAt && { at: a.createdAt, text: `Submitted ${a.name || a.assetName}` },
      a.verifiedAt && { at: a.verifiedAt, text: `${a.name || a.assetName} ${a.verificationStatus === "rejected" ? "rejected" : "approved"}` },
      a.tokenizedAt && { at: a.tokenizedAt, text: `${a.name || a.assetName} tokenized on-chain` },
    ]),
  ].filter(Boolean).sort((x, y) => new Date(y.at) - new Date(x.at)).slice(0, 6);

  const rowLink = (a) => `/owner/assets/${a.assetId}`;
  const rowNote = (a) => {
    const st = assetStage(a);
    if (st === "tokenized") return `Token #${a.blockchainAssetId}`;
    if (st === "approved") return "Ready to tokenize";
    if (st === "rejected") return "Not approved";
    if (st === "offchain") return "Add it to the blockchain to tokenize";
    return "Awaiting verification";
  };

  const kycTone = kycState === "approved" ? "verified" : kycState === "rejected" ? "rejected" : kycState === "in_progress" ? "waiting" : "none";
  const kycLabel = { approved: "Verified", rejected: "Rejected", in_progress: "Pending", none: "Not started" }[kycState];
  const docTone = kyc?.documentAuthentic ? "verified" : steps[2].done ? "rejected" : "none";
  const docLabel = kyc?.documentAuthentic ? "Verified" : steps[2].done ? "Not confirmed" : "Not checked";
  const ownTone = verifiedCount ? "verified" : pendingCount ? "waiting" : "none";
  const ownLabel = verifiedCount ? `Verified (${verifiedCount}/${assets.length})` : pendingCount ? "Pending" : "No assets";

  return (
    <div className="px-4 sm:px-8 py-8 space-y-6 max-w-[1400px]">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{firstName ? `Welcome back, ${firstName}` : "Welcome back"}</h1>
          <p className="mt-1 text-[#98a2c3]">Your verification status, submitted assets and compliance position in one place.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/owner/kyc/status" className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#1b2440] bg-[#0e1426] font-semibold hover:bg-[#141c33]"><FileText className="w-4 h-4" /> KYC status</Link>
          <Link to="/owner/assets/new" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white"><Plus className="w-4 h-4" /> Submit asset</Link>
        </div>
      </div>

      {Object.keys(errors).length > 0 && !loading && (
        <p role="alert" className="text-sm text-amber-300 flex items-center gap-2">
          Some information could not be loaded ({Object.keys(errors).join(", ")}). <button onClick={reload} className="underline flex items-center gap-1"><RefreshCw className="w-3 h-3" />Retry</button>
        </p>
      )}

      <OwnerSales wallet={resolveUserWallet(user)} />

      <div className="grid xl:grid-cols-[1fr_380px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {/* KYC */}
          <section className={`${card} p-6 flex flex-col sm:flex-row gap-6 sm:items-center justify-between`}>
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[#98a2c3]"><ShieldCheck className="w-4 h-4 text-indigo-400" /> Know your customer</p>
              {loading ? <p className="text-[#98a2c3]">Loading…</p> : (
                <>
                  <h2 className="text-2xl font-bold">
                    {{ approved: "Identity verified", rejected: "Identity verification rejected", in_progress: "Identity verification in progress", none: "Identity verification required" }[kycState]}
                  </h2>
                  <p className="text-[#98a2c3] max-w-xl">
                    {kycState === "approved" && `Your identity was verified${kyc.verifiedAt ? ` on ${fmtDate(kyc.verifiedAt)}` : ""}. Approvers can now confirm you own the assets you submit.`}
                    {kycState === "rejected" && (kyc.rejectionReason || "Your verification was not approved. Upload clearer documents and try again.")}
                    {kycState === "in_progress" && `Next step: ${steps.find((s) => !s.done)?.label.toLowerCase()}.`}
                    {kycState === "none" && "Verify your identity so approvers can confirm you own the assets you submit. You need an ID document and a selfie."}
                  </p>
                  <Link to={kycState === "approved" ? "/owner/kyc/status" : "/owner/kyc"} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                    {kycState === "approved" ? "View KYC details" : kycState === "none" ? "Start KYC verification" : "Continue KYC verification"} <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              )}
            </div>
            <div className="flex flex-col items-center shrink-0">
              <ProgressRing percent={loading ? 0 : kycPercent} />
              <p className="text-sm text-[#98a2c3] mt-1">Verification progress</p>
            </div>
          </section>

          {/* Submitted assets */}
          <section className={card}>
            <div className="p-6 pb-3 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Submitted assets</h2>
                <p className="text-sm text-[#98a2c3]">Assets you have put forward for verification and tokenization.</p>
              </div>
              <Link to="/owner/assets" className="px-4 py-2 rounded-xl border border-[#1b2440] bg-[#0e1426] text-sm font-semibold hover:bg-[#141c33] whitespace-nowrap">View all</Link>
            </div>
            {loading ? <p className="px-6 pb-6 text-[#98a2c3]">Loading your assets…</p> : !assets.length ? (
              <div className="px-6 pb-6 text-[#98a2c3]">You haven't submitted any assets yet. <Link to="/owner/assets/new" className="text-indigo-300">Submit your first asset →</Link></div>
            ) : (
              <ul>
                {[...assets].sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt)).slice(0, 4).map((a) => {
                  const st = assetStage(a);
                  return (
                    <li key={a._id || a.assetId} className="border-t border-[#1b2440] first:border-t-0">
                      <Link to={rowLink(a)} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 hover:bg-[#0e1426]">
                        {a.imageUrl ? <img src={a.imageUrl} alt="" className="hidden sm:block w-20 h-14 rounded-lg object-cover shrink-0" /> : (
                          <span className="hidden sm:flex w-20 h-14 rounded-lg bg-gradient-to-br from-indigo-900/60 to-[#141c33] items-center justify-center shrink-0"><Building2 className="w-6 h-6 text-indigo-300" /></span>
                        )}
                        <span className="flex-1 min-w-0">
                          <span className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                            <span className="font-semibold truncate">{a.name || a.assetName}</span>
                            <span className="shrink-0"><Badge tone={st}>{STAGE_LABEL[st]}</Badge></span>
                          </span>
                          <span className="block text-sm text-[#98a2c3] truncate mt-0.5">
                            {[a.symbol, a.location, (a.propertyType || a.assetType || "").replace("_", " ")].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span className="text-right shrink-0 max-w-[45%] sm:max-w-[14rem]">
                          <span className="block font-semibold">{lkrCompact(valueOf(a))}</span>
                          <span className="block text-xs sm:text-sm text-[#6b7599] truncate">{rowNote(a)}</span>
                        </span>
                        <ChevronRight className="hidden sm:block w-5 h-5 text-[#6b7599] shrink-0" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {/* Profile completion */}
          <section className={`${card} p-6`}>
            <h2 className="text-lg font-bold mb-4">Profile completion</h2>
            <div className="flex justify-between text-sm mb-2"><span className="text-[#98a2c3]">Overall</span><span className="font-semibold">{loading ? "…" : `${profilePercent}%`}</span></div>
            <div className="h-2 rounded-full bg-[#1b2440] overflow-hidden"><div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${loading ? 0 : profilePercent}%` }} /></div>
            <ul className="mt-4 space-y-2.5 text-sm">
              {profile.map((p) => (
                <li key={p.label} className={`flex items-center gap-2.5 ${p.done ? "text-[#dde2f2]" : "text-[#6b7599]"}`}>
                  {p.done ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4" />}
                  <span>{p.label}</span>
                  {p.note && <span className="ml-auto text-xs text-[#6b7599]">{p.note}</span>}
                </li>
              ))}
            </ul>
          </section>

          {/* Compliance */}
          <section className={`${card} p-6`}>
            <h2 className="text-lg font-bold mb-4">Compliance status</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between gap-3"><span className="text-[#c3cae2]">Identity verification</span><Badge tone={kycTone}>{kycLabel}</Badge></li>
              <li className="flex items-center justify-between gap-3"><span className="text-[#c3cae2]">Identity document authenticity</span><Badge tone={docTone}>{docLabel}</Badge></li>
              <li className="flex items-center justify-between gap-3"><span className="text-[#c3cae2]">Asset ownership</span><Badge tone={ownTone}>{ownLabel}</Badge></li>
            </ul>
            <p className="mt-4 pt-4 border-t border-[#1b2440] text-sm text-[#6b7599]">
              {assets.length
                ? `${assets.length} registered asset${assets.length === 1 ? "" : "s"} valued at ${lkrCompact(totalValue)} (tokenized assets at their latest on-chain valuation).`
                : "No registered assets yet."}
            </p>
          </section>

          {/* Activity */}
          <section className={`${card} p-6`}>
            <h2 className="text-lg font-bold mb-4">Recent activity</h2>
            {!activity.length ? <p className="text-sm text-[#6b7599]">{loading ? "Loading…" : "No activity yet."}</p> : (
              <ol className="space-y-3">
                {activity.map((e, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <Circle className="w-2.5 h-2.5 mt-1.5 fill-indigo-400 text-indigo-400 shrink-0" />
                    <span className="flex-1"><span className="block text-[#dde2f2]">{e.text}</span><span className="text-xs text-[#6b7599]">{ago(e.at)}</span></span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

