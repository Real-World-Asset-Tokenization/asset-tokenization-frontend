import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const field = (error) =>
  `w-full px-3.5 py-3 rounded-xl border bg-[#1b1c1f] text-white placeholder:text-[#8e8f98] focus:outline-none focus:border-[#1fe06f] focus:shadow-[0_0_0_3px_rgba(31,224,111,0.18)] ${
    error ? 'border-rose-500/70' : 'border-white/10 hover:border-white/20'
  }`;

// Labelled text field. Password fields get a show / hide toggle.
export function Input({ label, error, hint, id, type = 'text', className = '', ...props }) {
  const auto = useId();
  const inputId = id || auto;
  const [shown, setShown] = useState(false);
  const isPassword = type === 'password';
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-[#d4d4d8]">{label}</label>}
      <div className="relative">
        <input
          id={inputId}
          type={isPassword && shown ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${field(error)} ${isPassword ? 'pr-11' : ''} ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            aria-label={shown ? 'Hide password' : 'Show password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#8e8f98] hover:text-white"
          >
            {shown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <p id={`${inputId}-error`} className="text-sm text-rose-400">{error}</p>}
      {!error && hint && <p id={`${inputId}-hint`} className="text-xs text-[#8e8f98]">{hint}</p>}
    </div>
  );
}
