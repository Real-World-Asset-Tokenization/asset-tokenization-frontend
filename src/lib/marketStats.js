// Stock-style statistics computed from real marketplace trades. Trades are
// { t (ms), price (mUSD per token), amount (tokens) } sorted oldest first.

export const UP = "#22e07a";
export const DOWN = "#ff5252";
export const FLAT = "#98a2c3";

export const dirOf = (change) => (change > 0 ? "up" : change < 0 ? "down" : "flat");
export const colorOf = (change) => ({ up: UP, down: DOWN, flat: FLAT })[dirOf(change)];
export const arrowOf = (change) => (change > 0 ? "▲" : change < 0 ? "▼" : "–");
export const pctText = (change) => (change == null ? "—" : `${change > 0 ? "+" : ""}${change.toFixed(2)}%`);

export function tradesByToken(trades) {
  const map = new Map();
  for (const tr of trades) {
    const list = map.get(tr.assetId) || [];
    list.push({ t: tr.t, price: tr.price, amount: tr.amount });
    map.set(tr.assetId, list);
  }
  return map;
}

// Last price, change against the previous trade, range and volume.
export function summarize(trades) {
  if (!trades.length) return { count: 0, last: null, prev: null, change: null, high: null, low: null, volume: 0, lastAt: null };
  const last = trades[trades.length - 1].price;
  const prev = trades.length > 1 ? trades[trades.length - 2].price : null;
  const prices = trades.map((t) => t.price);
  return {
    count: trades.length, last, prev,
    change: prev ? (last / prev - 1) * 100 : null,
    high: Math.max(...prices), low: Math.min(...prices),
    volume: trades.reduce((s, t) => s + t.amount, 0), lastAt: trades[trades.length - 1].t,
  };
}

const BUCKETS = [60e3, 5 * 60e3, 15 * 60e3, 3600e3, 4 * 3600e3, 86400e3, 7 * 86400e3];
// A bucket size that gives roughly 20–40 candles for the visible span.
export const pickBucket = (spanMs) => BUCKETS.find((b) => spanMs / b <= 36) || BUCKETS[BUCKETS.length - 1];

// OHLC candles. Each candle opens where the previous one closed, like a stock chart.
export function candlesFrom(trades, bucketMs, basePrice = null) {
  const out = [];
  let prevClose = basePrice;
  for (const tr of trades) {
    const t = Math.floor(tr.t / bucketMs) * bucketMs;
    let c = out[out.length - 1];
    if (!c || c.t !== t) {
      const open = prevClose ?? tr.price;
      c = { t, open, high: open, low: open, close: open, volume: 0, count: 0 };
      out.push(c);
    }
    c.high = Math.max(c.high, tr.price);
    c.low = Math.min(c.low, tr.price);
    c.close = tr.price;
    c.volume += tr.amount;
    c.count += 1;
    prevClose = tr.price;
  }
  return out;
}

export const niceTicks = (min, max, count = 5) =>
  Array.from({ length: count }, (_, i) => min + ((max - min) * i) / (count - 1));
