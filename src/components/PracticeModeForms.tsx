// Renders the correct sub-form based on the chosen practice mode.
// Each form updates the shared `metrics` / `clubAverages` state so the parent
// can save one uniform `practice_sessions` row.

import { Plus, Trash2 } from "lucide-react";
import { Button, FieldLabel, TextInput, SelectInput } from "@/components/ui";
import type {
  ChallengeResult, ClubAverage, PracticeMetrics, PracticeMode, PracticeSource,
  PuttingBucket, ShortGameBucket,
} from "@/lib/practiceTypes";
import { TOPTRACER_MODES } from "@/lib/practiceTypes";

const commonClubs = [
  "Driver", "3 Wood", "5 Wood", "3 Hybrid", "4 Hybrid",
  "3 Iron", "4 Iron", "5 Iron", "6 Iron", "7 Iron", "8 Iron", "9 Iron",
  "PW", "GW", "SW", "LW",
];

type Props = {
  mode: PracticeMode;
  source: PracticeSource;
  sourceMode: string;
  setSourceMode: (v: string) => void;
  clubAverages: ClubAverage[];
  setClubAverages: (v: ClubAverage[]) => void;
  metrics: PracticeMetrics;
  setMetrics: (v: PracticeMetrics) => void;
};

export default function PracticeModeForms(props: Props) {
  const { mode } = props;
  if (mode === "driving_range") return <RangeForm {...props} />;
  if (mode === "short_game")    return <ShortGameForm {...props} />;
  if (mode === "putting")       return <PuttingForm {...props} />;
  if (mode === "on_course")     return <OnCourseForm {...props} />;
  if (mode === "simulator")     return <SimulatorForm {...props} />;
  return null;
}

