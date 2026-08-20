import React from "react";
import { ArrowRight, Flag } from "lucide-react";
import GolfCoursePicker from "../../../../components/GolfCoursePicker";
import { Button, Card } from "../../../../components/ui";
import { Field, SelectField } from "./Shared";
import { GolfCourseDetail, GolfCourseTee } from "@/lib/types";

export function CourseStep({
  holesPlayed, nineSelection, selectedCourse, selectedTee,
  course, teeColour, date, roundName, visibility, competition, notes,
  setHolesPlayed, setNineSelection, setCourse, setTeeColour, setDate,
  setRoundName, setVisibility, setCompetition, setNotes,
  handleCourseSelected, handleTeeSelected, setShowManualCourseModal,
  onNext,
}: any) {
  return (
    <Card className="p-6 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-golf/10 text-golf">
          <Flag className="h-5 w-5" />
        </span>
        <h2 className="text-xl font-semibold">Course & Tees</h2>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <button
          onClick={() => { setHolesPlayed(9); setNineSelection("front"); }}
          className={`rounded-xl border p-5 text-left transition ${
            holesPlayed === 9 && nineSelection === "front"
              ? "border-golf bg-golf text-white"
              : "border-line bg-steel/5 text-dark hover:border-golf/30"
          }`}
        >
          <p className="text-sm opacity-70">Round length</p>
          <h2 className="mt-1 text-2xl font-semibold">Front 9</h2>
          <p className="mt-1 text-xs opacity-70">Holes 1–9</p>
        </button>
        <button
          onClick={() => { setHolesPlayed(9); setNineSelection("back"); }}
          className={`rounded-xl border p-5 text-left transition ${
            holesPlayed === 9 && nineSelection === "back"
              ? "border-golf bg-golf text-white"
              : "border-line bg-steel/5 text-dark hover:border-golf/30"
          }`}
        >
          <p className="text-sm opacity-70">Round length</p>
          <h2 className="mt-1 text-2xl font-semibold">Back 9</h2>
          <p className="mt-1 text-xs opacity-70">Holes 10–18</p>
        </button>
        <button
          onClick={() => { setHolesPlayed(18); setNineSelection("all"); }}
          className={`rounded-xl border p-5 text-left transition ${
            holesPlayed === 18
              ? "border-golf bg-golf text-white"
              : "border-line bg-steel/5 text-dark hover:border-golf/30"
          }`}
        >
          <p className="text-sm opacity-70">Round length</p>
          <h2 className="mt-1 text-2xl font-semibold">18 Holes</h2>
          <p className="mt-1 text-xs opacity-70">Full round</p>
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <GolfCoursePicker
            selectedCourse={selectedCourse}
            selectedTee={selectedTee}
            onCourseSelected={handleCourseSelected}
            onTeeSelected={handleTeeSelected}
          />
          <div className="mt-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">
              Can't find the course, or the API is down? Enter par, stroke index and yardage by hand.
            </p>
            <button
              type="button"
              onClick={() => setShowManualCourseModal(true)}
              className="rounded-full border border-golf/40 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-golf transition hover:bg-golf/5"
            >
              Enter course manually
            </button>
          </div>
        </div>
        <Field label="Course name" value={course} onChange={(v: string) => { setCourse(v); }} />
        <Field label="Tees played" value={teeColour} onChange={setTeeColour} placeholder="White, Yellow, Red…" />
        {selectedTee && (
          <>
            <Field label="Course rating" value={selectedTee.courseRating?.toString() || ""} onChange={() => {}} disabled />
            <Field label="Slope rating" value={selectedTee.slopeRating?.toString() || ""} onChange={() => {}} disabled />
          </>
        )}
        <Field label="Round name" value={roundName} onChange={setRoundName} placeholder="Saturday medal, evening 9…" />
        <Field label="Date" value={date} onChange={setDate} type="date" />
        <SelectField label="Visibility" value={visibility} onChange={(v: string) => setVisibility(v as "private" | "friends")} options={["friends", "private"]} />
        <label className="flex items-center gap-3 rounded-lg border border-line px-5 py-4">
          <input type="checkbox" checked={competition} onChange={(e) => setCompetition(e.target.checked)} />
          <span className="font-medium">Competition round</span>
        </label>
      </div>

      <div className="mt-4 md:col-span-2">
        <label className="mb-2 block text-sm text-muted">Round notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-line px-4 py-3 outline-none focus:border-golf" />
      </div>

      <div className="mt-8 flex justify-end">
        <Button variant="golf" onClick={onNext}>
          Next: Players
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
