import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRole } from "../context/RoleContext";
import { User, Building, ShieldCheck, ChevronDown, Check, Sparkles } from "lucide-react";

export default function RoleSwitcher() {
  const navigate = useNavigate();
  const { activeRole, switchRole, roleConfigs } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectRole = (roleKey) => {
    switchRole(roleKey);
    setIsOpen(false);
    const targetRoute = roleConfigs[roleKey]?.defaultRoute || "/";
    navigate(targetRoute);
  };

  const getRoleIcon = (roleKey, className = "w-4 h-4") => {
    switch (roleKey) {
      case "investor":
        return <User className={className} />;
      case "asset_owner":
        return <Building className={className} />;
      case "admin":
        return <ShieldCheck className={className} />;
      default:
        return <User className={className} />;
    }
  };

  const activeConfig = roleConfigs[activeRole] || roleConfigs.investor;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-sm hover:scale-[1.02] ${activeConfig.bgBadge}`}
        title="Switch between the 3 separate user views"
      >
        <span className="flex items-center gap-1.5">
          {getRoleIcon(activeRole, "w-3.5 h-3.5")}
          <span>{activeConfig.badgeLabel}</span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 shadow-2xl py-2 z-50 text-left animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-zinc-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-400" />
              Select User Role View
            </span>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Only features for the selected user role will be displayed.
            </p>
          </div>

          <div className="p-1.5 space-y-1">
            {Object.values(roleConfigs).map((cfg) => {
              const isSelected = activeRole === cfg.id;
              return (
                <button
                  key={cfg.id}
                  onClick={() => handleSelectRole(cfg.id)}
                  className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-zinc-800/90 text-white border border-zinc-700/60"
                      : "text-zinc-300 hover:bg-zinc-800/50 hover:text-white border border-transparent"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {getRoleIcon(cfg.id, "w-4 h-4")}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        {cfg.label}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight mt-0.5 line-clamp-2">
                      {cfg.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