/* -------- Driving Range (with optional TopTracer challenge) -------- */
function RangeForm({ source, sourceMode, setSourceMode, clubAverages, setClubAverages, metrics, setMetrics }: Props) {
  const showsChallenge = source === "toptracer" && (sourceMode === "toptracer_30" || sourceMode === "toptracer_12");
  const showsAdvanced = source === "trackman" || source === "foresight" || source === "flightscope" || source === "skytrak" || source === "garmin_r10" || source === "uneekor";
  const challenge: ChallengeResult = metrics.challenge_result || {};

  const setChallenge = (patch: Partial<ChallengeResult>) => setMetrics({ ...metrics, challenge_result: { ...challenge, ...patch } });

  return (
    <div className="space-y-5">
      {source === "toptracer" && (
        <div>
          <FieldLabel>TopTracer mode</FieldLabel>
          <div className="grid gap-2 sm:grid-cols-4" data-testid="toptracer-mode-selector">
            {TOPTRACER_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                data-testid={`tt-mode-${m.value}`}
                onClick={() => setSourceMode(m.value)}
                className={`rounded-xl border p-3 text-left text-sm font-semibold transition ${
                  sourceMode === m.value ? "border-pulse bg-pulse/10 text-dark" : "border-line bg-white/70 text-muted hover:border-pulse/40"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showsChallenge && (
        <div>
          <FieldLabel>{sourceMode === "toptracer_30" ? "TopTracer 30" : "TopTracer 12"} result</FieldLabel>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <NumInput label="Total score"          value={challenge.total_score}           onChange={(v) => setChallenge({ total_score: v })} />
            <NumInput label="Closest to pin (ft)"  value={challenge.closest_to_pin_ft}     onChange={(v) => setChallenge({ closest_to_pin_ft: v })} />
            <NumInput label="Longest drive (yd)"   value={challenge.longest_drive_yards}   onChange={(v) => setChallenge({ longest_drive_yards: v })} />
            <TextField label="Targets hit"         value={challenge.targets_hit || ""}     onChange={(v) => setChallenge({ targets_hit: v })} placeholder="e.g. 7 / 12" />
            <NumInput label="Shots taken"          value={challenge.shots_taken}           onChange={(v) => setChallenge({ shots_taken: v })} />
            <NumInput label="Holes (if any)"       value={challenge.holes}                 onChange={(v) => setChallenge({ holes: v })} />
          </div>
        </div>
      )}

      <ClubAveragesEditor clubAverages={clubAverages} setClubAverages={setClubAverages} showsAdvanced={showsAdvanced} />
    </div>
  );
}

/* -------- Short Game / Pitching -------- */
function ShortGameForm({ metrics, setMetrics }: Props) {
  const buckets: ShortGameBucket[] = metrics.short_game?.buckets || [];
  const setBuckets = (next: ShortGameBucket[]) =>
    setMetrics({ ...metrics, short_game: { ...(metrics.short_game || {}), buckets: next } });
  const update = (i: number, patch: Partial<ShortGameBucket>) => setBuckets(buckets.map((b, idx) => idx === i ? { ...b, ...patch } : b));
  const overall = metrics.short_game?.avg_up_down_pct;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <NumInput label="Overall up-and-down %" value={overall} onChange={(v) => setMetrics({ ...metrics, short_game: { ...(metrics.short_game || {}), avg_up_down_pct: v ?? undefined } })} />
        <NumInput label="Total shots"           value={metrics.short_game?.total_shots} onChange={(v) => setMetrics({ ...metrics, short_game: { ...(metrics.short_game || {}), total_shots: v ?? undefined } })} />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <FieldLabel>By distance</FieldLabel>
          <Button type="button" variant="secondary" onClick={() => setBuckets([...buckets, { distance_yards: 30, attempts: 0 }])}>
            <Plus className="h-4 w-4" /> Add distance
          </Button>
        </div>
        <div className="space-y-2">
          {buckets.map((b, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-line bg-white/70 p-3 sm:grid-cols-[110px_1fr_1fr_1fr_1fr_auto]">
              <NumInput label="Dist (yd)"       value={b.distance_yards}         onChange={(v) => update(i, { distance_yards: v ?? 0 })} compact />
              <NumInput label="Attempts"        value={b.attempts}               onChange={(v) => update(i, { attempts: v ?? 0 })} compact />
              <NumInput label="Up & downs"      value={b.up_and_downs}           onChange={(v) => update(i, { up_and_downs: v ?? undefined })} compact />
              <NumInput label="Avg prox (ft)"   value={b.avg_proximity_ft}       onChange={(v) => update(i, { avg_proximity_ft: v ?? undefined })} compact />
              <NumInput label="Success %"       value={b.success_rate_pct}       onChange={(v) => update(i, { success_rate_pct: v ?? undefined })} compact />
              <RemoveBtn onClick={() => setBuckets(buckets.filter((_, idx) => idx !== i))} />
            </div>
          ))}
          {buckets.length === 0 && <p className="text-sm text-muted">Add a distance bucket to start logging short-game reps.</p>}
        </div>
      </div>
    </div>
  );
}

/* -------- Putting Green -------- */
function PuttingForm({ metrics, setMetrics }: Props) {
  const buckets: PuttingBucket[] = metrics.putting?.buckets || [];
  const setBuckets = (next: PuttingBucket[]) => setMetrics({ ...metrics, putting: { ...(metrics.putting || {}), buckets: next } });
  const update = (i: number, patch: Partial<PuttingBucket>) => setBuckets(buckets.map((b, idx) => idx === i ? { ...b, ...patch } : b));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <NumInput label="Overall make %" value={metrics.putting?.overall_make_pct} onChange={(v) => setMetrics({ ...metrics, putting: { ...(metrics.putting || {}), overall_make_pct: v ?? undefined } })} />
        <NumInput label="Total putts"    value={metrics.putting?.total_putts}      onChange={(v) => setMetrics({ ...metrics, putting: { ...(metrics.putting || {}), total_putts: v ?? undefined } })} />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <FieldLabel>By distance</FieldLabel>
          <Button type="button" variant="secondary" onClick={() => setBuckets([...buckets, { distance_ft: 6, attempts: 10, made: 0 }])}>
            <Plus className="h-4 w-4" /> Add distance
          </Button>
        </div>
        <div className="space-y-2">
          {buckets.map((b, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-line bg-white/70 p-3 sm:grid-cols-[90px_90px_90px_100px_1fr_1fr_auto]">
              <NumInput label="Dist (ft)"    value={b.distance_ft} onChange={(v) => update(i, { distance_ft: v ?? 0 })} compact />
              <NumInput label="Attempts"     value={b.attempts}    onChange={(v) => update(i, { attempts: v ?? 0 })} compact />
              <NumInput label="Made"         value={b.made}        onChange={(v) => update(i, { made: v ?? 0 })} compact />
              <NumInput label="Start off (in)" value={b.avg_start_line_offset_in} onChange={(v) => update(i, { avg_start_line_offset_in: v ?? undefined })} compact />
              <div className="grid grid-cols-2 gap-1">
                <NumInput label="Short"      value={b.short_misses}  onChange={(v) => update(i, { short_misses: v ?? undefined })} compact />
                <NumInput label="Long"       value={b.long_misses}   onChange={(v) => update(i, { long_misses: v ?? undefined })} compact />
              </div>
              <div className="grid grid-cols-2 gap-1">
                <NumInput label="Left"       value={b.left_misses}   onChange={(v) => update(i, { left_misses: v ?? undefined })} compact />
                <NumInput label="Right"      value={b.right_misses}  onChange={(v) => update(i, { right_misses: v ?? undefined })} compact />
              </div>
              <RemoveBtn onClick={() => setBuckets(buckets.filter((_, idx) => idx !== i))} />
            </div>
          ))}
          {buckets.length === 0 && <p className="text-sm text-muted">Add a distance bucket (e.g. 3ft, 6ft, 10ft, 20ft) to log putts.</p>}
        </div>
      </div>
    </div>
  );
}

/* -------- On-Course summary -------- */
function OnCourseForm({ metrics, setMetrics }: Props) {
  const oc = metrics.on_course || {};
  const set = (patch: Partial<typeof oc>) => setMetrics({ ...metrics, on_course: { ...oc, ...patch } });
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <NumInput label="Strokes"           value={oc.strokes}             onChange={(v) => set({ strokes: v })} />
      <NumInput label="Putts"             value={oc.putts}               onChange={(v) => set({ putts: v })} />
      <NumInput label="Greens in reg"     value={oc.greens_in_reg}       onChange={(v) => set({ greens_in_reg: v })} />
      <NumInput label="Fairways hit"      value={oc.fairways_hit}        onChange={(v) => set({ fairways_hit: v })} />
      <NumInput label="Fairways possible" value={oc.fairways_possible}   onChange={(v) => set({ fairways_possible: v })} />
      <NumInput label="Penalties"         value={oc.penalties}           onChange={(v) => set({ penalties: v })} />
      <NumInput label="Up & downs"        value={oc.up_and_downs}        onChange={(v) => set({ up_and_downs: v })} />
      <NumInput label="Sand saves"        value={oc.sand_saves}          onChange={(v) => set({ sand_saves: v })} />
    </div>
  );
}

/* -------- Simulator / Launch Monitor -------- */
function SimulatorForm({ clubAverages, setClubAverages, metrics, setMetrics }: Props) {
  const s = metrics.simulator || {};
  const set = (patch: Partial<typeof s>) => setMetrics({ ...metrics, simulator: { ...s, ...patch } });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel>Simulator brand</FieldLabel>
          <SelectInput value={s.simulator_brand || ""} onChange={(e) => set({ simulator_brand: e.target.value })} data-testid="sim-brand">
            <option value="">Choose...</option>
            {["Trackman", "Foresight", "SkyTrak", "GSPro", "TGC 2019", "Uneekor", "Garmin R10", "FlightScope", "Other"].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </SelectInput>
        </div>
        <TextField label="Course played" value={s.course_name || ""} onChange={(v) => set({ course_name: v })} placeholder="e.g. Pebble Beach" />
        <NumInput  label="Score"          value={s.strokes}           onChange={(v) => set({ strokes: v ?? undefined })} />
        <NumInput  label="Fairways hit"   value={s.fairways_hit}      onChange={(v) => set({ fairways_hit: v ?? undefined })} />
        <NumInput  label="Greens in reg"  value={s.greens_in_reg}     onChange={(v) => set({ greens_in_reg: v ?? undefined })} />
      </div>

      <div>
        <FieldLabel>Strokes gained (optional)</FieldLabel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <NumInput label="SG: Total" value={s.strokes_gained_total} onChange={(v) => set({ strokes_gained_total: v ?? undefined })} step="0.01" />
          <NumInput label="SG: OTT"   value={s.strokes_gained_ott}   onChange={(v) => set({ strokes_gained_ott: v ?? undefined })}   step="0.01" />
          <NumInput label="SG: APP"   value={s.strokes_gained_app}   onChange={(v) => set({ strokes_gained_app: v ?? undefined })}   step="0.01" />
          <NumInput label="SG: ATG"   value={s.strokes_gained_atg}   onChange={(v) => set({ strokes_gained_atg: v ?? undefined })}   step="0.01" />
          <NumInput label="SG: Putt"  value={s.strokes_gained_putt}  onChange={(v) => set({ strokes_gained_putt: v ?? undefined })}  step="0.01" />
        </div>
      </div>

      <ClubAveragesEditor clubAverages={clubAverages} setClubAverages={setClubAverages} showsAdvanced />
    </div>
  );
}

/* -------- Shared: club-average editor (used by Range + Simulator) -------- */
function ClubAveragesEditor({
  clubAverages, setClubAverages, showsAdvanced,
}: { clubAverages: ClubAverage[]; setClubAverages: (v: ClubAverage[]) => void; showsAdvanced: boolean }) {
  const update = (i: number, patch: Partial<ClubAverage>) =>
    setClubAverages(clubAverages.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  const addRow = () => setClubAverages([...clubAverages, { club: "" }]);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <FieldLabel>Club averages</FieldLabel>
        <Button type="button" variant="secondary" onClick={addRow} data-testid="add-club-average">
          <Plus className="h-4 w-4" /> Add club
        </Button>
      </div>
      <div className="space-y-2">
        {clubAverages.map((c, i) => (
          <div key={i} className={`grid gap-2 rounded-xl border border-line bg-white/70 p-3 ${showsAdvanced ? "sm:grid-cols-6" : "sm:grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr_auto]"}`}>
            <div>
              <FieldLabel>Club</FieldLabel>
              <input
                list="clubs-datalist"
                value={c.club}
                onChange={(e) => update(i, { club: e.target.value })}
                data-testid={`club-name-${i}`}
                placeholder="7 iron"
                className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-pulse"
              />
            </div>
            <NumInput label="Carry (yd)" value={c.avg_carry_yards}   onChange={(v) => update(i, { avg_carry_yards: v ?? undefined })} compact />
            <NumInput label="Total (yd)" value={c.avg_total_yards}   onChange={(v) => update(i, { avg_total_yards: v ?? undefined })} compact />
            <NumInput label="Dispersion" value={c.dispersion_yards}  onChange={(v) => update(i, { dispersion_yards: v ?? undefined })} compact />
            {showsAdvanced && <NumInput label="Ball speed"  value={c.ball_speed_mph}  onChange={(v) => update(i, { ball_speed_mph: v ?? undefined })} compact />}
            {showsAdvanced && <NumInput label="Launch"      value={c.launch_angle_deg} onChange={(v) => update(i, { launch_angle_deg: v ?? undefined })} compact />}
            <NumInput label="Shots"      value={c.shots}             onChange={(v) => update(i, { shots: v ?? undefined })} compact />
            <RemoveBtn onClick={() => setClubAverages(clubAverages.filter((_, idx) => idx !== i))} />
          </div>
        ))}
        {clubAverages.length === 0 && <p className="text-sm text-muted">Add a row per club - just fill the fields you have.</p>}
      </div>
      <datalist id="clubs-datalist">
        {commonClubs.map((c) => <option key={c} value={c} />)}
      </datalist>
    </div>
  );
}

/* -------- Small inputs -------- */
function NumInput({ label, value, onChange, compact = false, step }: { label: string; value: number | null | undefined; onChange: (v: number | null) => void; compact?: boolean; step?: string }) {
  return (
    <div>
      {!compact && <FieldLabel>{label}</FieldLabel>}
      {compact && <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>}
      <TextInput
        type="number"
        step={step}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </div>
  );
}
function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <TextInput value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-9 w-9 items-center justify-center self-end rounded-lg border border-line text-muted hover:border-danger hover:text-danger" aria-label="Remove row">
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
