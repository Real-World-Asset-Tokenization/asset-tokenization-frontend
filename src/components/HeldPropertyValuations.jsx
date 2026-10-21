import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { resolveUserWallet } from "../lib/walletResolver";
import { getTokenBalance } from "../services/contractService";
import { valuationApi } from "../services/valuationApi";
import ValuationPanel from "./ValuationPanel";

// Official valuations for the properties the signed-in user holds tokens in
// ("investor") or issued ("owner", who may also request a revaluation review).
export default function HeldPropertyValuations({ mode = "investor" }) {
  const { user } = useAuth();
  const wallet = resolveUserWallet(user);
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setItems(null); setError("");
    if (!wallet) { setItems([]); return; }
    (async () => {
      const assets = await valuationApi.assets();
      const rows = await Promise.all(assets.map(async (a) => ({ ...a, balance: await getTokenBalance(wallet, a.assetId) })));
      return mode === "owner"
        ? rows.filter((a) => a.issuer.toLowerCase() === wallet.toLowerCase())
        : rows.filter((a) => a.balance > 0);
    })().then((r) => !cancelled && setItems(r)).catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [wallet, mode]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{mode === "owner" ? "Your properties' approved valuations" : "Property valuations for your holdings"}</h2>
        <p className="text-sm text-zinc-400">Official values published on-chain after independent review. Your token balances never change when a property is revalued.</p>
      </div>
      {error ? <p role="alert" className="text-amber-300 text-sm">Valuations unavailable: {error}</p>
        : items == null ? <p role="status" className="text-zinc-400 text-sm">Loading valuations…</p>
        : !items.length ? <p className="text-zinc-500 text-sm">{wallet ? (mode === "owner" ? "No tokenized properties issued from your wallet." : "You don't hold any property tokens yet.") : "Link a wallet to see valuations."}</p>
        : items.map((a) => <ValuationPanel key={a.assetId} assetId={a.assetId} balance={a.balance} allowReviewRequest={mode === "owner"} />)}
    </section>
  );
}
