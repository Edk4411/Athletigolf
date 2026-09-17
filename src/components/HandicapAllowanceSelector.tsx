// Per-player allowance selector. Formats must never overwrite this choice.
import { FieldLabel } from "@/components/ui";
import type { GameFormat } from "@/lib/handicap";

type Props = {
  format: GameFormat;
  value: number;                       // current % (e.g. 95)
  onChange: (v: number) => void;
  numPlayersOnSide?: number;
  className?: string;
};

const commonOptions = [100, 95, 90, 85, 80];

export default function HandicapAllowanceSelector({ format: _format, value, onChange, numPlayersOnSide: _numPlayersOnSide, className = "" }: Props) {

  return (
    <div className={className} data-testid="handicap-allowance-selector">
      <FieldLabel>
        Handicap allowance
        <span className="ml-2 text-[10px] font-normal uppercase tracking-wider text-muted">Set for this player</span>
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
    </div>
  );
}
