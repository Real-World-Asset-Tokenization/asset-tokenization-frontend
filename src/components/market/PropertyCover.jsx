import { Building2, Home, Landmark, Trees, Store } from "lucide-react";

// A stable number from the property's name, so the same property always gets the same cover.
const hash = (text) => [...String(text)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// Each property gets its own accent colour, so the marketplace is not one flat green.
export const ACCENTS = ["#1fe06f", "#38bdf8", "#a78bfa", "#fbbf24", "#fb7185", "#2dd4bf"];
export const accentOf = (asset) => ACCENTS[hash(`${asset.name}${asset.tokenId ?? ""}`) % ACCENTS.length];

const initialsOf = (name = "") => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "P";

export const prettyType = (type) =>
  String(type || "Property").replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const iconFor = (type = "") => {
  const t = type.toLowerCase();
  if (/(land|plot|farm|estate)/.test(t) && !/real/.test(t)) return Trees;
  if (/(commercial|office|retail|shop)/.test(t)) return Store;
  if (/(residential|villa|house|penthouse|apartment|home)/.test(t)) return Home;
  if (/(heritage|hotel|landmark)/.test(t)) return Landmark;
  return Building2;
};

// Shown when a property has no photo: a quiet, on-brand cover instead of an empty grey box.
export default function PropertyCover({ asset, className = "" }) {
  const seed = hash(`${asset.name}${asset.tokenId ?? ""}`);
  const angle = 115 + (seed % 6) * 16;
  const glow = 15 + (seed % 5) * 14;
  const type = asset.propertyType || asset.assetType;
  const Icon = iconFor(type);
  const accent = accentOf(asset);
  return (
    <div className={`overflow-hidden ${className}`} style={{ background: `linear-gradient(${angle}deg, #262729 0%, color-mix(in srgb, ${accent} 22%, #17181a) 58%, color-mix(in srgb, ${accent} 12%, #0c0d0f) 100%)` }} role="img" aria-label={`${asset.name}: no photo provided`}>
      <div aria-hidden className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at ${glow}% 18%, color-mix(in srgb, ${accent} 38%, transparent), transparent 46%), linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)`,
          backgroundSize: "auto, 26px 26px, 26px 26px",
        }} />
      <span aria-hidden className="absolute -right-2 -bottom-7 select-none text-[7.5rem] font-black leading-none tracking-tighter text-white/[0.06]">{initialsOf(asset.name)}</span>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border bg-black/20" style={{ color: accent, borderColor: `color-mix(in srgb, ${accent} 45%, transparent)` }}><Icon className="h-6 w-6" strokeWidth={1.6} /></span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#98a2c3]">{prettyType(type)}</span>
      </div>
    </div>
  );
}
