import { useCallback, useEffect, useState } from "react";
import { loadAllTrades } from "../services/tokenSales";

// All marketplace trades, read from the chain. `refreshKey` reloads after offers change.
export function useAllTrades(refreshKey) {
  const [state, setState] = useState({ trades: null, error: "" });
  const load = useCallback(async () => {
    try {
      setState({ trades: await loadAllTrades(), error: "" });
    } catch {
      setState({ trades: [], error: "Trade history could not be loaded from the blockchain." });
    }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);
  return { ...state, reload: load };
}
