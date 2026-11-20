import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import { geoOrthographic, geoPath, geoGraticule10, geoContains, geoDistance, geoCentroid, geoArea } from "d3-geo";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";

const countries = feature(world, world.objects.countries).features;
const keyOf = (c) => c.id ?? c.properties?.name;
const byKey = new Map(countries.map((c) => [keyOf(c), c]));
const graticule = geoGraticule10();

const TILT = 32;          // degrees a pin sits above the globe centre when nothing is selected
const SELECT_TILT = 0.66; // vertical squash of the map in the zoomed 3D view
const clampLat = (v) => Math.max(-90, Math.min(90, v));
const lerp = (a, b, t) => a + (b - a) * t;

export const countryName = (key) => byKey.get(key)?.properties?.name || "";
export const countryOfPoint = (lon, lat) => {
  const c = countries.find((f) => geoContains(f, [lon, lat]));
  return c ? keyOf(c) : null;
};

// How far to zoom so a country of this size fills the stage.
const zoomFor = (c) => {
  const deg = (2 * Math.sqrt(geoArea(c) / Math.PI) * 180) / Math.PI;
  return Math.max(1.6, Math.min(14, 52 / Math.max(deg, 1)));
};

/**
 * A draggable world globe. Click a country to turn and zoom to it: it rises as a 3D slab
 * and the lands registered in it are marked. Pins are { id, lon, lat, to, name, place, price, photo }.
 */
