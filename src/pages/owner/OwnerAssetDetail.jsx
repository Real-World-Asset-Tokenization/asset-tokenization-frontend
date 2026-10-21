import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, Coins, Tag, Building2, MapPin, FileCheck, FileX, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCurrency } from "../../context/CurrencyContext";
import { resolveUserWallet } from "../../lib/walletResolver";
import { useOwnerData, effectiveStage, STAGE_LABEL } from "../../lib/ownerData";
import { valuationApi } from "../../services/valuationApi";
import { getVerifiedTokenBalance } from "../../services/contractService";
import { loadMyOffers, isLive } from "../../services/tokenSales";
import { ActionButton, Badge, Card, cardClass, fmtDate, pageClass } from "../../components/ui/dash";
import PriceHistoryChart from "../../components/PriceHistoryChart";
import AddToChainButton from "../../components/AddToChainButton";
import { STAGE_TONE, humanType } from "./OwnerAssets";

const DOCS = [["deed", "Title deed"], ["surveyPlan", "Survey plan"], ["extracts", "Land registry extracts"], ["priorDeeds", "Prior deeds"], ["certificates", "Certificates"]];
const OCR = [["ownerName", "Owner name on deed"], ["propertyNumber", "Property number"], ["registrationNumber", "Registration number"], ["governmentAuthority", "Issuing authority"], ["propertyAddress", "Address on deed"], ["marketValue", "Value on deed"], ["documentDate", "Deed date"]];
const short = (h) => (h && h.length > 20 ? `${h.slice(0, 10)}…${h.slice(-8)}` : h);

