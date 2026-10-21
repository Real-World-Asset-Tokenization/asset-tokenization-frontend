import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, Building2, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCurrency } from "../../context/CurrencyContext";
import { useOwnerData, effectiveStage, STAGE_LABEL } from "../../lib/ownerData";
import { PageHeader, ActionButton, Stat, Badge, cardClass, fmtDate, pageClass } from "../../components/ui/dash";

export const STAGE_TONE = { tokenized: "good", approved: "info", pending: "brand", rejected: "bad", offchain: "warn" };
export const humanType = (a) => (a.propertyType || a.assetType || "").replace(/_/g, " ");

// "My assets": every property this owner submitted, read from Azure, with the
// tokenized status checked against the current chain.
export default function OwnerAssets() {
  const { user } = useAuth();
  const { formatLKR } = useCurrency();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { loading, assets, chain, errors, reload, valueOf } = useOwnerData(user?.token);
  const [search, setSearch] = useState(params.get("q") || "");
  const [status, setStatus] = useState("all");
  useEffect(() => { setSearch(params.get("q") || ""); }, [params]);

  const stageOf = (a) => effectiveStage(a, chain);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...assets]
      .filter((a) => status === "all" || stageOf(a) === status)
      .filter((a) => !q || [a.name, a.assetName, a.symbol, a.location].filter(Boolean).join(" ").toLowerCase().includes(q))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [assets, chain, search, status]);

  const tokenized = assets.filter((a) => stageOf(a) === "tokenized").length;
  const combined = assets.reduce((s, a) => s + (Number(valueOf(a)) || 0), 0);
  const v = (x) => (loading ? "…" : x);

  const onSearch = (value) => {
    setSearch(value);
    const next = new URLSearchParams(params);
    if (value) next.set("q", value); else next.delete("q");
    setParams(next, { replace: true });
  };

  return (
    <div className={pageClass}>
      <PageHeader
        title="My assets"
        subtitle="Land you have submitted for verification, and the tokens created from the approved ones."
        actions={<ActionButton to="/owner/assets/new" primary icon={Plus}>Submit asset</ActionButton>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Stat label="Submitted assets" icon={Building2} value={v(assets.length)} />
        <Stat label="Combined valuation" value={v(formatLKR(combined, { compact: true }))} note="Approved on-chain value where tokenized" />
        <Stat label="Tokenized" value={v(`${tokenized} of ${assets.length}`)} note="On the current blockchain" />
      </div>

      {(errors.assets || errors.chain) && (
        <p role="alert" className="text-sm text-amber-300 flex flex-wrap items-center gap-2">
          {errors.assets ? "Could not load your assets." : "Could not read the blockchain; tokenized status may be out of date."}
          <button onClick={reload} className="underline inline-flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Retry</button>
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <label className="relative flex-1">
          <span className="sr-only">Search your assets</span>
          <Search className="w-4 h-4 text-[#6b7599] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search your assets by name, reference or location"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#1b2440] bg-[#0b1124] text-white placeholder-[#6b7599] outline-none focus:border-indigo-500"
          />
        </label>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="sm:w-56 px-3 py-2.5 rounded-xl border border-[#1b2440] bg-[#0b1124] text-white outline-none focus:border-indigo-500"
        >
          <option value="all">All statuses</option>
          {["pending", "offchain", "approved", "tokenized", "rejected"].map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
        </select>
      </div>

      <section className={`${cardClass} overflow-hidden`}>
        {loading ? (
          <p className="p-6 text-[#98a2c3]">Loading your assets…</p>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[#98a2c3]">{assets.length ? "No assets match this search." : "You have not submitted any assets yet."}</p>
            {!assets.length && <Link to="/owner/assets/new" className="inline-block mt-3 text-indigo-300 font-semibold">Submit your first asset →</Link>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-[#98a2c3] border-b border-[#1b2440]">
                  <th className="px-5 py-3.5">Asset</th>
                  <th className="px-5 py-3.5 hidden md:table-cell">Type</th>
                  <th className="px-5 py-3.5 text-right">Valuation</th>
                  <th className="px-5 py-3.5 hidden sm:table-cell">Status</th>
                  <th className="px-5 py-3.5 hidden lg:table-cell">Token</th>
                  <th className="px-5 py-3.5 text-right hidden sm:table-cell">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const st = stageOf(a);
                  const open = () => navigate(`/owner/assets/${a.assetId}`);
                  return (
                    <tr key={a._id || a.assetId} onClick={open} className="border-b border-[#1b2440] last:border-0 hover:bg-[#0e1426] cursor-pointer">
                      <td className="px-5 py-3.5">
                        <Link to={`/owner/assets/${a.assetId}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 min-w-0">
                          {a.imageUrl
                            ? <img src={a.imageUrl} alt="" className="hidden sm:block w-14 h-10 rounded-lg object-cover shrink-0" />
                            : <span className="hidden sm:flex w-14 h-10 rounded-lg bg-gradient-to-br from-indigo-900/60 to-[#141c33] items-center justify-center shrink-0"><Building2 className="w-5 h-5 text-indigo-300" /></span>}
                          <span className="min-w-0">
                            <span className="block font-semibold text-white truncate">{a.name || a.assetName}</span>
                            <span className="block text-xs text-[#98a2c3] truncate">{[a.symbol, a.location].filter(Boolean).join(" · ")}</span>
                            <span className="sm:hidden block mt-1.5"><Badge tone={STAGE_TONE[st]}>{STAGE_LABEL[st]}</Badge></span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell capitalize text-[#c3cae2]">{humanType(a) || "—"}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-white whitespace-nowrap">{formatLKR(valueOf(a), { compact: true })}</td>
                      <td className="px-5 py-3.5 hidden sm:table-cell"><Badge tone={STAGE_TONE[st]}>{STAGE_LABEL[st]}</Badge></td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        {st === "tokenized" ? <span className="text-indigo-300 font-medium">Token #{a.blockchainAssetId}</span> : <span className="text-[#6b7599]">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right text-[#c3cae2] whitespace-nowrap hidden sm:table-cell">{a.createdAt ? fmtDate(a.createdAt) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
