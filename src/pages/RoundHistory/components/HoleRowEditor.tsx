import { FieldLabel, TextInput } from "@/components/ui";
import type { FairwayResult, TeeShotLocation } from "@/lib/types";

export interface HoleForm {
  id?: string;
  hole_number: number;
  par: string;
  score: string;
  fairway_result: FairwayResult;
  tee_shot_location: "" | TeeShotLocation;
  gir: boolean;
  putts: string;
  penalty_shots: string;
  chip_shots: string;
  greenside_bunker_shots: string;
  recovery_shot_type: "" | "chip" | "sand";
}

interface HoleRowEditorProps {
  selectedHole: HoleForm;
  selectedHoleIndex: number;
  updateHole: <K extends keyof HoleForm>(index: number, key: K, value: HoleForm[K]) => void;
}

const fairwayOptions: FairwayResult[] = ["na", "hit", "left", "right", "miss"];
const teeLocationOptions: Array<"" | TeeShotLocation> = ["", "rough", "fairway_bunker", "woods", "water", "out_of_bounds", "other_fairway", "other"];

export default function HoleRowEditor({
  selectedHole,
  selectedHoleIndex,
  updateHole,
}: HoleRowEditorProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
      <SelectField label="Par" value={selectedHole.par} onChange={(value) => updateHole(selectedHoleIndex, "par", value)} options={["3", "4", "5"]} />
      <Field label="Score" type="number" value={selectedHole.score} onChange={(value) => updateHole(selectedHoleIndex, "score", value)} />
      <SelectField
        label="Fairway"
        value={selectedHole.fairway_result}
        disabled={selectedHole.par === "3"}
        onChange={(value) => updateHole(selectedHoleIndex, "fairway_result", value as FairwayResult)}
        options={fairwayOptions}
      />
      {selectedHole.par !== "3" && selectedHole.fairway_result !== "hit" && selectedHole.fairway_result !== "na" && (
        <SelectField
          label="Where did it finish?"
          value={selectedHole.tee_shot_location}
          onChange={(value) => updateHole(selectedHoleIndex, "tee_shot_location", value as "" | TeeShotLocation)}
          options={teeLocationOptions}
        />
      )}
      <label className="flex items-center gap-3 rounded-lg border border-line bg-steel/5 px-4 py-3">
        <input type="checkbox" checked={selectedHole.gir} onChange={(event) => updateHole(selectedHoleIndex, "gir", event.target.checked)} />
        <span className="font-medium text-dark">GIR</span>
      </label>
      <Field label="Putts" type="number" value={selectedHole.putts} onChange={(value) => updateHole(selectedHoleIndex, "putts", value)} />
      <Field label="Penalties" type="number" value={selectedHole.penalty_shots} onChange={(value) => updateHole(selectedHoleIndex, "penalty_shots", value)} />
      <Field label="Chips" type="number" value={selectedHole.chip_shots} onChange={(value) => updateHole(selectedHoleIndex, "chip_shots", value)} />
      <Field label="Bunkers" type="number" value={selectedHole.greenside_bunker_shots} onChange={(value) => updateHole(selectedHoleIndex, "greenside_bunker_shots", value)} />
      <SelectField
        label="Recovery counted as"
        value={selectedHole.recovery_shot_type}
        onChange={(value) => updateHole(selectedHoleIndex, "recovery_shot_type", value as "" | "chip" | "sand")}
        options={["", "chip", "sand"]}
      />
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <TextInput type={type} min={type === "number" ? 0 : undefined} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm capitalize text-ink outline-none transition focus:border-pulse/50 focus:ring-4 focus:ring-pulse/10 disabled:bg-steel/5 disabled:text-muted"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {formatCell(option || "none")}
          </option>
        ))}
      </select>
    </div>
  );
}

function formatCell(value: string) {
  if (value === "na") return "N/A";
  if (value === "none") return "None";
  return value.replaceAll("_", " ");
}
