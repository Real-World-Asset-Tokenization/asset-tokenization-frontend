import { useCallback, useEffect, useState } from "react";
import { authAPI, kycAPI } from "./api";
import { valuationApi } from "../services/valuationApi";

// Asset status as the owner should see it, from the stored record.
export function assetStage(a) {
  if (a.status === "Tokenized" || a.tokenizedAt) return "tokenized";
  if (a.verificationStatus === "rejected" || a.status === "Rejected") return "rejected";
  if (a.verificationStatus === "approved" || a.status === "Approved") return "approved";
  return "pending";
}

export const STAGE_LABEL = { tokenized: "Tokenized", approved: "Ready to tokenize", pending: "Submitted", rejected: "Rejected", offchain: "Not on blockchain" };

// The status to show. The blockchain decides "tokenized": the backend reports each asset's
// chainStatus (tokenized / approved / pending / missing), checked against the current chain.
//   offchain = documents approved, but the asset is not (yet) registered+approved on this chain
export function effectiveStage(a, chain) {
  const st = assetStage(a);
  if (a.chainStatus && a.chainStatus !== "unknown") {
    if (a.chainStatus === "tokenized") return "tokenized";
    if (st === "pending" || st === "rejected") return st;
    return a.chainStatus === "approved" ? "approved" : "offchain";
  }
  if (st !== "tokenized") return st;
  const c = a.blockchainAssetId != null ? chain?.[a.blockchainAssetId] : null;
  return c && c.name === (a.name || a.assetName) ? "tokenized" : "offchain";
}

// KYC steps the platform actually performs.
export function kycSteps(kyc) {
  return [
    { key: "document", label: "Identity document uploaded", done: Boolean(kyc?.documentImage) },
    { key: "selfie", label: "Selfie uploaded", done: Boolean(kyc?.selfie) },
    { key: "checked", label: "Automated verification run", done: Boolean(kyc?.pipelineResults && Object.keys(kyc.pipelineResults).length) },
    { key: "approved", label: "Identity approved", done: kyc?.verificationStatus === "approved" },
  ];
}

// "LKR 2.50M" style for large values.
export function lkrCompact(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  if (Math.abs(v) >= 1e9) return `LKR ${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `LKR ${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `LKR ${(v / 1e3).toFixed(1)}K`;
  return `LKR ${v.toLocaleString()}`;
}

/**
 * Everything the owner dashboard shows: account, KYC record, owned assets from Azure,
 * and the official on-chain valuation for each tokenized asset.
 */
export function useOwnerData(token) {
  const [state, setState] = useState({ loading: true, me: null, kyc: null, assets: [], chain: {}, errors: {} });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const errors = {};
    const [me, kyc, assets, chainList] = await Promise.all([
      authAPI.getMe().then((r) => r.data.data.user).catch(() => { errors.me = true; return null; }),
      kycAPI.getKYCStatus().then((r) => r.data?.data || null).catch((e) => { if (e.response?.status !== 404) errors.kyc = true; return null; }),
      fetch("http://localhost:5001/api/assets/owned", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json()).then((d) => { if (!d.success) throw new Error(); return d.data; })
        .catch(() => { errors.assets = true; return []; }),
      valuationApi.assets().catch(() => { errors.chain = true; return []; }),
    ]);
    const chain = Object.fromEntries(chainList.map((c) => [c.assetId, c]));
    setState({ loading: false, me, kyc, assets, chain, errors });
  }, [token]);

  useEffect(() => { if (token) load(); }, [token, load]);

  // Official value: the on-chain valuation for tokenized assets, otherwise the submitted value.
  const valueOf = (a) => {
    const c = a.blockchainAssetId != null ? state.chain[a.blockchainAssetId] : null;
    return c && c.name === (a.name || a.assetName) ? Number(c.valuation) : Number(a.valuationLKR ?? a.valuation);
  };

  return { ...state, reload: load, valueOf };
}
