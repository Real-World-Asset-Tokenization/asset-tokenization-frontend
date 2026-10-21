// Exact LKR maths for valuation screens (mirrors backend services/valuation/money.js).
// Values arrive from the API as digit strings; never convert them to floating point for maths.

export function parseWholeLkr(text) {
  const t = String(text ?? "").replace(/[,\s]/g, "");
  return /^\d+$/.test(t) && BigInt(t) > 0n ? BigInt(t) : null;
}

export const referencePriceCents = (valuation, supply) =>
  BigInt(supply) > 0n ? (BigInt(valuation) * 100n) / BigInt(supply) : null;

export function centsToDecimal(cents) {
  const c = BigInt(cents), a = c < 0n ? -c : c;
  return `${c < 0n ? "-" : ""}${a / 100n}.${(a % 100n).toString().padStart(2, "0")}`;
}

export function percentChange(from, to) {
  const f = BigInt(from), t = BigInt(to);
  return f === 0n ? null : centsToDecimal(((t - f) * 10000n) / f);
}

const group = (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// "12000000" -> "LKR 12,000,000"; "12000.00" -> "LKR 12,000.00"
export function lkr(value) {
  if (value == null || value === "") return "—";
  const [whole, frac] = String(value).split(".");
  const neg = whole.startsWith("-");
  return `${neg ? "-" : ""}LKR ${group(neg ? whole.slice(1) : whole)}${frac ? `.${frac}` : ""}`;
}

export const pctLabel = (p) => (p == null ? "—" : `${Number(p) > 0 ? "+" : ""}${p}%`);
export const changeClass = (p) => (p == null || Number(p) === 0 ? "text-zinc-300" : Number(p) > 0 ? "text-emerald-300" : "text-rose-300");
