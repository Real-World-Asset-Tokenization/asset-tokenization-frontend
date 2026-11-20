import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useCurrency } from "../context/CurrencyContext";
import { useRole } from "../context/RoleContext";
import { fetchTokenizationStatus } from "../services/tokenizationService";
import {
  ShieldCheck, CheckCircle2, Circle, ShoppingBag, Printer, Copy, Check, RefreshCw, Wallet, FileText, Hash, Building2,
} from "lucide-react";
import { Card, ActionButton, Skeleton, fmtDate, pageClass } from "../components/ui/dash";

// A value that can be copied, shown in a mono pill (addresses and receipt IDs are long).
function CopyField({ label, value, icon: Icon }) {
  const [done, setDone] = useState(false);
  if (!value) return null;
  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1800); }).catch(() => {});
  };
  return (
    <div className="rounded-xl border border-[#1b2440] bg-[#0e1426] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-[#98a2c3]">{Icon && <Icon className="w-3.5 h-3.5" />}{label}</p>
        <button type="button" onClick={copy} aria-label={`Copy ${label}`} className="no-print inline-flex items-center gap-1 text-xs font-semibold text-[#98a2c3] hover:text-white">
          {done ? <><Check className="w-3.5 h-3.5 text-emerald-300" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
        </button>
      </div>
      <p className="mt-1.5 font-mono text-[13px] text-white break-all">{value}</p>
    </div>
  );
}

