import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, MapPin, Search } from "lucide-react";
import { Button, FieldLabel } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { GolfCourseDetail, GolfCourseSearchResult, GolfCourseTee } from "@/lib/types";

type Props = {
  selectedCourse: GolfCourseDetail | null;
  selectedTee: GolfCourseTee | null;
  onCourseSelected: (course: GolfCourseDetail, tee: GolfCourseTee | null) => void;
  onTeeSelected: (tee: GolfCourseTee | null) => void;
};

export default function GolfCoursePicker({
  selectedCourse,
  selectedTee,
  onCourseSelected,
  onTeeSelected,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GolfCourseSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingCourseId, setLoadingCourseId] = useState<number | null>(null);
  const [warning, setWarning] = useState("");

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setWarning("");
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      setWarning("");
      const { data, error } = await supabase.functions.invoke("golf-course-search", {
        body: { action: "search", query: trimmed },
      });
      if (cancelled) return;
      setSearching(false);
      if (error) {
        setWarning(error.message || "Course search failed.");
        setResults([]);
        return;
      }
      setWarning(data?.warning || "");
      setResults((data?.results || []) as GolfCourseSearchResult[]);
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query]);

  const teeOptions = useMemo(() => selectedCourse?.tees || [], [selectedCourse]);

  const chooseCourse = async (course: GolfCourseSearchResult) => {
    setLoadingCourseId(course.id);
    setWarning("");
    const { data, error } = await supabase.functions.invoke("golf-course-search", {
      body: { action: "detail", courseId: course.id },
    });
    setLoadingCourseId(null);

    if (error || !data?.course) {
      setWarning(error?.message || "Could not load that course scorecard.");
      return;
    }

    const detail = data.course as GolfCourseDetail;
    const firstTee = detail.tees[0] || null;
    onCourseSelected(detail, firstTee);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="rounded-2xl border border-golf/20 bg-golf/5 p-4 md:col-span-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <FieldLabel>Find course scorecard</FieldLabel>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by course or club..."
              className="w-full rounded-2xl border border-line bg-white py-3 pl-11 pr-4 text-sm text-ink outline-none transition focus:border-golf/70 focus:ring-4 focus:ring-golf/10"
            />
            {searching && <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-golf" />}
          </div>

          {warning && <p className="mt-3 text-sm font-medium text-gold">{warning}</p>}

          {results.length > 0 && (
            <div className="mt-3 max-h-72 overflow-y-auto rounded-2xl border border-line bg-white shadow-xl">
              {results.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => chooseCourse(course)}
                  disabled={loadingCourseId !== null}
                  className="flex w-full items-center justify-between gap-4 border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-golf/5 disabled:opacity-60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {course.courseName}
                    </span>
                    <span className="mt-1 flex items-center gap-1 truncate text-xs text-muted">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {course.clubName}
                      {course.location ? ` - ${course.location}` : ""}
                    </span>
                  </span>
                  {loadingCourseId === course.id ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-golf" />
                  ) : (
                    <span className="shrink-0 rounded-full bg-golf/10 px-3 py-1 text-xs font-bold text-golf">
                      Select
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-white p-4 lg:w-80">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-golf">Selected</p>
          {selectedCourse ? (
            <>
              <div className="mt-3 flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-golf" />
                <div>
                  <p className="font-semibold text-ink">{selectedCourse.courseName}</p>
                  <p className="text-sm text-muted">{selectedCourse.clubName}</p>
                </div>
              </div>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-medium text-muted">Tee set</span>
                <select
                  value={selectedTee?.id || ""}
                  onChange={(event) => {
                    const tee = teeOptions.find((item) => item.id === event.target.value) || null;
                    onTeeSelected(tee);
                  }}
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-golf"
                >
                  {teeOptions.map((tee) => (
                    <option key={tee.id} value={tee.id}>
                      {tee.teeName} {tee.slopeRating ? `- Slope ${tee.slopeRating}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              {selectedTee && (
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <MiniStat label="Par" value={selectedTee.parTotal || "-"} />
                  <MiniStat label="Yards" value={selectedTee.totalYards || "-"} />
                  <MiniStat label="Rating" value={selectedTee.courseRating || "-"} />
                </div>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Optional. Search here to auto-fill tees, par, yardage and stroke index. Manual course entry still works.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-steel/7 px-2 py-2">
      <p className="font-semibold text-ink">{value}</p>
      <p className="mt-1 text-muted">{label}</p>
    </div>
  );
}
