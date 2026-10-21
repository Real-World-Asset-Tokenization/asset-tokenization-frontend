import React, { useState } from "react";
import { Plus, Minus, MapPin, ExternalLink } from "lucide-react";

export default function ParcelMapView({
  name = "Malabe",
  district = "Colombo",
  coordinates = { lat: 6.9044, lng: 79.9542 },
  zoomLevel = 14
}) {
  const [zoom, setZoom] = useState(zoomLevel);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 1, 18));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 1, 10));

  // Determine label based on location
  const centerLabel = name.includes("Plot") || name.includes("Lot") || name.includes("Residence")
    ? name.split(" ")[0]
    : name;

  return (
    <div className="relative w-full h-[280px] sm:h-[320px] rounded-2xl overflow-hidden border border-white/10 bg-[#0B1020] select-none group shadow-inner">
      {/* Dark Styled Map Canvas / SVG Layer matching Leaflet dark theme */}
      <div className="absolute inset-0 bg-[#0c1222] overflow-hidden">
        {/* Map Grid and Topography Background */}
        <svg
          className="w-full h-full opacity-60 transition-transform duration-500 ease-out"
          style={{ transform: `scale(${1 + (zoom - 14) * 0.15})` }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            </pattern>
            <radialGradient id="halo-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#16a34a" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#16a34a" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Grid background */}
          <rect width="100%" height="100%" fill="url(#map-grid)" />

          {/* Terrain / Secondary Roads */}
          <path
            d="M -50,180 Q 150,140 320,160 T 650,120 T 1000,190"
            fill="none"
            stroke="#1b253d"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M 120,-20 Q 220,120 280,220 T 360,400"
            fill="none"
            stroke="#1e2a47"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M 280,220 Q 420,200 580,260 T 900,280"
            fill="none"
            stroke="#25355a"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M 400,-30 Q 380,140 280,220 T 180,380"
            fill="none"
            stroke="#162035"
            strokeWidth="5"
          />

          {/* Major Highway / Route (A3 / Malabe Road) */}
          <path
            d="M -20,260 Q 200,240 350,210 T 600,170 T 950,130"
            fill="none"
            stroke="#3b4f7a"
            strokeWidth="4"
          />
          <path
            d="M -20,260 Q 200,240 350,210 T 600,170 T 950,130"
            fill="none"
            stroke="#ffaa00"
            strokeWidth="1.5"
            strokeDasharray="6 4"
            opacity="0.7"
          />

          {/* Area labels on map */}
          <text x="32%" y="28%" fill="#6b7c9e" fontSize="11" fontWeight="600" letterSpacing="0.05em">
            Thalahena
          </text>
          <text x="18%" y="45%" fill="#6b7c9e" fontSize="10" fontWeight="500">
            Thalangama North
          </text>
          <text x="12%" y="62%" fill="#5b6c8c" fontSize="10">
            Muttettugoda
          </text>
          <text x="75%" y="42%" fill="#5b6c8c" fontSize="10">
            Pittugala
          </text>
          <text x="76%" y="72%" fill="#4d5c78" fontSize="9">
            Kaduwela Rd
          </text>

          {/* Center Coordinates Dot Glow */}
          <circle cx="50%" cy="50%" r="48" fill="url(#halo-glow)" className="animate-pulse" />
        </svg>

        {/* Ambient Map Tint */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090D1A]/80 via-transparent to-[#090D1A]/40 pointer-events-none" />
      </div>

      {/* Center Interactive Marker Pin */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-10">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-[#16a34a] border-2 border-white/80 shadow-[0_0_20px_#16a34a] flex items-center justify-center animate-bounce">
            <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
          </div>
          <div className="absolute -inset-2 rounded-full border border-indigo-400/50 animate-ping" />
        </div>
        <span className="mt-1 px-2.5 py-0.5 rounded-md bg-[#090D1A]/90 border border-indigo-500/30 text-white text-[11px] font-bold shadow-lg backdrop-blur-sm">
          {centerLabel}
        </span>
      </div>

      {/* Map Zoom Controls on Top-Left */}
      <div className="absolute top-3 left-3 flex flex-col rounded-lg overflow-hidden border border-white/10 bg-[#0E1528]/90 backdrop-blur-md shadow-lg z-20">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition-colors border-b border-white/10 cursor-pointer"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Coordinates readout top-right */}
      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-[#0E1528]/90 border border-white/10 text-[10px] font-mono text-zinc-400 backdrop-blur-md z-20 hidden sm:block">
        {coordinates.lat.toFixed(4)}° N, {coordinates.lng.toFixed(4)}° E
      </div>

      {/* Leaflet & OpenStreetMap Attribution on Bottom-Right */}
      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-[#090D1A]/80 border border-white/5 text-[9px] text-zinc-500 flex items-center gap-1 z-20 font-sans">
        <span>Leaflet</span>
        <span>|</span>
        <span>© OpenStreetMap</span>
      </div>
    </div>
  );
}
