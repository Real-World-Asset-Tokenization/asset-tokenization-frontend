import { useState } from "react";
import { Link2, AlertTriangle } from "lucide-react";
import api from "../lib/api";
import { registerAssetOnChain } from "../services/contractService";

/**
 * Puts an approved asset (back) on the current blockchain, e.g. after a local chain reset:
 *   1. the owner registers it from their own wallet (the registry records msg.sender as issuer)
 *   2. the backend approves it in the registry, because the compliance review was already approved
 * After that the asset can be tokenized again. Uses the asset's stored deed hash, valuation
 * and token supply, so the chain record matches the Azure record exactly.
 */
export default function AddToChainButton({ asset, chainStatus = "missing", onDone, className = "" }) {
  const [step, setStep] = useState("");
  const [error, setError] = useState("");

  const run = async () => {
    setError("");
    try {
      if (chainStatus === "missing") {
        setStep("register");
        await registerAssetOnChain({
          name: asset.name || asset.assetName,
          symbol: asset.symbol || asset.assetSymbol,
          metadataURI: asset.metadataURI,
          documentHash: asset.documentHash,
          valuationLKR: Math.round(Number(asset.valuationLKR ?? asset.approvedValuation ?? asset.valuation)),
          totalShares: Number(asset.totalShares ?? asset.approvedTokenSupply),
        });
      }
      setStep("approve");
      const res = await api.post(`/tokenization/chain-approve/${asset.assetId}`);
      setStep("");
      onDone?.(res.data?.data);
    } catch (err) {
      setStep("");
      setError(err.response?.data?.error || err.reason || err.shortMessage || err.message || "Could not add the asset to the blockchain.");
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <button type="button" onClick={run} disabled={Boolean(step)}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#1a1203] font-semibold text-sm disabled:opacity-60">
        <Link2 className="w-4 h-4" />
        {step === "register" ? "Confirm registration in MetaMask…" : step === "approve" ? "Approving on the blockchain…" : chainStatus === "missing" ? "Add to blockchain" : "Finish blockchain approval"}
      </button>
      {error && <p role="alert" className="text-sm text-rose-300 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</p>}
    </div>
  );
}
