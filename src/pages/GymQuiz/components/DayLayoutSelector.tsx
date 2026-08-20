import { TrainingData, weekDays } from "@/lib/matching/splitGenerator";
import { getStyledFocuses } from "@/lib/matching/splitGenerator";

interface DayLayoutSelectorProps {
  data: TrainingData;
  gymOnly: boolean;
  onChange: (focus: string, day: string) => void;
}

export default function DayLayoutSelector({ data, gymOnly, onChange }: DayLayoutSelectorProps) {
  const focuses = getStyledFocuses(data, gymOnly ? "gym" : "athletic");

  if (data.splitStyle === "Auto-build for me" || data.splitStyle === "") {
    return (
      <div className="rounded-xl border border-line bg-white/70 p-4 text-sm leading-relaxed text-muted">
        Auto-build will place sessions around your protected rest days. Pick a named split style if you want to choose exact days for Push, Pull, Upper, Lower, and similar sessions.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {focuses.map((focus) => (
        <label key={focus} className="grid gap-2 rounded-xl border border-line bg-white/70 p-4">
          <span className="text-sm font-semibold text-dark">{focus}</span>
          <select
            value={data.preferredDays[focus] || ""}
            onChange={(event) => onChange(focus, event.target.value)}
            className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-semibold text-dark outline-none transition focus:border-pulse focus:ring-2 focus:ring-pulse/20"
          >
            <option value="">Let AthletiGolf place it</option>
            {weekDays.map((day) => (
              <option key={day} value={day} disabled={data.restDays.includes(day)}>
                {day}{data.restDays.includes(day) ? " (rest)" : ""}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