function Step({ done, title, text }) {
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 w-6 h-6 shrink-0 rounded-full flex items-center justify-center border ${done ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : "border-[#29345a] text-[#98a2c3]"}`}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-3 h-3" />}
      </span>
      <div><p className="font-semibold text-white leading-tight">{title}</p><p className="text-sm text-[#98a2c3] mt-0.5">{text}</p></div>
    </li>
  );
}

export default function TokenizationStatus() {
  const { assetId } = useParams();
  const { formatLKR } = useCurrency();
  const { isInvestor } = useRole();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchTokenizationStatus(assetId));
    } catch (err) {
      console.error("Error loading tokenization status:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => { if (assetId) load(); }, [assetId, load]);

  if (loading) {
    return (
      <div className={pageClass} role="status" aria-label="Loading receipt">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={pageClass}>
        <Card title="We couldn't load this receipt" subtitle="The record could not be read from the blockchain or the server. Check that the backend is running, then try again.">
          <div className="flex flex-wrap gap-3">
            <ActionButton onClick={load} icon={RefreshCw}>Try again</ActionButton>
            <ActionButton to="/verified-assets">Back to verified assets</ActionButton>
          </div>
        </Card>
      </div>
    );
  }

  const record = data.databaseRecord;
  const onChain = data.onChainStatus;
  const name = record?.assetName || onChain?.name || `Asset #${assetId}`;
  const valuation = record?.approvedValuation ?? onChain?.valuationLKR ?? null;
  const supply = record?.approvedTokenSupply ?? onChain?.totalShares ?? null;
  const price = record?.calculatedReferencePrice ?? (valuation != null && supply ? valuation / supply : null);
  const owner = record?.ownerWallet || onChain?.issuer || "";
  const minted = Boolean(record?.mintingTxHash);
  const registered = Boolean(onChain);
  const when = record?.tokenizedAt ? fmtDate(record.tokenizedAt) : null;
  const num = (n) => (n == null ? "—" : Number(n).toLocaleString());

  return (
    <div className={pageClass}>
      <style>{"@media print { .no-print { display: none !important; } }"}</style>
      <nav aria-label="Breadcrumb" className="no-print text-sm text-[#98a2c3] flex items-center gap-2">
        <Link to="/verified-assets" className="hover:text-white">Verified assets</Link>
        <span aria-hidden>/</span>
        <span className="text-white">Ownership receipt</span>
      </nav>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px] items-start">
        {/* The receipt */}
        <article className="rounded-2xl border border-[#1b2440] bg-[#0b1124] overflow-hidden" aria-label="Ownership receipt">
          <header className="p-5 sm:p-7 border-b border-dashed border-[#29345a] flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${minted ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-amber-500/40 bg-amber-500/10 text-amber-300"}`}>
                <ShieldCheck className="w-4 h-4" />{minted ? "Confirmed on the blockchain" : "Not tokenized yet"}
              </p>
              <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-white break-words">{name}</h1>
              <p className="mt-1 text-sm text-[#98a2c3]">Ownership receipt · Property #{assetId}{when ? ` · ${when}` : ""}</p>
            </div>
            <div className="no-print flex flex-wrap gap-2">
              <ActionButton onClick={() => window.print()} icon={Printer}>Print</ActionButton>
            </div>
          </header>

          <div className="p-5 sm:p-7 space-y-7">
            <p className="text-[#c3cae2] leading-relaxed">
              {minted
                ? <>This receipt confirms that <strong className="text-white">{num(supply)} tokens</strong> were created for this property and sent to the owner's wallet. Each token is a small share of the property.</>
                : "No tokens have been created for this property yet, so there is nothing to confirm."}
            </p>

            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-[#0e1426] px-4 py-4">
                <dt className="text-xs text-[#98a2c3]">Approved property value</dt>
                <dd className="mt-1 text-2xl font-bold text-white tabular-nums">{valuation != null ? formatLKR(valuation) : "—"}</dd>
              </div>
              <div className="rounded-xl bg-[#0e1426] px-4 py-4">
                <dt className="text-xs text-[#98a2c3]">Tokens created</dt>
                <dd className="mt-1 text-2xl font-bold text-white tabular-nums">{num(supply)}</dd>
              </div>
              <div className="rounded-xl bg-[#0e1426] px-4 py-4">
                <dt className="text-xs text-[#98a2c3]">Starting price per token</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums" style={{ color: "var(--up)" }}>{price != null ? formatLKR(price) : "—"}</dd>
              </div>
            </dl>

            <section className="space-y-3" aria-label="Proof">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#98a2c3]">Proof details</h2>
              <CopyField label="Owner wallet (where the tokens went)" value={owner} icon={Wallet} />
              <CopyField label="Transaction ID (receipt number)" value={record?.mintingTxHash} icon={Hash} />
              <CopyField label="Token contract" value={record?.contractAddress} icon={FileText} />
              <div className="rounded-xl border border-[#1b2440] bg-[#0e1426] p-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-sm">
                <span className="text-[#98a2c3]">Token number</span>
                <span className="font-mono font-semibold text-white">#{record?.blockchainAssetId ?? assetId}</span>
              </div>
              {!record?.mintingTxHash && <p className="text-sm text-[#98a2c3]">The transaction ID appears here once the tokens are created.</p>}
            </section>
          </div>

          <footer className="px-5 sm:px-7 py-4 border-t border-dashed border-[#29345a] text-xs text-[#98a2c3]">
            Recorded on the demo test network and saved to the platform database. Figures use the app's indicative exchange rates.
          </footer>
        </article>

        {/* Side: progress and next actions */}
        <aside className="no-print space-y-4 xl:sticky xl:top-24">
          <Card title="Progress" subtitle="Where this property is in the process.">
            <ol className="space-y-4">
              <Step done={Boolean(record)} title="Property approved" text="Documents checked and value confirmed." />
              <Step done={registered} title="Registered on the blockchain" text={registered ? "The property exists on the network." : "Not registered yet."} />
              <Step done={minted} title="Tokens created" text={minted ? `${num(supply)} tokens in the owner's wallet.` : "Create the tokens to finish."} />
            </ol>
          </Card>
          <Card title="Next">
            <div className="flex flex-col gap-3">
              {isInvestor
                ? <ActionButton to="/marketplace/sell" primary icon={ShoppingBag}>Sell tokens</ActionButton>
                : minted
                  ? <ActionButton to={`/owner/release${record?.blockchainAssetId != null ? `?asset=${record.blockchainAssetId}` : ""}`} primary icon={ShoppingBag}>Put tokens on sale</ActionButton>
                  : <ActionButton to={`/tokenization/preview/${assetId}`} primary icon={Building2}>Create tokens</ActionButton>}
              <ActionButton to={isInvestor ? "/portfolio" : "/owner/portfolio"} icon={Wallet}>View my portfolio</ActionButton>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