// One asset, as the owner sees it: Azure record + on-chain valuation, supply and holdings.
export default function OwnerAssetDetail() {
  const { assetId } = useParams();
  const { user } = useAuth();
  const { formatLKR } = useCurrency();
  const whole = (n) => formatLKR(Math.round(Number(n)), { showCode: true });
  const wallet = resolveUserWallet(user);
  const { loading, assets, chain, errors, reload } = useOwnerData(user?.token);
  const asset = assets.find((a) => String(a.assetId) === String(assetId));
  const stage = asset ? effectiveStage(asset, chain) : null;
  const onChain = stage === "tokenized";
  const chainId = onChain ? asset.blockchainAssetId : null;

  const [token, setToken] = useState(null); // { pricing, history, ownerBalance, listed, error }
  useEffect(() => {
    if (chainId == null) { setToken(null); return; }
    let cancelled = false;
    setToken({ loading: true });
    Promise.all([
      valuationApi.asset(chainId),
      valuationApi.history(chainId).catch(() => null),
      wallet ? getVerifiedTokenBalance(wallet, asset).catch(() => null) : null,
      wallet ? loadMyOffers(wallet).then((r) => r.offers).catch(() => null) : null,
    ]).then(([pricing, history, ownerBalance, offers]) => {
      if (cancelled) return;
      const listed = offers == null ? null : offers.filter((o) => o.assetId === Number(chainId) && isLive(o)).reduce((s, o) => s + o.amount, 0);
      setToken({ pricing, history, ownerBalance, listed });
    }).catch((e) => { if (!cancelled) setToken({ error: e.message || "Could not read the blockchain." }); });
    return () => { cancelled = true; };
  }, [chainId, wallet, asset?.name]);

  if (loading) return <div className={pageClass}><p className="text-[#98a2c3]">Loading asset…</p></div>;
  if (!asset) {
    return (
      <div className={pageClass}>
        <p className="text-[#98a2c3]">{errors.assets ? "Could not load your assets." : "This asset was not found in your account."}</p>
        <Link to="/owner/assets" className="text-indigo-300">← Back to my assets</Link>
      </div>
    );
  }

  const name = asset.name || asset.assetName;
  const p = token?.pricing;
  const supply = p ? Number(p.tokenSupply) : Number(asset.totalShares) || null;
  const ownerBal = token?.ownerBalance;
  const withInvestors = supply != null && ownerBal != null ? supply - ownerBal : null;
  const ocr = OCR.filter(([k]) => asset.ocrData?.[k]);
  const versions = token?.history?.entries || [];

  return (
    <div className={pageClass}>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-[#98a2c3]">
        <Link to="/owner/assets" className="hover:text-white">My assets</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-white truncate">{name}</span>
      </nav>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{name}</h1>
            <Badge tone={STAGE_TONE[stage]}>{STAGE_LABEL[stage]}</Badge>
          </div>
          {asset.description
            ? <p className="mt-2 text-[#98a2c3] max-w-3xl">{asset.description}</p>
            : <p className="mt-2 text-[#6b7599]">No description was provided for this asset.</p>}
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 shrink-0">
          {stage === "approved" && <ActionButton to={`/tokenization/preview/${asset.assetId}`} primary icon={Coins}>Tokenize asset</ActionButton>}
          {onChain && <ActionButton to="/owner/portfolio" icon={Building2}>Holdings & valuations</ActionButton>}
          {onChain && <ActionButton to={`/owner/release?asset=${chainId}`} primary icon={Tag}>Release tokens</ActionButton>}
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_380px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`${cardClass} overflow-hidden h-56 sm:h-64`}>
              {asset.imageUrl
                ? <img src={asset.imageUrl} alt={name} className="w-full h-full object-cover" />
                : <div className="h-full flex flex-col items-center justify-center gap-2 text-[#6b7599]"><Building2 className="w-12 h-12" /><span className="text-sm">No photo uploaded</span></div>}
            </div>
            <div className={`${cardClass} overflow-hidden h-56 sm:h-64`}>
              {asset.location ? (
                <iframe
                  title={`Map of ${asset.location}`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(asset.location)}&z=14&output=embed`}
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : <div className="h-full flex flex-col items-center justify-center gap-2 text-[#6b7599]"><MapPin className="w-12 h-12" /><span className="text-sm">No location provided</span></div>}
            </div>
          </div>

          {onChain && supply ? <PriceHistoryChart tokenId={chainId} supply={supply} /> : null}

          <Card title="Land record" subtitle={[asset.symbol, `submitted ${asset.createdAt ? fmtDate(asset.createdAt) : "—"}`].filter(Boolean).join(" · ")}>
            <dl className="grid md:grid-cols-2 md:gap-x-10">
              <Field k="Location" v={asset.location} />
              <Field k="Asset type" v={humanType(asset)} capitalize />
              <Field k="Submitted valuation" v={asset.valuationLKR ?? asset.valuation ? whole(asset.valuationLKR ?? asset.valuation) : null} />
              <Field k="Approved valuation (on-chain)" v={p ? whole(p.approvedValuation) : onChain ? "Loading…" : "Not tokenized yet"} />
              <Field k="Verification" v={(asset.verificationStatus || "pending").replace(/_/g, " ")} capitalize />
              {asset.verifiedAt && stage !== "pending" && <Field k="Verified on" v={fmtDate(asset.verifiedAt)} />}
              <Field k="Document authentic" v={asset.verificationStatus === "pending" ? "Not checked yet" : asset.documentAuthentic ? "Yes" : "Not confirmed"} />
              <Field k="Ownership verified" v={asset.verificationStatus === "pending" ? "Not checked yet" : asset.ownershipVerified ? "Yes" : "Not confirmed"} />
              {asset.riskScore != null && <Field k="Risk score" v={`${asset.riskScore} / 100`} />}
              {asset.clarityScore != null && <Field k="Document clarity" v={`${asset.clarityScore} / 100`} />}
              {asset.tokenizedAt && <Field k="Tokenized on" v={fmtDate(asset.tokenizedAt)} />}
              {asset.rejectionReason && stage === "rejected" && <Field k="Rejection reason" v={asset.rejectionReason} />}
            </dl>
          </Card>

          {ocr.length > 0 && (
            <Card title="Read from the deed" subtitle="Extracted automatically from the uploaded title deed.">
              <dl className="grid md:grid-cols-2 md:gap-x-10">{ocr.map(([k, label]) => <Field key={k} k={label} v={asset.ocrData[k]} />)}</dl>
            </Card>
          )}

          <Card title="Documents & proofs">
            <ul className="grid sm:grid-cols-2 gap-2 mb-4">
              {DOCS.map(([k, label]) => {
                const ok = Boolean(asset.documents?.[k]?.publicId || asset.documents?.[k]?.url);
                return (
                  <li key={k} className="flex items-center gap-2 text-sm">
                    {ok ? <FileCheck className="w-4 h-4 text-emerald-300" /> : <FileX className="w-4 h-4 text-[#6b7599]" />}
                    <span className={ok ? "text-white" : "text-[#6b7599]"}>{label}</span>
                    <span className="text-xs text-[#6b7599]">{ok ? "uploaded" : "not provided"}</span>
                  </li>
                );
              })}
            </ul>
            <dl>
              <Field k="Document hash" v={short(asset.documentHash)} mono title={asset.documentHash} />
              <Field k="Metadata URI" v={asset.metadataURI} mono />
              {asset.txHash && <Field k="Tokenization transaction" v={short(asset.txHash)} mono title={asset.txHash} />}
            </dl>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Tokenization" subtitle={onChain ? `Token #${chainId} on the current blockchain` : stage === "offchain" ? "Not on the current blockchain yet" : "Not tokenized yet"}>
            {!onChain ? (
              <div className="space-y-3 text-sm text-[#98a2c3]">
                <Tile label="Planned token supply" value={asset.totalShares ? Number(asset.totalShares).toLocaleString() : "—"} />
                <Tile label="Planned price per token" value={asset.totalShares ? whole((asset.valuationLKR ?? asset.valuation) / asset.totalShares) : "—"} />
                {stage === "approved" && <ActionButton to={`/tokenization/preview/${asset.assetId}`} primary icon={Coins}>Tokenize asset</ActionButton>}
                {stage === "pending" && <p>Tokenization unlocks after the compliance team approves this asset.</p>}
                {stage === "offchain" && (
                  <>
                    <p>The documents are approved, but this asset is not registered on the current blockchain{asset.chainStatus === "missing" ? " (for example after the local chain was reset)" : ""}. Add it to the blockchain, then tokenize it.</p>
                    <AddToChainButton asset={asset} chainStatus={asset.chainStatus === "pending" ? "pending" : "missing"} onDone={reload} />
                  </>
                )}
              </div>
            ) : token?.error ? (
              <p role="alert" className="text-sm text-amber-300 flex flex-wrap gap-2">{token.error}<button onClick={reload} className="underline inline-flex items-center gap-1"><RefreshCw className="w-3 h-3" />Retry</button></p>
            ) : (
              <div className="space-y-3">
                <Tile label="Token price (reference)" value={p ? formatLKR(p.referencePrice, { showCode: true }) : "…"} note={p?.lastValuationDate ? `From approved valuation, ${fmtDate(p.lastValuationDate)}` : null} />
                <Tile label="Total token supply" value={supply != null ? supply.toLocaleString() : "…"} />
                {p?.lastTrade && <Tile label="Last market trade" value={`${Number(p.lastTrade.pricePerToken).toLocaleString()} mUSD`} note={`per token · ${p.lastTrade.amount.toLocaleString()} tokens · ${fmtDate(p.lastTrade.tradedAt)}`} />}
                {ownerBal != null && supply > 0 ? (() => {
                  // Tokens on sale stay in the owner's wallet until bought, so "you hold" includes them.
                  const listed = token?.listed == null ? null : Math.min(token.listed, ownerBal);
                  const kept = listed == null ? null : ownerBal - listed;
                  const share = (n) => `${(n / supply * 100).toFixed(2)}%`;
                  const parts = [
                    ["Sold to investors", withInvestors, "#1fe06f"],
                    ["Released for sale", listed, "#fbbf24"],
                    ["Not released yet", kept, "#38bdf8"],
                  ];
                  return (
                    <div className="pt-1 space-y-3">
                      <p className="text-sm text-[#98a2c3]">Where your {supply.toLocaleString()} tokens are:</p>
                      <div role="img" aria-label={parts.map(([l, n]) => `${l} ${n ?? 0}`).join(", ")} className="flex h-3 overflow-hidden rounded-full bg-[#3f4045]">
                        {parts.map(([l, n, c]) => n > 0 && <div key={l} title={`${l}: ${n.toLocaleString()} (${share(n)})`} style={{ width: `${(n / supply) * 100}%`, background: c }} />)}
                      </div>
                      <ul className="space-y-2">
                        {parts.map(([l, n, c]) => (
                          <li key={l} className="flex items-center justify-between gap-3 text-sm">
                            <span className="flex items-center gap-2 text-[#c3cae2]"><span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />{l}</span>
                            <span className="text-white font-semibold tabular-nums">{n == null ? "Unavailable" : <>{n.toLocaleString()} <span className="font-normal text-[#98a2c3]">· {share(n)}</span></>}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-[#98a2c3]">You still hold {ownerBal.toLocaleString()} tokens ({share(ownerBal)}). Released tokens stay in your wallet until someone buys them.</p>
                    </div>
                  );
                })() : <Tile label="You hold" value={token?.loading ? "…" : "Unavailable"} />}
                <ActionButton to={`/owner/release?asset=${chainId}`} primary icon={Tag}>Release tokens</ActionButton>
              </div>
            )}
          </Card>

          {onChain && versions.length > 0 && (
            <Card title="Valuation history" subtitle="Published on-chain">
              <ol className="space-y-3">
                {[...versions].reverse().map((h) => (
                  <li key={h.version} className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0">
                      <span className="block text-white font-medium">{whole(h.approvedValue)}</span>
                      <span className="block text-xs text-[#6b7599]">v{h.version} · {h.effectiveDate ? fmtDate(h.effectiveDate) : "—"}{h.note ? ` · ${h.note}` : ""}</span>
                    </span>
                    {h.changePercent != null && <span className={Number(h.changePercent) < 0 ? "text-rose-300" : "text-emerald-300"}>{Number(h.changePercent) > 0 ? "+" : ""}{h.changePercent}%</span>}
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ k, v, mono, capitalize, title }) {
  return (
    <div className="flex justify-between gap-4 py-3 border-b border-[#1b2440] text-sm">
      <dt className="text-[#98a2c3] shrink-0">{k}</dt>
      <dd title={title} className={`text-right text-white font-medium min-w-0 break-words ${mono ? "font-mono text-xs" : ""} ${capitalize ? "capitalize" : ""}`}>{v == null || v === "" ? <span className="text-[#6b7599] font-normal">Not provided</span> : v}</dd>
    </div>
  );
}

function Tile({ label, value, note }) {
  return (
    <div className="rounded-xl border border-[#1b2440] bg-[#0e1426] p-4">
      <p className="text-sm text-[#98a2c3]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {note && <p className="mt-1 text-xs text-[#6b7599]">{note}</p>}
    </div>
  );
}
