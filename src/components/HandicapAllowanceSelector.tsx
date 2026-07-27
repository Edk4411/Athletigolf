// Handicap allowance selector - Match Play 100/95/90%, Stableford 95%, custom.
import { FieldLabel } from "@/components/ui";
import type { GameFormat } from "@/lib/handicap";
import { DEFAULT_ALLOWANCE, suggestedAllowance } from "@/lib/handicap";

type Props = {
  format: GameFormat;
  value: number;                       // current % (e.g. 95)
  onChange: (v: number) => void;
  numPlayersOnSide?: number;
  className?: string;
};

const commonOptions = [100, 95, 90, 85, 80];

export default function HandicapAllowanceSelector({ format, value, onChange, numPlayersOnSide, className = "" }: Props) {
  const suggested = suggestedAllowance(format, numPlayersOnSide);
  const showFoursomes = format === "foursomes" || format === "greensomes";

  return (
    <div className={className} data-testid="handicap-allowance-selector">
      <FieldLabel>
        Handicap allowance
        <span className="ml-2 text-[10px] font-normal uppercase tracking-wider text-muted">Suggested: {suggested}%</span>
      </FieldLabel>
      <div className="mt-1 flex flex-wrap gap-2">
        {commonOptions.map((pct) => (
          <button
            key={pct}
            type="button"
            data-testid={`allowance-${pct}`}
            onClick={() => onChange(pct)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              value === pct ? "border-golf bg-golf text-white" : "border-line bg-white/70 text-muted hover:border-golf/40"
            }`}
          >
            {pct}%
          </button>
        ))}
        <label className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/70 px-3 py-1.5 text-xs font-semibold text-muted">
          Custom
          <input
            type="number"
            min={0}
            max={100}
            value={value}
            onChange={(e) => onChange(Number(e.target.value) || 0)}
            data-testid="allowance-custom"
            className="w-14 rounded border border-line bg-panel px-1.5 py-0.5 text-center text-xs text-dark"
          />
          %
        </label>
      </div>
      {showFoursomes && (
        <p className="mt-2 text-xs text-muted">
          Foursomes uses 50% of combined course handicaps; Greensomes uses 60% lower + 40% higher. This % applies on top of that.
        </p>
      )}
      {value !== DEFAULT_ALLOWANCE[format] && value !== suggested && (
        <p className="mt-2 text-xs text-golf">Non-standard allowance for {format.replace(/_/g, " ")} - we&apos;ll still store your setting.</p>
      )}
    </div>
  );
}
