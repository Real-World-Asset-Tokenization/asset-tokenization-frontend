import { useCallback, useEffect, useState } from "react";
import { getContracts } from "../services/contractService";
import { valuationApi } from "../services/valuationApi";

const API = "http://localhost:5001/api/marketplace";

// Who is selling an offer: the property's owner (first sale) or another investor (resale).
export const sellerKind = (offer, ownerWallet) =>
  ownerWallet && offer.seller && offer.seller.toLowerCase() === ownerWallet.toLowerCase() ? "owner" : "investor";

export const isActiveOffer = (o, now = Date.now() / 1000) => o.status === 0 && (!o.expiresAt || o.expiresAt > now);

/**
 * Everything the marketplace screens need, read from the backend and the chain:
 *  - assets:   tokenized properties that really exist on the current chain (name must match),
 *              with live supply, issuer balance and the viewer's own balance
 *  - listings: every sale offer recorded by the marketplace contract
 *  - reference: approved LKR price per token, keyed by token id
 *  - feeBps:   marketplace fee in basis points, read from the contract
 */
export function useMarketplaceData({ wallet, mine = false, token } = {}) {
  const [state, setState] = useState({
    assets: [], listings: [], reference: {}, feeBps: null,
    assetsLoading: true, listingsLoading: true, assetsError: "", listingsError: "",
  });

  const loadListings = useCallback(async () => {
    setState((s) => ({ ...s, listingsLoading: true, listingsError: "" }));
    try {
      const res = await fetch(`${API}/listings`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error();
      // Off-chain signed orders sit in the same book. If they cannot be loaded the on-chain offers still show.
      const signed = await fetch(`${API.replace("/marketplace", "")}/orders`)
        .then((r) => (r.ok ? r.json() : null)).then((j) => (j?.success ? j.data : [])).catch(() => []);
      setState((s) => ({ ...s, listings: [...data.data, ...signed], listingsLoading: false }));
    } catch {
      setState((s) => ({ ...s, listings: [], listingsLoading: false, listingsError: "Sale offers could not be loaded." }));
    }
  }, []);

  const loadAssets = useCallback(async () => {
    setState((s) => ({ ...s, assetsLoading: true, assetsError: "" }));
    try {
      const res = await fetch(`${API}/assets${mine ? "?mine=true" : ""}`, mine ? { headers: { Authorization: `Bearer ${token || ""}` } } : {});
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error();
      const { registryContract, tokenContract, tokenMarketplaceContract, runner } = await getContracts(false);
      try {
        const [enriched, feeBps] = await Promise.all([
          Promise.all(data.data.map(async (asset) => {
            try {
              const [onChain, total, issuerBalance, viewerBalance] = await Promise.all([
                registryContract.getAsset(asset.tokenId),
                tokenContract.totalShares(asset.tokenId),
                asset.ownerWallet ? tokenContract.balanceOf(asset.ownerWallet, asset.tokenId) : 0n,
                wallet ? tokenContract.balanceOf(wallet, asset.tokenId) : null,
              ]);
              // Old database records can point at a token id that now belongs to another property.
              if (onChain.name !== asset.name || total <= 0n) return null;
              return {
                ...asset,
                totalShares: Number(total),
                ownership: { total: Number(total), ownerBalance: Number(issuerBalance), viewerBalance: viewerBalance == null ? null : Number(viewerBalance) },
              };
            } catch {
              return null;
            }
          })),
          tokenMarketplaceContract.feeBps().then(Number).catch(() => null),
        ]);
        const assets = enriched.filter(Boolean);
        setState((s) => ({ ...s, assets, feeBps, assetsLoading: false }));
      } finally {
        runner.destroy?.();
      }
      valuationApi.assets()
        .then((list) => setState((s) => ({ ...s, reference: Object.fromEntries(list.map((a) => [Number(a.assetId), Number(a.referencePrice)])) })))
        .catch(() => {});
    } catch {
      setState((s) => ({ ...s, assets: [], assetsLoading: false, assetsError: "Tokenized properties could not be loaded." }));
    }
  }, [mine, token, wallet]);

  const reload = useCallback(() => { loadAssets(); loadListings(); }, [loadAssets, loadListings]);
  useEffect(() => { reload(); }, [reload]);

  return { ...state, reload, loadListings, loadAssets };
}
