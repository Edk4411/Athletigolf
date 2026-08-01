import { ExternalLink, ShieldCheck } from "lucide-react";
import { useRoute } from "wouter";
import BodyDiagram from "@/components/BodyDiagram";
import { PageHeader, StatusPill, Surface } from "@/components/ui";
import { exerciseNameFromSlug, getExerciseGuideFromList } from "@/lib/exerciseLibrary";
import { useExerciseLibrary } from "@/hooks/useExerciseLibrary";

export default function ExerciseDetail() {
  const [, params] = useRoute("/exercises/:slug");
  const { exercises, bySlug } = useExerciseLibrary();
  const slug = params?.slug || "";
  const match = bySlug.get(slug);
  const guide = getExerciseGuideFromList(match?.name || exerciseNameFromSlug(slug), exercises);
  const videoUrl = guide.videoUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(guide.videoSearch)}`;

  // Prefer the richer equipmentOptions list, fall back to the single string.
  const equipmentList: string[] =
    (guide as { equipmentOptions?: string[] }).equipmentOptions?.length
      ? ((guide as { equipmentOptions: string[] }).equipmentOptions)
      : [guide.equipment].filter(Boolean);

  const tips = guide.formCues?.length ? guide.formCues : [];
  const mistakes = guide.commonMistakes?.length ? guide.commonMistakes : [];

  return (
    <main className="min-h-screen bg-cream px-4 py-5 md:px-8 md:py-7">
      <PageHeader
        eyebrow="Exercise Library"
        title={guide.name}
        description={guide.golfCarryover}
        tone="text-lab"
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Surface>
            <div className="flex flex-wrap gap-2">
              <StatusPill tone="gym">{guide.primaryMuscle}</StatusPill>
              {equipmentList.map((eq) => (
                <StatusPill key={eq}>{eq}</StatusPill>
              ))}
              <StatusPill>{guide.movement}</StatusPill>
              {guide.difficulty && <StatusPill tone="gold">{guide.difficulty}</StatusPill>}
              {guide.golfRelevant && <StatusPill tone="golf">Golf relevant</StatusPill>}
            </div>
            <p className="mt-5 text-base leading-relaxed text-muted">
              {guide.instructions || "Use controlled reps, keep positions clean, and stop if form breaks down."}
            </p>
          </Surface>

          <Surface data-testid="muscle-diagram">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Muscles worked</p>
              <p className="text-xs text-muted">Primary highlighted red - secondary amber</p>
            </div>
            <BodyDiagram primaryMuscle={guide.primaryMuscle} secondaryMuscles={guide.secondaryMuscles} />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Primary</p>
                <p className="mt-1 text-sm font-semibold text-dark">{guide.primaryMuscle || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Secondary</p>
                <p className="mt-1 text-sm font-semibold text-dark">
                  {guide.secondaryMuscles?.length ? guide.secondaryMuscles.join(", ") : "-"}
                </p>
              </div>
            </div>
          </Surface>

          <div className="grid gap-5 md:grid-cols-2">
            <GuidePanel title="Technique" items={guide.technique?.length ? guide.technique : ["Maintain neutral spine", "Controlled movement"]} />
            <GuidePanel title="Useful tips" items={tips.length ? tips : ["Use a controlled tempo.", "Brace before every rep."]} />
            <GuidePanel title="Common mistakes" items={mistakes.length ? mistakes : ["Going too heavy too soon.", "Rushing reps."]} />
            <GuidePanel title="Progressions" items={guide.progressions?.length ? guide.progressions : ["Increase weight", "Increase reps"]} />
            <GuidePanel title="Regressions" items={guide.regressions?.length ? guide.regressions : ["Decrease weight", "Use machines for stability"]} />
          </div>
        </div>

        <Surface className="h-fit bg-dark text-white">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 text-pulse">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold">Safety notes</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            {guide.safetyTips || guide.safetyNotes || "Warm up properly, choose a load you can control, and stop if pain changes the movement."}
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
        {items.map((item, i) => (
          <li key={`${item}-${i}`} className="text-sm leading-relaxed text-ink">
            {item}
          </li>
        ))}
      </ul>
    </Surface>
  );
}
