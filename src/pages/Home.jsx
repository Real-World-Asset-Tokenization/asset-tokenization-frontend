import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, ArrowLeft, Building2, CheckCircle2, Coins, FileCheck2, Landmark, MapPin,
  LogIn, Menu, RefreshCw, Search, ShieldCheck, ShoppingBag, Store, TrendingUp, User, X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { resolveUserWallet } from "../lib/walletResolver";
import { useMarketplaceData, isActiveOffer } from "../lib/marketplaceData";
import { referenceTokenPriceLKR } from "../lib/tokenPrice";
import { useGeocoded } from "../lib/geocode";
import WorldGlobe, { countryName, countryOfPoint } from "../components/home/WorldGlobe";

const card = "rounded-3xl border border-white/10 bg-[#232427]";
const eyebrow = "inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1fe06f]/10 border border-[#1fe06f]/25 text-[#22e07a] text-xs font-semibold uppercase tracking-wider";

const STEPS = [
  { icon: FileCheck2, title: "Land is verified", text: "The owner uploads the deed and survey plan. They are checked before anything is tokenized." },
  { icon: Coins, title: "Split into tokens", text: "The approved property is divided into small shares, so many people can own a part of it." },
  { icon: Store, title: "Trade on the market", text: "Owners and investors buy and sell tokens directly, and the price follows the approved value of the land." },
];

function PropertyPhoto({ asset, className = "" }) {
  const [failed, setFailed] = useState(false);
  return asset.imageUrl && !failed ? (
    <img src={asset.imageUrl} alt={asset.name} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />
  ) : (
    <div className={`flex items-center justify-center bg-[#1b1c1f] text-[#8e8f98] ${className}`}>
      <Building2 size={36} strokeWidth={1.2} aria-label="No photo provided" />
    </div>
  );
}

