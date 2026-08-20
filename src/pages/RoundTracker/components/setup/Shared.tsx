import React from "react";
import { formatOption } from "../../lib/validation";

export function Field({
  label, value, onChange, type = "text", placeholder, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-muted">{label}</label>
      <input
        type={type}
        min={type === "number" ? 0 : undefined}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line px-4 py-3 outline-none focus:border-golf disabled:bg-steel/5 disabled:text-muted"
      />
    </div>
  );
}

export function SelectField({
  label, value, onChange, options, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-muted">{label}</label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-white px-4 py-3 capitalize outline-none focus:border-golf disabled:bg-steel/5 disabled:text-muted"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{formatOption(opt)}</option>
        ))}
      </select>
    </div>
  );
}

export function PlayerAvatar({ src, name }: { src?: string | null; name: string }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-dark text-sm font-bold text-white">
      {src ? <img src={src} alt={`${name} avatar`} className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
    </span>
  );
}