export default function WorldGlobe({ pins, selected = null, onSelect }) {
  const wrap = useRef(null);
  const canvas = useRef(null);
  const tip = useRef(null);
  const cardRefs = useRef({});
  const live = useRef({ pins, selected, onSelect });
  live.current = { pins, selected, onSelect };
  const state = useRef({
    rot: [-80, -(7 - TILT)], vel: [0, 0], k: 1, kT: 1, ty: 0, sy: 1, rotT: null,
    dragging: false, last: null, start: null, moved: false, hover: null, dirty: true, proj: null,
  });

  const pinCountry = useMemo(() => new Map(pins.map((p) => [p.id, countryOfPoint(p.lon, p.lat)])), [pins]);
  const lit = useMemo(() => new Set(pinCountry.values()), [pinCountry]);
  const detail = useRef({ map: null, loading: false });
  // Zoomed out, lands in one country are shown as a single dot with a count.
  const clusters = useMemo(() => {
    const groups = new Map();
    for (const p of pins) {
      const key = pinCountry.get(p.id) ?? `p:${p.id}`;
      const g = groups.get(key) || { key, lon: 0, lat: 0, count: 0 };
      g.lon += p.lon; g.lat += p.lat; g.count += 1;
      groups.set(key, g);
    }
    return [...groups.values()].map((g) => ({ ...g, lon: g.lon / g.count, lat: g.lat / g.count }));
  }, [pins, pinCountry]);
  const counts = useMemo(() => new Map(clusters.map((c) => [c.key, c.count])), [clusters]);
  const clusterRefs = useRef({});
  const liveMaps = useRef({ pinCountry, lit, clusters, counts });
  liveMaps.current = { pinCountry, lit, clusters, counts };

  // Turn the globe to the first property when the pins change and nothing is selected.
  useEffect(() => {
    if (pins.length && !live.current.selected) {
      state.current.rot = [-pins[0].lon, -(pins[0].lat - TILT)];
      state.current.dirty = true;
    }
  }, [pins]);

  // Zoom in on a country, or back out to the whole world.
  useEffect(() => {
    const s = state.current;
    const c = selected ? byKey.get(selected) : null;
    // The coarse world map is too rough up close: fetch the detailed outlines the first time a country is opened.
    if (c && !detail.current.map && !detail.current.loading) {
      detail.current.loading = true;
      import("world-atlas/countries-10m.json")
        .then((m) => {
          const fine = feature(m.default, m.default.objects.countries).features;
          detail.current.map = new Map(fine.map((f) => [keyOf(f), f]));
          state.current.dirty = true;
        })
        .catch(() => { detail.current.loading = false; }); // keep the coarse outline if it cannot load
    }
    if (c) {
      const [lon, lat] = geoCentroid(c);
      s.rotT = [-lon, -lat];
      s.kT = zoomFor(c);
    } else {
      s.rotT = null;
      s.kT = 1;
    }
    s.vel = [0, 0];
    s.dirty = true;
  }, [selected]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && live.current.selected) live.current.onSelect?.(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const el = wrap.current;
    const cv = canvas.current;
    const ctx = cv.getContext("2d");
    let raf = 0;
    let size = 0;
    let dpr = 1;
    let idleY = 0;
    let stageY = 0;

    const resize = () => {
      size = el.clientWidth;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = size * dpr;
      cv.height = size * dpr;
      cv.style.width = `${size}px`;
      cv.style.height = `${size}px`;
      const top = window.innerWidth >= 640 ? 330 : 300; // where the globe starts on the page
      idleY = top + size / 2;
      stageY = window.innerWidth >= 640 ? 410 : 380;    // where a zoomed country sits
      if (!state.current.ty) state.current.ty = idleY;
      state.current.dirty = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const projFor = (s) => geoOrthographic().translate([size / 2, s.ty]).scale((size / 2 - 6) * s.k).rotate(s.rot).clipAngle(90);

    const draw = () => {
      const s = state.current;
      const { pins: ps, selected: sel } = live.current;
      const { pinCountry: pc, lit: litSet, clusters: cl } = liveMaps.current;
      const selFeature = sel ? (detail.current.map?.get(sel) || byKey.get(sel)) : null;

      // Ease toward the zoom target.
      const tyT = selFeature ? stageY : idleY;
      const syT = selFeature ? SELECT_TILT : 1;
      if (Math.abs(s.k - s.kT) > 0.002 || Math.abs(s.ty - tyT) > 0.3 || Math.abs(s.sy - syT) > 0.002) {
        s.k = lerp(s.k, s.kT, 0.09);
        s.ty = lerp(s.ty, tyT, 0.09);
        s.sy = lerp(s.sy, syT, 0.09);
        s.dirty = true;
      }
      if (s.rotT && !s.dragging) {
        const dLon = ((s.rotT[0] - s.rot[0] + 540) % 360) - 180;
        const dLat = s.rotT[1] - s.rot[1];
        if (Math.abs(dLon) > 0.03 || Math.abs(dLat) > 0.03) {
          s.rot = [s.rot[0] + dLon * 0.09, s.rot[1] + dLat * 0.09];
          s.dirty = true;
        }
      }
      // Momentum after a drag, or a slow spin when there is nothing to look at.
      if (!s.dragging && !s.rotT) {
        if (Math.abs(s.vel[0]) > 0.01 || Math.abs(s.vel[1]) > 0.01) {
          s.rot = [s.rot[0] + s.vel[0], clampLat(s.rot[1] + s.vel[1])];
          s.vel = [s.vel[0] * 0.94, s.vel[1] * 0.94];
          s.dirty = true;
        } else if (!ps.length) {
          s.rot = [s.rot[0] + 0.12, s.rot[1]];
          s.dirty = true;
        }
      }

      if (s.dirty && size) {
        s.dirty = false;
        const progress = selFeature ? Math.max(0, Math.min(1, (s.k - 1) / Math.max(s.kT - 1, 0.01))) : Math.max(0, Math.min(1, (s.k - 1) / 4));
        const cx = size / 2;
        const projection = projFor(s);
        s.proj = projection;
        const path = geoPath(projection, ctx);
        const rr = (size / 2 - 6) * s.k;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, size, size);
        ctx.save();
        ctx.translate(cx, s.ty);
        ctx.scale(1, s.sy);
        ctx.translate(-cx, -s.ty);

        // Ocean
        const sea = ctx.createRadialGradient(cx, s.ty - rr * 0.6, rr * 0.05, cx, s.ty, rr);
        sea.addColorStop(0, "#2b2d32");
        sea.addColorStop(0.6, "#1a1b1e");
        sea.addColorStop(1, "#0d0e10");
        ctx.beginPath();
        path({ type: "Sphere" });
        ctx.fillStyle = sea;
        ctx.fill();

        ctx.beginPath();
        path(graticule);
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = 0.6;
        ctx.stroke();

        // Countries
        for (const c of countries) {
          const k = keyOf(c);
          if (selFeature && k === sel) continue; // drawn below as the raised slab
          const isLit = litSet.has(k);
          const isHover = s.hover === k;
          ctx.beginPath();
          path(c);
          ctx.fillStyle = isHover ? "#454850" : isLit ? "rgba(31,224,111,0.34)" : selFeature ? "#2a2b30" : "#33353b";
          ctx.fill();
          ctx.strokeStyle = isLit ? "rgba(31,224,111,0.9)" : "rgba(255,255,255,0.20)";
          ctx.lineWidth = isLit ? 1 : 0.6;
          ctx.stroke();
        }

        // The selected country: a 3D slab with a shadow, side walls and a lit top.
        if (selFeature) {
          // The slab is as tall as a fraction of the country's size on screen, so it reads as a solid block.
          const [[bx0, by0], [bx1, by1]] = path.bounds(selFeature);
          const rise = Math.max(18, Math.min(72, (by1 - by0) * s.sy * 0.1)) * progress;
          s.rise = rise;
          ctx.save();
          ctx.beginPath();
          path(selFeature);
          ctx.shadowColor = "rgba(0,0,0,0.7)";
          ctx.shadowBlur = 34;
          ctx.shadowOffsetY = 14;
          ctx.fillStyle = "#04100a";
          ctx.fill();
          ctx.restore();
          const steps = Math.max(1, Math.min(26, Math.round(rise)));
          for (let i = 0; i <= steps; i++) {
            ctx.save();
            ctx.translate(0, -(i / steps) * rise / s.sy);
            ctx.beginPath();
            path(selFeature);
            const top = i === steps;
            if (top) {
              // Lit top face: bright at the back, deeper green toward the viewer.
              const lit = ctx.createLinearGradient(0, by0, 0, by1);
              lit.addColorStop(0, "#3fe08a");
              lit.addColorStop(0.55, "#1fa85c");
              lit.addColorStop(1, "#157a43");
              ctx.fillStyle = lit;
            } else {
              ctx.fillStyle = `hsl(148, 66%, ${9 + 15 * (i / steps)}%)`;
            }
            ctx.fill();
            if (top) {
              ctx.lineJoin = "round";
              ctx.strokeStyle = "#a6ffc8";
              ctx.lineWidth = 1.8;
              ctx.shadowColor = "rgba(31,224,111,0.7)";
              ctx.shadowBlur = 10;
              ctx.stroke();
            }
            ctx.restore();
          }
          // Land markers on the top face.
          ctx.save();
          ctx.translate(0, -rise / s.sy);
          const centre = [-s.rot[0], -s.rot[1]];
          for (const p of ps) {
            if (pc.get(p.id) !== sel || geoDistance([p.lon, p.lat], centre) > Math.PI / 2 - 0.05) continue;
            const xy = projection([p.lon, p.lat]);
            if (!xy) continue;
            ctx.beginPath();
            ctx.arc(xy[0], xy[1], 16, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(31,224,111,0.22)";
            ctx.fill();
            ctx.strokeStyle = "#1fe06f";
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          ctx.restore();
        }
        ctx.restore();

        // Rim light (only while the whole globe is in view)
        if (s.k < 1.5) {
          const rim = ctx.createRadialGradient(cx, s.ty, rr * 0.9, cx, s.ty, rr);
          rim.addColorStop(0, "rgba(31,224,111,0)");
          rim.addColorStop(1, "rgba(31,224,111,0.32)");
          ctx.beginPath();
          path({ type: "Sphere" });
          ctx.fillStyle = rim;
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.14)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Pin cards follow their land on the surface.
        const centre = [-s.rot[0], -s.rot[1]];
        for (const p of ps) {
          const node = cardRefs.current[p.id];
          if (!node) continue;
          const front = geoDistance([p.lon, p.lat], centre) < Math.PI / 2 - 0.08;
          const xy = projection([p.lon, p.lat]);
          const show = front && xy && sel && pc.get(p.id) === sel; // photo icons only inside a country
          if (show) {
            const y = s.ty + (xy[1] - s.ty) * s.sy - (sel ? s.rise || 0 : 0);
            node.style.opacity = "1";
            node.style.visibility = "visible";
            node.style.transform = `translate(${xy[0]}px, ${y}px) translate(-50%, -50%)`;
          } else {
            node.style.opacity = "0";
            node.style.visibility = "hidden";
          }
        }
        // One dot per country while the whole world is in view.
        for (const c of cl) {
          const node = clusterRefs.current[c.key];
          if (!node) continue;
          const front = geoDistance([c.lon, c.lat], centre) < Math.PI / 2 - 0.05;
          const xy = projection([c.lon, c.lat]);
          if (!sel && front && xy) {
            node.style.opacity = "1";
            node.style.transform = `translate(${xy[0]}px, ${s.ty + (xy[1] - s.ty) * s.sy}px) translate(-50%, -50%)`;
          } else {
            node.style.opacity = "0";
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  // Which country is under this screen point (undoing the vertical squash of the 3D view).
  const countryAt = (clientX, clientY) => {
    const s = state.current;
    if (!s.proj) return null;
    const rect = wrap.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = s.ty + (clientY - rect.top - s.ty) / s.sy;
    const at = (px, py) => {
      const pt = s.proj.invert([px, py]);
      if (!pt || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) return null;
      const c = countries.find((f) => geoContains(f, pt));
      return c ? keyOf(c) : null;
    };
    const exact = at(x, y);
    if (exact || s.k > 2) return exact;
    // Zoomed out, small countries are only a few pixels wide: forgive a near miss.
    for (const r of [7, 14]) {
      for (let a = 0; a < 8; a++) {
        const hit = at(x + r * Math.cos((a * Math.PI) / 4), y + r * Math.sin((a * Math.PI) / 4));
        if (hit) return hit;
      }
    }
    return null;
  };

  const down = (e) => {
    const s = state.current;
    s.dragging = true;
    s.moved = false;
    s.start = [e.clientX, e.clientY];
    s.last = [e.clientX, e.clientY];
    s.vel = [0, 0];
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    const s = state.current;
    if (!s.dragging) {
      const k = countryAt(e.clientX, e.clientY);
      if (k !== s.hover) {
        s.hover = k;
        s.dirty = true;
        wrap.current.style.cursor = k ? "pointer" : "grab";
      }
      if (tip.current) {
        const rect = wrap.current.getBoundingClientRect();
        const n = k ? liveMaps.current.counts.get(k) || 0 : 0;
        tip.current.textContent = k ? `${countryName(k)}${n ? ` · ${n} ${n === 1 ? "land" : "lands"}` : ""}` : "";
        tip.current.style.opacity = k ? "1" : "0";
        tip.current.style.transform = `translate(${e.clientX - rect.left + 14}px, ${e.clientY - rect.top + 14}px)`;
      }
      return;
    }
    const dx = e.clientX - s.last[0];
    const dy = e.clientY - s.last[1];
    s.last = [e.clientX, e.clientY];
    if (Math.hypot(e.clientX - s.start[0], e.clientY - s.start[1]) > 5) s.moved = true;
    if (!s.moved) return;
    // Degrees per pixel shrink as we zoom in, so the map follows the cursor.
    const k = (180 / Math.max(wrap.current.clientWidth * 0.5, 1)) * 0.9 / s.k;
    s.rot = [s.rot[0] + dx * k, clampLat(s.rot[1] - (dy / s.sy) * k)];
    s.vel = [dx * k * 0.6, -dy * k * 0.6];
    s.rotT = null;
    s.dirty = true;
  };
  const up = (e) => {
    const s = state.current;
    if (!s.dragging) return;
    s.dragging = false;
    if (!s.moved) {
      const k = countryAt(e.clientX, e.clientY);
      live.current.onSelect?.(k); // clicking the sea zooms back out
    }
  };
  const leave = () => {
    state.current.hover = null;
    state.current.dirty = true;
    if (tip.current) tip.current.style.opacity = "0";
  };

  return (
    <div
      ref={wrap}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => { state.current.dragging = false; }}
      onPointerLeave={leave}
      role="img"
      aria-label={`Interactive world globe. ${pins.length} tokenized ${pins.length === 1 ? "land" : "lands"} marked. Click a country to zoom in, drag to rotate.`}
      className="relative w-full aspect-square cursor-grab active:cursor-grabbing touch-pan-y select-none"
    >
      <canvas ref={canvas} className="block" />
      <div ref={tip} aria-hidden className="pointer-events-none absolute left-0 top-0 z-20 px-2.5 py-1 rounded-full bg-black/80 border border-white/15 text-xs font-semibold text-white whitespace-nowrap transition-opacity" style={{ opacity: 0 }} />
      {clusters.map((c) => (
        <div
          key={c.key}
          ref={(n) => { clusterRefs.current[c.key] = n; }}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 transition-opacity duration-200"
          style={{ opacity: 0 }}
        >
          <span className="relative flex w-3.5 h-3.5">
            <span className="absolute inset-0 rounded-full bg-[#1fe06f] opacity-60 animate-ping" />
            <span className="relative w-3.5 h-3.5 rounded-full bg-[#1fe06f] border-2 border-[#0b1a10] shadow-[0_0_12px_rgba(31,224,111,0.9)]" />
            {c.count > 1 && (
              <span className="absolute -top-3 -right-3 min-w-4 h-4 px-1 rounded-full bg-white text-[#0b1a10] text-[10px] font-bold leading-4 text-center tabular-nums">{c.count}</span>
            )}
          </span>
        </div>
      ))}
      {pins.map((p) => (
        <div
          key={p.id}
          ref={(n) => { cardRefs.current[p.id] = n; }}
          className="pointer-events-none absolute left-0 top-0 transition-opacity duration-200 has-[a:hover]:z-30 has-[a:focus-visible]:z-30"
          style={{ opacity: 0 }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* A small round icon marks the land; its card opens on hover or keyboard focus. */}
          <Link
            to={p.to}
            aria-label={`View ${p.name}, ${p.place}${p.price ? `, ${p.price} per token` : ""}`}
            className="pointer-events-auto group relative block w-9 h-9 rounded-full outline-none"
          >
            <span aria-hidden className="absolute inset-0 rounded-full bg-[#1fe06f] opacity-40 animate-ping" />
            <span className="relative block w-9 h-9 rounded-full overflow-hidden border-2 border-[#1fe06f] bg-[#232427] shadow-[0_6px_16px_rgba(0,0,0,0.6)] transition-transform group-hover:scale-110 group-focus-visible:scale-110">
              {p.photo
                ? <img src={p.photo} alt="" draggable={false} className="w-full h-full object-cover" />
                : <span className="flex w-full h-full items-center justify-center text-[#1fe06f]"><Building2 size={16} /></span>}
            </span>
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 pb-3 hidden group-hover:block group-focus-visible:block">
              <span className="block w-44 rounded-2xl overflow-hidden border border-white/15 bg-[#1b1c1f] shadow-2xl shadow-black/70 text-left">
                {p.photo
                  ? <img src={p.photo} alt="" draggable={false} className="h-24 w-full object-cover" />
                  : <span className="block h-24 w-full bg-[#232427]" />}
                <span className="block px-3 py-2.5">
                  <span className="block text-xs font-semibold text-white truncate">{p.name}</span>
                  <span className="block text-[10px] text-[#a1a1aa] truncate">{p.place}</span>
                  {p.price && <span className="block mt-0.5 text-[11px] text-[#22e07a] font-semibold tabular-nums">{p.price} / token</span>}
                </span>
              </span>
            </span>
          </Link>
        </div>
      ))}
    </div>
  );
}
