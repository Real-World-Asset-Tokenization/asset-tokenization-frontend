import { useEffect, useState } from "react";

const CACHE_KEY = "geocode:v1:";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const readCache = (q) => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY + q)); } catch { return undefined; }
};
const writeCache = (q, v) => {
  try { localStorage.setItem(CACHE_KEY + q, JSON.stringify(v)); } catch { /* storage unavailable */ }
};

async function lookup(q) {
  const cached = readCache(q);
  if (cached !== undefined && cached !== null) return cached;
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("geocode failed");
  const [hit] = await res.json();
  const point = hit ? { lat: Number(hit.lat), lon: Number(hit.lon) } : null;
  if (point) writeCache(q, point);
  return point;
}

// Find a place on the map: try the full address, then just the district/country at the end of it.
async function locate(address) {
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  const tries = [address, parts.slice(-2).join(", "), parts.slice(-1)[0]].filter((v, i, a) => v && a.indexOf(v) === i);
  for (const q of tries) {
    const point = await lookup(q);
    if (point) return point;
    await wait(1100);
  }
  return null;
}

/**
 * Map each property's address to a point on the globe using OpenStreetMap's public
 * search. Results are remembered in this browser, so the lookup runs once per address.
 * Returns { points: { [key]: {lat, lon} }, pending, failed: [key] }.
 */
export function useGeocoded(items) {
  const signature = items.map((i) => `${i.key}|${i.address}`).join("\n");
  const [state, setState] = useState({ points: {}, pending: true, failed: [] });

  useEffect(() => {
    let cancelled = false;
    const list = items.filter((i) => i.address);
    if (!list.length) { setState({ points: {}, pending: false, failed: [] }); return undefined; }
    setState({ points: {}, pending: true, failed: [] });
    (async () => {
      for (const item of list) {
        let point = null;
        try { point = await locate(item.address); } catch { /* network error: leave it off the map */ }
        if (cancelled) return;
        setState((s) => ({
          ...s,
          points: point ? { ...s.points, [item.key]: point } : s.points,
          failed: point ? s.failed : [...s.failed, item.key],
        }));
      }
      if (!cancelled) setState((s) => ({ ...s, pending: false }));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return state;
}
