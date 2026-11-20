import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Globe } from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";

export default function CurrencyPicker() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { currency, currencyInfo, currencies, setCurrency } = useCurrency();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (code) => {
    setCurrency(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Header Selector Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Change Display Currency"
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/70 hover:border-zinc-600 rounded-lg text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <span className="text-sm leading-none">{currencyInfo.flag}</span>
        <span className="font-mono text-zinc-100">{currencyInfo.code}</span>
        <span className="text-zinc-400 font-mono text-[11px]">({currencyInfo.symbol})</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-400" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/90 shadow-2xl shadow-black/80 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3.5 py-2.5 bg-zinc-950/70 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold tracking-wider uppercase text-zinc-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                Display Currency
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Auto-converts asset values & payouts
              </p>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
              USD Pegged
            </span>
          </div>

          <div className="py-1 max-h-72 overflow-y-auto divide-y divide-zinc-800/40">
            {Object.values(currencies).map((c) => {
              const isSelected = c.code === currency;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelect(c.code)}
                  className={`w-full px-3.5 py-2 text-left flex items-center justify-between transition-colors ${
                    isSelected
                      ? "bg-blue-600/15 text-white"
                      : "text-zinc-300 hover:bg-zinc-800/70 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg leading-none">{c.flag}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold">{c.code}</span>
                        <span className="text-xs text-zinc-400 font-mono">({c.symbol})</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-tight">
                        {c.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-right">
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {c.code === "USD" ? (
                        <span className="text-emerald-400 font-semibold">1:1 Base</span>
                      ) : (
                        <span>
                          {c.rateToUSD >= 1 ? `1$ = ${c.rateToUSD}` : `1$ = ${c.rateToUSD}`}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-400 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-3.5 py-2 bg-zinc-950/80 border-t border-zinc-800 text-[10px] text-zinc-400 flex items-center justify-between">
            <span>Reference: 1 USD ≈ 310 LKR</span>
            <span className="text-emerald-400 font-medium">Instant conversion</span>
          </div>
        </div>
      )}
    </div>
  );
}
