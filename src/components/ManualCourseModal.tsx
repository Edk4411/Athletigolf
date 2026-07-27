import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui";
import type { GolfCourseDetail, GolfCourseHole, GolfCourseTee } from "@/lib/types";

type ManualHole = {
  par: string;
  handicap: string; // stroke index 1-18
  yardage: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (course: GolfCourseDetail, tee: GolfCourseTee) => void;
  holesTotal: 9 | 18;
  initialName?: string;
};

function seed(count: number, defaults?: Partial<ManualHole>[]): ManualHole[] {
  return Array.from({ length: count }, (_, i) => ({
    par: defaults?.[i]?.par ?? "4",
    handicap: defaults?.[i]?.handicap ?? String(i + 1),
    yardage: defaults?.[i]?.yardage ?? "",
  }));
}

export default function ManualCourseModal({
  open,
  onClose,
  onSaved,
  holesTotal,
  initialName,
}: Props) {
  const [name, setName] = useState(initialName || "");
  const [teeLabel, setTeeLabel] = useState("White");
  const [courseRating, setCourseRating] = useState("");
  const [slopeRating, setSlopeRating] = useState("");
  const [holes, setHoles] = useState<ManualHole[]>(() => seed(holesTotal));
  const [error, setError] = useState("");

  const parTotal = useMemo(
    () => holes.reduce((sum, h) => sum + Number(h.par || 0), 0),
    [holes]
  );
  const yardTotal = useMemo(
    () => holes.reduce((sum, h) => sum + Number(h.yardage || 0), 0),
    [holes]
  );

  if (!open) return null;

  const updateHole = (i: number, patch: Partial<ManualHole>) => {
    setHoles((prev) => prev.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  };

  const save = () => {
    if (!name.trim()) {
      setError("Give the course a name.");
      return;
    }
    const strokeIndices = holes.map((h) => Number(h.handicap));
    const unique = new Set(strokeIndices);
    if (unique.size !== holes.length || strokeIndices.some((i) => !i || i < 1 || i > holesTotal)) {
      setError(`Stroke indexes must be unique numbers from 1 to ${holesTotal}.`);
      return;
    }
    const pars = holes.map((h) => Number(h.par));
    if (pars.some((p) => ![3, 4, 5, 6].includes(p))) {
      setError("Par must be 3, 4, 5 or 6 for every hole.");
      return;
    }

    const holeRows: GolfCourseHole[] = holes.map((h, i) => ({
      holeNumber: i + 1,
      par: Number(h.par) || 4,
      yardage: h.yardage.trim() === "" ? null : Number(h.yardage),
      meters: null,
      handicap: Number(h.handicap) || i + 1,
    }));

    const tee: GolfCourseTee = {
      id: `manual-${Date.now()}`,
      teeName: teeLabel.trim() || "Manual",
      gender: "unknown",
      courseRating: courseRating.trim() === "" ? null : Number(courseRating),
      slopeRating: slopeRating.trim() === "" ? null : Number(slopeRating),
      bogeyRating: null,
      totalYards: yardTotal || null,
      totalMeters: null,
      numberOfHoles: holesTotal,
      parTotal: parTotal || null,
      holes: holeRows,
    };

    const course: GolfCourseDetail = {
      id: -Date.now(),
      cachedCourseId: null,
      clubName: name.trim(),
      courseName: name.trim(),
      location: null,
      city: null,
      state: null,
      country: null,
      tees: [tee],
    };

    onSaved(course, tee);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close"
        onClick={onClose}
        data-testid="manual-course-backdrop"
      />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        data-testid="manual-course-modal"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-golf">Manual course</p>
            <h2 className="mt-1 text-xl font-semibold text-dark">Enter scorecard by hand</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:bg-steel/10"
            aria-label="Close"
            data-testid="manual-course-close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 border-b border-line bg-steel/5 px-6 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <LabeledInput
            label="Course name"
            value={name}
            onChange={setName}
            placeholder="Local muni…"
            testId="manual-course-name"
          />
          <LabeledInput label="Tee label" value={teeLabel} onChange={setTeeLabel} placeholder="White" testId="manual-course-tee" />
          <LabeledInput
            label="Course rating"
            value={courseRating}
            onChange={setCourseRating}
            type="number"
            placeholder="72.1"
            testId="manual-course-cr"
          />
          <LabeledInput
            label="Slope rating"
            value={slopeRating}
            onChange={setSlopeRating}
            type="number"
            placeholder="128"
            testId="manual-course-slope"
          />
        </div>

        <div className="overflow-y-auto px-6 py-4">
          <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            <span>Hole by hole</span>
            <span data-testid="manual-course-totals">
              Par {parTotal} · {yardTotal || "—"} yd
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-steel/10 text-muted">
                <tr>
                  <th className="p-3 font-semibold">Hole</th>
                  <th className="p-3 font-semibold">Par</th>
                  <th className="p-3 font-semibold">Stroke index</th>
                  <th className="p-3 font-semibold">Yardage</th>
                </tr>
              </thead>
              <tbody>
                {holes.map((hole, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="p-3 font-semibold text-dark">{i + 1}</td>
                    <td className="p-3">
                      <select
                        value={hole.par}
                        onChange={(e) => updateHole(i, { par: e.target.value })}
                        className="w-24 rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-golf"
                        data-testid={`manual-course-par-${i + 1}`}
                      >
                        {[3, 4, 5, 6].map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min={1}
                        max={holesTotal}
                        value={hole.handicap}
                        onChange={(e) => updateHole(i, { handicap: e.target.value })}
                        className="w-24 rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-golf"
                        data-testid={`manual-course-si-${i + 1}`}
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min={0}
                        value={hole.yardage}
                        onChange={(e) => updateHole(i, { yardage: e.target.value })}
                        placeholder="—"
                        className="w-28 rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-golf"
                        data-testid={`manual-course-yd-${i + 1}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <div className="border-t border-danger/25 bg-danger/10 px-6 py-3 text-sm font-semibold text-danger" data-testid="manual-course-error">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-line bg-white px-6 py-4">
          <p className="text-xs text-muted">
            Everything you enter stays local until you finish the round.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} data-testid="manual-course-cancel">
              Cancel
            </Button>
            <Button variant="golf" onClick={save} data-testid="manual-course-save">
              <Check className="h-4 w-4" />
              Use this course
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({
  label, value, onChange, placeholder, type = "text", testId,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; testId?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-golf"
        data-testid={testId}
      />
    </label>
  );
}
