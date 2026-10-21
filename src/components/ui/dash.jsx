import { Link } from "react-router-dom";

// Shared building blocks for the role dashboards (navy/indigo workspace style).

export const cardClass = "rounded-2xl border border-[#1b2440] bg-[#0b1124]";

export function Card({ title, subtitle, action, children, className = "", padded = true }) {
  return (
    <section className={`${cardClass} ${className}`}>
      {(title || action) && (
        <div className={`flex items-start justify-between gap-3 ${padded ? "px-5 sm:px-6 pt-5 sm:pt-6" : "px-5 sm:px-6 pt-5"} ${children ? "pb-3" : "pb-5"}`}>
          <div className="min-w-0">
            {title && <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>}
            {subtitle && <p className="text-sm leading-relaxed text-[#98a2c3] mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children && <div className={padded ? "px-5 sm:px-6 pb-5 sm:pb-6" : ""}>{children}</div>}
    </section>
  );
}

export function CardLink({ to, children }) {
  return (
    <Link to={to} className="shrink-0 px-3.5 py-1.5 rounded-xl border border-[#1b2440] bg-[#0e1426] text-sm font-semibold text-[#c3cae2] hover:text-white hover:border-[#29345a] hover:bg-[#141c33] whitespace-nowrap">
      {children}
    </Link>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="rise flex flex-col md:flex-row md:items-start md:justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-[2rem] font-bold tracking-[-0.02em] leading-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-[#98a2c3]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 sm:gap-3">{actions}</div>}
    </div>
  );
}

export function ActionButton({ to, onClick, primary, icon: Icon, children }) {
  const cls = primary
    ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_16px_-6px_rgba(31, 224, 111,0.7)]"
    : "border border-[#1b2440] bg-[#0e1426] hover:bg-[#141c33] hover:border-[#29345a] text-white";
  const body = <>{Icon && <Icon className="w-4 h-4" />}{children}</>;
  const className = `inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm ${cls}`;
  return to ? <Link to={to} className={className}>{body}</Link> : <button onClick={onClick} className={className}>{body}</button>;
}

export function Stat({ label, value, note, tone, icon: Icon, to }) {
  const toneClass = tone === "up" ? "text-emerald-300" : tone === "down" ? "text-rose-300" : tone === "warn" ? "text-amber-300" : "text-white";
  const body = (
    <>
      <div className="flex items-center justify-between gap-2 text-[#98a2c3] text-[11px] font-semibold uppercase tracking-[0.08em]">
        <span className="truncate">{label}</span>
        {Icon && <span className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-indigo-300" /></span>}
      </div>
      <p className={`mt-2.5 text-xl sm:text-[1.65rem] leading-none font-bold tracking-tight tabular-nums truncate ${toneClass}`}>{value}</p>
      {note && <p className="mt-2 text-xs text-[#6b7599] truncate">{note}</p>}
    </>
  );
  const cls = `${cardClass} p-4 sm:p-5 block min-w-0`;
  return to ? <Link to={to} className={`${cls} hover:border-indigo-500/50 hover:bg-[#0e1426] transition-colors`}>{body}</Link> : <div className={cls}>{body}</div>;
}

const BADGE = {
  good: "border-emerald-500/50 text-emerald-300 bg-emerald-500/10",
  info: "border-sky-500/50 text-sky-300 bg-sky-500/10",
  brand: "border-indigo-400/50 text-indigo-300 bg-indigo-500/10",
  warn: "border-amber-500/50 text-amber-300 bg-amber-500/10",
  bad: "border-rose-500/50 text-rose-300 bg-rose-500/10",
  muted: "border-[#29345a] text-[#98a2c3] bg-transparent",
};
export function Badge({ tone = "muted", children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium whitespace-nowrap ${BADGE[tone]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />{children}
    </span>
  );
}

// Small tag that says who is selling: the property owner, or another investor reselling.
const SELLER = { owner: ["Property owner", "#38bdf8"], investor: ["Investor", "#a78bfa"] };
export function SellerTag({ kind, mine }) {
  const [label, color] = SELLER[kind] || SELLER.investor;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
        style={{ color, borderColor: `color-mix(in srgb, ${color} 50%, transparent)`, background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
        <span aria-hidden className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />{label}
      </span>
      {mine && <span className="text-xs font-semibold text-amber-300">You</span>}
    </span>
  );
}

export function ProgressRing({ percent, size = 128 }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`${percent}% complete`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="#1b2440" strokeWidth="10" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="#22c55e" strokeWidth="10" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} transform="rotate(-90 60 60)" />
      <text x="60" y="66" textAnchor="middle" fill="#86efac" style={{ fontSize: 26, fontWeight: 700 }}>
        {percent}<tspan style={{ fontSize: 14 }}>%</tspan>
      </text>
    </svg>
  );
}

export function Empty({ children }) {
  return <p className="text-sm leading-relaxed text-[#6b7599]">{children}</p>;
}

// Placeholder while data loads. Give it the size of what it stands in for.
export function Skeleton({ className = "h-4 w-full" }) {
  return <span aria-hidden className={`skeleton block ${className}`} />;
}

export const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
export function ago(d) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return fmtDate(d);
}

export const pageClass = "px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 max-w-[1400px]";
