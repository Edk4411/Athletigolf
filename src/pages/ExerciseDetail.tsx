import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { Button, PageHeader, StatusPill, Surface } from "@/components/ui";
import { exerciseNameFromSlug, getExerciseGuideFromList } from "@/lib/exerciseLibrary";
import { useExerciseLibrary } from "@/hooks/useExerciseLibrary";

export default function ExerciseDetail() {
  const [, params] = useRoute("/exercises/:slug");
  const [, navigate] = useLocation();
  const { exercises, bySlug } = useExerciseLibrary();
  const slug = params?.slug || "";
  const match = bySlug.get(slug);
  const guide = getExerciseGuideFromList(match?.name || exerciseNameFromSlug(slug), exercises);
  const videoUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(guide.videoSearch)}`;

  return (
    <main className="min-h-screen bg-cream px-4 py-5 md:px-8 md:py-7">
      <PageHeader
        eyebrow="Exercise Library"
        title={guide.name}
        description={guide.golfCarryover}
        tone="text-lab"
        actions={
          <Button type="button" variant="secondary" onClick={() => navigate("/workouts")}>
            <ArrowLeft className="h-4 w-4" />
            Training Board
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Surface>
            <div className="flex flex-wrap gap-2">
              <StatusPill tone="gym">{guide.primaryMuscle}</StatusPill>
              <StatusPill>{guide.equipment}</StatusPill>
              <StatusPill>{guide.movement}</StatusPill>
              {guide.difficulty && <StatusPill tone="gold">{guide.difficulty}</StatusPill>}
              {guide.golfRelevant && <StatusPill tone="golf">Golf relevant</StatusPill>}
            </div>
            <p className="mt-5 text-base leading-relaxed text-muted">
              {guide.instructions || "Use controlled reps, keep positions clean, and stop if form breaks down."}
            </p>
          </Surface>

          <div className="grid gap-5 md:grid-cols-2">
            <GuidePanel title="Form Cues" items={guide.formCues} />
            <GuidePanel title="Common Mistakes" items={guide.commonMistakes} />
            <GuidePanel title="Muscles" items={[guide.primaryMuscle, ...guide.secondaryMuscles]} />
            <GuidePanel title="Alternatives" items={guide.alternatives.length ? guide.alternatives : ["Use the same movement pattern with equipment you can control."]} />
          </div>
        </div>

        <Surface className="h-fit bg-dark text-white">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 text-pulse">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold">Safety notes</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            {guide.safetyNotes || "Warm up properly, choose a load you can control, and stop if pain changes the movement."}
          </p>
          <a
            href={videoUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-pulse px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pulse/90"
          >
            <ExternalLink className="h-4 w-4" />
            Watch form videos
          </a>
          {!guide.isLibraryMatch && (
            <p className="mt-4 text-sm text-white/55">
              This is a custom exercise, so AthletiGolf is showing a safe fallback guide.
            </p>
          )}
        </Surface>
      </div>
    </main>
  );
}

function GuidePanel({ title, items }: { title: string; items: string[] }) {
  return (
    <Surface>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">{title}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="text-sm leading-relaxed text-ink">
            {item}
          </li>
        ))}
      </ul>
    </Surface>
  );
}
