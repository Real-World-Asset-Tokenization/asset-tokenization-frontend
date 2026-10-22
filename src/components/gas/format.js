// Shared number and label helpers for the gas dashboard.
export const pct = (value) => `${Number(value).toFixed(2)}%`;
export const num = (value) => Number(value ?? 0).toLocaleString();
export const shortHash = (hash) => (hash ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : "—");
export const shortAddress = (address) => (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "—");

// Positive = the new approach used less gas (good). Negative = it used more.
export const savingsClass = (value) =>
  value >= 0
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    : "bg-red-500/10 text-red-400 border-red-500/20";

export const CATEGORIES = ["Platform", "AssetOwner", "Investor", "Relayer"];
export const CATEGORY_LABEL = { Platform: "Platform", AssetOwner: "Asset owner", Investor: "Investor", Relayer: "Relayer" };
export const CATEGORY_TEXT = { Platform: "text-blue-400", AssetOwner: "text-amber-400", Investor: "text-purple-400", Relayer: "text-cyan-400" };
export const STAGES = ["Tokenization", "Listing", "Purchase", "Resale", "Voting", "Escrow", "Payout", "Other"];

export const cardClass = "bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl mb-8";
export const thClass = "py-3 px-4";
export const headRowClass = "border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider";
