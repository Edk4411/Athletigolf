import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useLocation } from "wouter";
import { StravaGolfQueue } from "@/components/StravaGolfQueue";
import UnfinishedRoundBanner from "@/components/UnfinishedRoundBanner";
import { Button, Card, StatusPill } from "@/components/ui";
import { isCompleteScoringRound } from "@/lib/golfStats";
import { supabase } from "@/lib/supabase";
import type { Round } from "@/lib/types";
import {
  Activity,
  ChevronRight,
  ClipboardList,
  Flag,
  NotebookPen,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

type GolfHubItem = {
  label: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
};

const golfItems: GolfHubItem[] = [
  {
    label: "Round History",
    description: "Scorecards, drafts, trends and your last few rounds.",
    href: "/golf",
    icon: ClipboardList,
    tone: "bg-emerald-400/15 text-emerald-100 border-emerald-200/20",
  },
  {
    label: "Log Practice",
    description:
      "Range, short game, putting, on-course or simulator - AthletiAI picks the right stats.",
    href: "/practice/new",
    icon: Activity,
    tone: "bg-orange-400/15 text-orange-100 border-orange-200/20",
  },
  {
    label: "Gear Recommendations",
    description: "Balls, clubs and gear picks curated by handicap.",
    href: "/recommendations",
    icon: Sparkles,
    tone: "bg-amber-400/15 text-amber-100 border-amber-200/20",
  },
  {
    label: "Competitions",
    description: "Upcoming events, prep notes and target scores.",
    href: "/golf/competitions",
    icon: Trophy,
    tone: "bg-gold/18 text-gold border-gold/25",
  },
  {
    label: "Practice",
    description: "Log sim, range, short-game and on-course practice.",
    href: "/golf/practice",
    icon: NotebookPen,
    tone: "bg-cyan-400/15 text-cyan-100 border-cyan-200/20",
  },
];

export default function GolfHub() {
  const [, navigate] = useLocation();

  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRounds() {
      setLoading(true);

      const { data } = await supabase
        .from("rounds")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12);

      if (!cancelled) {
        setRounds((data as Round[]) || []);
        setLoading(false);
      }
    }

    loadRounds();

    return () => {
      cancelled = true;
    };
  }, []);

  const unfinishedRounds = useMemo(
    () =>
      rounds
        .filter((round) => !isCompleteScoringRound(round))
        .slice(0, 3),
    [rounds]
  );

  const recentCourses = useMemo(() => {
    const seen = new Set<string>();

    return rounds
      .map((round) => round.course || round.round_name || "")
      .filter(Boolean)
      .filter((course) => {
        const key = course.toLowerCase();

        if (seen.has(key)) return false;

        seen.add(key);
        return true;
      })
      .slice(0, 4);
  }, [rounds]);

  return (
    <>
      <UnfinishedRoundBanner />
      <StravaGolfQueue />

      <section className="overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(135deg,rgba(6,36,55,0.96),rgba(7,77,58,0.9))] p-5 text-white shadow-[0_24px_70px_rgba(2,14,28,0.28)]">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200/25 bg-emerald-300/15">
            <Flag className="h-7 w-7" />
          </span>

          <div className="flex-1">
            <div className="mb-3 flex gap-2">
              <StatusPill tone="pulse">Live golf</StatusPill>
              <StatusPill tone="golf">Course ready</StatusPill>
            </div>

            <h1 className="text-3xl font-semibold">
              Start, follow and finish rounds
            </h1>

            <p className="mt-3 text-sm text-white/70">
              Built for scoring as you play: partners, games and post-round
              insights all sit on the same foundation.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="pulse"
            className="min-h-14 justify-between rounded-2xl"
            onClick={() => navigate("/golf/submit")}
          >
            Start Round
            <ChevronRight />
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="min-h-14 justify-between rounded-2xl"
            onClick={() => navigate("/golf")}
          >
            Open History
            <ChevronRight />
          </Button>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">
            Live and unfinished rounds
          </h2>

          <div className="mt-4 space-y-2">
            {loading ? (
              <p className="text-sm text-muted">Loading...</p>
            ) : unfinishedRounds.length ? (
              unfinishedRounds.map((round) => (
                <button
                  key={round.id}
                  type="button"
                  onClick={() =>
                    navigate(`/golf/submit?resume=${round.id}`)
                  }
                  className="flex w-full justify-between rounded-2xl border p-3 text-left"
                >
                  <span>
                    {round.round_name ||
                      round.course ||
                      "Unfinished round"}
                  </span>

                  <ChevronRight />
                </button>
              ))
            ) : (
              <p className="text-sm text-muted">
                No open rounds right now.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">
            Recent course memory
          </h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {recentCourses.length ? (
              recentCourses.map((course) => (
                <span
                  key={course}
                  className="rounded-full bg-steel/8 px-3 py-1.5 text-sm"
                >
                  {course}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted">
                Courses appear after saved rounds
              </span>
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {golfItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.href)}
              className="rounded-[1.5rem] border bg-panel p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border ${item.tone}`}
                >
                  <Icon className="h-5 w-5" />
                </span>

                <div>
                  <h2 className="font-semibold">
                    {item.label}
                  </h2>

                  <p className="text-sm text-muted">
                    {item.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      <Card>
        <div className="flex gap-3">
          <Users />

          <div>
            <h2 className="text-lg font-semibold">
              Friends-only round following
            </h2>

            <p className="mt-2 text-sm text-muted">
              Live rounds can support friends, partners and shared scoring.
            </p>
          </div>
        </div>
      </Card>
    </>
  );
}

function getRoundStatusLabel(round: Round) {
  if (round.live_status === "live") return "Live";
  if (round.live_status === "paused") return "Paused";
  if (round.status === "draft") return "Draft";
  if (round.status === "unfinished") return "Unfinished";

  return "Open";
}