// Slim header like the reference: menu left, logo centre, login right.
function HomeHeader({ isAuthenticated, user, onDashboard }) {
  const [open, setOpen] = useState(false);
  const links = [["/marketplace", "Marketplace"], ["/verified-assets", "Verified properties"], ["/portfolio", "My portfolio"], ["/profit-dashboard", "Returns"]];
  return (
    <header className="absolute inset-x-0 top-0 z-30" style={{ background: "transparent", border: "none", backdropFilter: "none", WebkitBackdropFilter: "none", boxShadow: "none" }}>
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button onClick={() => setOpen((v) => !v)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 cursor-pointer">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        <Link to="/" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-white font-bold text-lg tracking-tight">
          <span className="w-7 h-7 rounded-lg bg-[#1fe06f] text-[#0b1a10] flex items-center justify-center"><Landmark size={16} /></span>
          TerraToken
        </Link>
        {isAuthenticated ? (
          <button onClick={onDashboard} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#111214] text-xs font-bold cursor-pointer hover:bg-white/90">
            <LogIn size={14} /> {user?.name ? user.name.split(" ")[0] : "Dashboard"}
          </button>
        ) : (
          <Link to="/login" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#111214] text-xs font-bold hover:bg-white/90">
            <LogIn size={14} /> Login
          </Link>
        )}
        {open && (
          <nav className="absolute left-4 sm:left-6 top-16 w-60 rounded-2xl border border-white/10 bg-[#232427] p-2 shadow-2xl">
            {links.map(([to, label]) => (
              <Link key={to} to={to} onClick={() => setOpen(false)} className="block px-4 py-2.5 rounded-xl text-sm text-[#d4d4d8] hover:bg-white/5 hover:text-white">{label}</Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}

function FeaturedCard({ asset, priceText, valuationText, offerCount, heldPercent }) {
  return (
    <Link
      to={`/marketplace/assets/${asset.assetId}`}
      className={`${card} snap-center shrink-0 w-[270px] sm:w-[300px] overflow-hidden group flex flex-col hover:border-[#1fe06f]/40 transition-colors`}
    >
      <div className="relative">
        <PropertyPhoto asset={asset} className="h-44 w-full transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#232427] via-transparent to-transparent" />
        {(asset.propertyType || asset.assetType) && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/60 backdrop-blur text-white border border-white/15">
            {asset.propertyType || asset.assetType}
          </span>
        )}
        {offerCount > 0 && (
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#1fe06f] text-[#0b1a10]">
            {offerCount} for sale
          </span>
        )}
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-white text-lg leading-tight line-clamp-1">{asset.name}</h3>
        <p className="flex items-center gap-1 text-xs text-[#a1a1aa] mt-1 line-clamp-1">
          <MapPin size={13} className="text-[#22e07a] shrink-0" />
          <span className="truncate">{asset.location}</span>
        </p>
        <div className="grid grid-cols-2 gap-3 mt-4 rounded-2xl bg-[#1b1c1f] p-3">
          <div>
            <p className="text-[11px] text-[#8e8f98]">Price per token</p>
            <p className="text-sm font-bold text-white tabular-nums">{priceText}</p>
          </div>
          <div>
            <p className="text-[11px] text-[#8e8f98]">Property value</p>
            <p className="text-sm font-bold text-white tabular-nums">{valuationText}</p>
          </div>
        </div>
        {heldPercent != null && (
          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-[#a1a1aa] mb-1">
              <span>Owned by investors</span>
              <span className="tabular-nums">{heldPercent.toFixed(2)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#1b1c1f] overflow-hidden" role="img" aria-label={`${heldPercent.toFixed(2)} percent owned by investors`}>
              <div className="h-full rounded-full bg-[#1fe06f]" style={{ width: `${Math.min(100, heldPercent)}%` }} />
            </div>
          </div>
        )}
        <span className="mt-auto pt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#22e07a] group-hover:gap-2 transition-all">
          View &amp; buy <ArrowRight size={15} />
        </span>
      </div>
    </Link>
  );
}

const Notice = ({ children, onRetry }) => (
  <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center text-sm text-amber-300">
    <p>{children}</p>
    {onRetry && (
      <button onClick={onRetry} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white cursor-pointer">
        <RefreshCw size={14} /> Retry
      </button>
    )}
  </div>
);

export default function Home() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { formatLKR, formatMUSD } = useCurrency();
  const wallet = resolveUserWallet(user);
  const { assets, listings, assetsLoading, listingsLoading, assetsError, reference, reload } = useMarketplaceData({ wallet });
  const railRef = useRef(null);

  const handleLaunchRole = (roleKey, targetRoute) => {
    if (isAuthenticated && user?.role === "investor" && roleKey === "asset_owner") {
      navigate("/dashboard/investor");
      return;
    }
    navigate(targetRoute);
  };

  const stats = useMemo(() => {
    const known = new Set(assets.map((a) => Number(a.tokenId)));
    const offers = listings.filter((o) => known.has(Number(o.assetId)) && isActiveOffer(o));
    return {
      properties: assets.length,
      valuation: assets.reduce((s, a) => s + Number(a.valuationLKR || 0), 0),
      tokens: assets.reduce((s, a) => s + Number(a.totalShares || 0), 0),
      offers,
    };
  }, [assets, listings]);

  const offerCount = (a) => stats.offers.filter((o) => Number(o.assetId) === Number(a.tokenId)).length;
  // Approved price per token from the valuation service; falls back to value / supply.
  const lkrPrice = (a) => {
    const p = Number(reference[Number(a.tokenId)]) || referenceTokenPriceLKR(a);
    return p > 0 ? formatLKR(p) : null;
  };
  const heldPercent = (a) => (a.ownership?.total > 0 ? ((a.ownership.total - a.ownership.ownerBalance) / a.ownership.total) * 100 : null);

  // Put every property on the globe, using the address its owner registered.
  const geo = useGeocoded(assets.map((a) => ({ key: a.assetId, address: a.location })));
  const pins = useMemo(() => assets.filter((a) => geo.points[a.assetId]).map((a) => ({
    id: a.assetId,
    lon: geo.points[a.assetId].lon,
    lat: geo.points[a.assetId].lat,
    to: `/marketplace/assets/${a.assetId}`,
    name: a.name,
    place: (a.location || "").split(",").slice(-2).join(",").trim(),
    price: lkrPrice(a),
    photo: a.imageUrl,
    value: a.valuationLKR ? formatLKR(a.valuationLKR, { compact: true }) : null,
    tokens: Number(a.totalShares || 0),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [assets, geo.points, reference, formatLKR]);

  // The country the visitor clicked on the globe, and the lands registered in it.
  const [country, setCountry] = useState(null);
  const landsHere = useMemo(() => (country ? pins.filter((p) => countryOfPoint(p.lon, p.lat) === country) : []), [country, pins]);
  const countryLabel = country ? countryName(country) : "";
  const [query, setQuery] = useState("");
  const submitSearch = (e) => {
    e.preventDefault();
    navigate(query.trim() ? `/marketplace?q=${encodeURIComponent(query.trim())}` : "/marketplace");
  };
  const dashboardRoute = { investor: "/dashboard/investor", asset_owner: "/dashboard/asset-owner", admin: "/admin" }[user?.role] || "/marketplace";
  const scrollRail = (dir) => railRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  const loading = assetsLoading || listingsLoading;

  const statTiles = [
    { label: "Tokenized properties", value: stats.properties.toLocaleString(), icon: Landmark },
    { label: "Total property value", value: formatLKR(stats.valuation, { compact: true }), icon: TrendingUp },
    { label: "Tokens issued", value: stats.tokens.toLocaleString(), icon: Coins },
    { label: "Open sale offers", value: stats.offers.length.toLocaleString(), icon: ShoppingBag },
  ];

  const roles = [
    { key: "investor", route: "/marketplace", icon: User, title: "Investor", text: "Buy a share of a property, and follow how its value changes.", cta: "Start investing" },
    { key: "asset_owner", route: "/dashboard/asset-owner", icon: Building2, title: "Land owner", text: "Register your land, get it verified, tokenize it and sell shares.", cta: "Tokenize my land" },
    { key: "admin", route: "/admin", icon: ShieldCheck, title: "Admin", text: "Review owners and properties, and approve valuations.", cta: "Open admin tools", purple: true },
  ];

  return (
    <div className="app-shell auth-bg min-h-screen text-zinc-100 flex flex-col">
      <main className="flex-1 overflow-x-hidden">
        {/* Hero: dark globe with real properties floating on it */}
        <section className="relative bg-[#111214] text-center overflow-hidden h-[700px] sm:h-[720px]">
          <HomeHeader isAuthenticated={isAuthenticated} user={user} onDashboard={() => navigate(dashboardRoute)} />
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[1100px] sm:w-[1250px] max-w-none drop-shadow-[0_0_60px_rgba(31,224,111,0.18)]">
            <WorldGlobe pins={pins} selected={country} onSelect={setCountry} />
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#17181a] to-transparent" />

          <div className={`pointer-events-none relative z-10 px-4 pt-24 sm:pt-28 transition-all duration-500 ${country ? "opacity-0 -translate-y-6 invisible" : ""}`}>
            <h1 className="rise text-4xl sm:text-6xl font-bold tracking-[-0.02em] text-white leading-[1.05]">Global Land Ownership</h1>
            <p className="mt-3 text-lg sm:text-xl text-[#d4d4d8]">Empowered by Tokenization</p>
            <form onSubmit={submitSearch} role="search" className="pointer-events-auto mt-8 mx-auto max-w-xl flex items-center gap-2 rounded-full p-1.5 pl-5 shadow-[0_0_40px_rgba(31,224,111,0.35)]" style={{ background: "#fff" }}>
              <Search size={16} className="text-[#6b6c75] shrink-0" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search properties"
                placeholder="Search a property by name or location"
                style={{ background: "transparent", border: "none", boxShadow: "none", color: "#111214" }}
                className="flex-1 min-w-0 text-sm placeholder:text-[#8e8f98] outline-none px-1 py-2"
              />
              <button type="submit" aria-label="Search" className="w-10 h-10 rounded-full bg-[#1fe06f] text-[#0b1a10] flex items-center justify-center cursor-pointer hover:brightness-110">
                <ArrowRight size={18} />
              </button>
            </form>
          </div>

          {country && (
            <aside aria-label={`Lands in ${countryLabel}`} className="absolute z-20 left-4 right-4 bottom-4 sm:right-auto sm:bottom-auto sm:top-24 sm:left-8 sm:w-80 rounded-3xl border border-white/10 bg-[#232427]/95 backdrop-blur p-5 text-left shadow-2xl max-h-[60%] sm:max-h-[calc(100%-8rem)] overflow-y-auto">
              <button onClick={() => setCountry(null)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a1a1aa] hover:text-white cursor-pointer">
                <ArrowLeft size={14} /> Back to world
              </button>
              <h2 className="mt-3 text-2xl font-bold text-white">{countryLabel}</h2>
              <p className="mt-1 text-sm text-[#a1a1aa]">
                {landsHere.length ? `${landsHere.length} tokenized ${landsHere.length === 1 ? "land" : "lands"}` : "No tokenized land here yet"}
              </p>
              {landsHere.length === 0 ? (
                <div className="mt-4">
                  <p className="text-sm text-[#d4d4d8] leading-relaxed">Nobody has tokenized land in this country so far. If you own land here, you can be the first.</p>
                  <button onClick={() => handleLaunchRole("asset_owner", "/dashboard/asset-owner")} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1fe06f] text-[#0b1a10] font-bold text-sm cursor-pointer hover:brightness-110">
                    Tokenize my land <ArrowRight size={15} />
                  </button>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {landsHere.map((p) => (
                    <li key={p.id}>
                      <Link to={p.to} className="flex gap-3 rounded-2xl bg-[#1b1c1f] hover:bg-[#2c2d31] p-2.5 transition-colors">
                        {p.photo ? <img src={p.photo} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" /> : <span className="w-16 h-16 rounded-xl bg-[#2c2d31] shrink-0" />}
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-white truncate">{p.name}</span>
                          <span className="block text-xs text-[#a1a1aa] truncate">{p.place}</span>
                          <span className="block mt-1 text-xs text-[#22e07a] font-semibold tabular-nums">{p.price ? `${p.price} / token` : "Price unavailable"}</span>
                          {(p.value || p.tokens > 0) && <span className="block text-[11px] text-[#8e8f98] tabular-nums">{[p.value && `Value ${p.value}`, p.tokens > 0 && `${p.tokens.toLocaleString()} tokens`].filter(Boolean).join(" · ")}</span>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          )}

          <div className={`absolute z-10 inset-x-0 top-[420px] text-sm text-[#d4d4d8] px-4 pointer-events-none ${country ? "invisible" : ""}`}>
            {assetsLoading && <p role="status" className="text-[#a1a1aa]">Loading properties…</p>}
            {!assetsLoading && assetsError && <div className="pointer-events-auto"><Notice onRetry={reload}>{assetsError}</Notice></div>}
            {!assetsLoading && !assetsError && assets.length === 0 && (
              <div className="pointer-events-auto">
                <p>No property has been tokenized yet.</p>
                <button onClick={() => handleLaunchRole("asset_owner", "/dashboard/asset-owner")} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1fe06f] text-[#0b1a10] font-bold text-sm cursor-pointer">
                  Tokenize my land <ArrowRight size={15} />
                </button>
              </div>
            )}
            {!assetsLoading && !assetsError && assets.length > 0 && geo.pending && pins.length === 0 && <p role="status" className="text-[#a1a1aa]">Finding properties on the map…</p>}
            {!assetsLoading && !assetsError && !geo.pending && assets.length > 0 && pins.length === 0 && (
              <p role="status" className="text-[#a1a1aa]">The map could not place these properties. Check your connection and refresh.</p>
            )}
          </div>
          <p className="pointer-events-none absolute z-10 inset-x-0 bottom-6 text-xs text-[#a1a1aa]">
            {country ? "Drag to look around · click the sea or press Esc to go back" : "Drag to rotate · click a country to zoom in"}
          </p>
        </section>

        <div className="mt-8 flex flex-wrap justify-center gap-3 px-4">
          <Link to="/marketplace" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1fe06f] text-[#0b1a10] font-bold text-sm hover:brightness-110 transition">
            Browse properties <ArrowRight size={16} />
          </Link>
          <button onClick={() => handleLaunchRole("asset_owner", "/dashboard/asset-owner")} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-sm cursor-pointer transition">
            Tokenize my land
          </button>
        </div>


        {/* Live numbers */}
        <section className="mt-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className={`${card} grid grid-cols-2 lg:grid-cols-4 divide-white/10 lg:divide-x`} aria-busy={loading}>
            {statTiles.map(({ label, value, icon: Icon }) => (
              <div key={label} className="p-5 sm:p-6">
                <Icon size={18} className="text-[#22e07a]" />
                <p className="mt-3 text-2xl sm:text-3xl font-bold text-white tabular-nums">{loading ? "…" : assetsError ? "–" : value}</p>
                <p className="text-xs text-[#a1a1aa] mt-1">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Featured properties */}
        <section className="mt-20 max-w-6xl mx-auto">
          <div className="px-4 sm:px-6 lg:px-8 flex items-end justify-between gap-4">
            <div>
              <span className={eyebrow}>Featured</span>
              <h2 className="mt-3 text-2xl sm:text-4xl font-bold text-white">Properties you can own today</h2>
              <p className="mt-2 text-sm text-[#a1a1aa] max-w-xl">Every property below is tokenized on the blockchain. Prices are the approved value of the property divided by its tokens.</p>
            </div>
            {assets.length > 1 && (
              <div className="hidden sm:flex gap-2">
                <button onClick={() => scrollRail(-1)} aria-label="Previous properties" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center cursor-pointer"><ArrowLeft size={16} /></button>
                <button onClick={() => scrollRail(1)} aria-label="Next properties" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center cursor-pointer"><ArrowRight size={16} /></button>
              </div>
            )}
          </div>

          <div className="mt-8">
            {assetsLoading && <p role="status" className="px-4 text-sm text-[#a1a1aa]">Loading properties…</p>}
            {!assetsLoading && assetsError && <Notice onRetry={reload}>{assetsError}</Notice>}
            {!assetsLoading && !assetsError && assets.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-[#a1a1aa]">Nothing is listed yet. Once an owner tokenizes a property, it shows up here.</p>
            )}
            {!assetsLoading && !assetsError && assets.length > 0 && (
              <div ref={railRef} className="flex gap-5 overflow-x-auto snap-x snap-mandatory px-4 sm:px-6 lg:px-8 pb-4 [scrollbar-width:thin]">
                {assets.map((a) => (
                  <FeaturedCard
                    key={a.assetId}
                    asset={a}
                    priceText={lkrPrice(a)}
                    valuationText={formatLKR(a.valuationLKR, { compact: true })}
                    offerCount={offerCount(a)}
                    heldPercent={heldPercent(a)}
                  />
                ))}
              </div>
            )}
          </div>

          {!assetsLoading && !assetsError && stats.offers.length > 0 && (
            <p className="px-4 sm:px-6 lg:px-8 mt-4 text-xs text-[#a1a1aa]">
              Lowest offer right now: <span className="text-white font-semibold tabular-nums">{formatMUSD(Math.min(...stats.offers.map((o) => o.pricePerTokenFormatted)))}</span> per token.{" "}
              <Link to="/marketplace" className="text-[#22e07a] font-semibold hover:underline">See all offers</Link>
            </p>
          )}
        </section>

        {/* How it works */}
        <section className="mt-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
          <span className={eyebrow}>How it works</span>
          <h2 className="mt-3 text-2xl sm:text-4xl font-bold text-white">Land tokenization in three steps</h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className={`${card} p-6`}>
                <div className="flex items-center justify-between">
                  <span className="w-12 h-12 rounded-2xl bg-[#1fe06f]/10 border border-[#1fe06f]/25 text-[#22e07a] flex items-center justify-center"><Icon size={22} /></span>
                  <span className="text-4xl font-bold text-white/10 tabular-nums">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>
                <p className="mt-2 text-sm text-[#a1a1aa] leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Roles */}
        <section className="mt-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
          <span className={eyebrow}>Who is it for</span>
          <h2 className="mt-3 text-2xl sm:text-4xl font-bold text-white">Pick how you want to use it</h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
            {roles.map(({ key, route, icon: Icon, title, text, cta, purple }) => (
              <div key={key} className={`${card} p-6 flex flex-col`}>
                <span className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${purple ? "bg-purple-500/10 border-purple-500/25 text-purple-400" : "bg-[#1fe06f]/10 border-[#1fe06f]/25 text-[#22e07a]"}`}><Icon size={22} /></span>
                <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>
                <p className="mt-2 text-sm text-[#a1a1aa] leading-relaxed flex-1">{text}</p>
                <button
                  onClick={() => handleLaunchRole(key, route)}
                  className={`mt-6 w-full py-3 rounded-full font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition ${purple ? "bg-purple-600 hover:bg-purple-500 text-white" : "bg-[#1fe06f] hover:brightness-110 text-[#0b1a10]"}`}
                >
                  {cta} <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-20 mb-10 flex flex-wrap gap-x-6 gap-y-2 justify-center text-xs text-[#8e8f98] px-4">
          <Link to="/portfolio" className="hover:text-white">Investor portfolio</Link>
          <Link to="/profit-dashboard" className="hover:text-white">Returns</Link>
          <Link to="/login" className="hover:text-white">Log in</Link>
        </footer>
      </main>
    </div>
  );
}
