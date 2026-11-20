// The identity document a person verifies with. Values match what the backend accepts.
export const ID_METHODS = [
  ["national_id", "National ID", "NIC number"],
  ["passport", "Passport", "Passport number"],
  ["driving_license", "Driving licence", "Licence number"],
];

export const idMethod = (value) => ID_METHODS.find(([v]) => v === value) || ID_METHODS[0];

// Segmented pill choice: which document will you verify with?
export default function IdMethodPicker({ value, onChange, disabled = false }) {
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-1.5 text-xs font-semibold text-zinc-300">Verify with</legend>
      <div role="radiogroup" aria-label="Identity document type" className="flex gap-1 rounded-2xl bg-[#1b1c1f] p-1">
        {ID_METHODS.map(([v, label]) => {
          const on = value === v;
          return (
            <label key={v} className={`flex-1 cursor-pointer rounded-xl px-2 py-2 text-center text-xs sm:text-sm font-semibold transition-colors ${on ? "bg-[#1fe06f] text-[#04130a]" : "text-[#a1a1aa] hover:text-white"}`}>
              <input type="radio" name="idType" value={v} checked={on} onChange={() => onChange(v)} className="sr-only" />
              {label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
