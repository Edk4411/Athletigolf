import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useLocation } from "wouter";
import { StravaGolfQueue } from "@/components/StravaGolfQueue";
import {
  Activity,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Flag,
  History,
  MessageCircle,
  NotebookPen,
  Shield,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { Button, Card, StatusPill } from "@/components/ui";
import { isCompleteScoringRound } from "@/lib/golfStats";
import { supabase } from "@/lib/supabase";
import type { Round, RoundGame, RoundHole, RoundPlayer } from "@/lib/types";

const GAME_LABEL: Record<string, string> = {
  stroke_play: "Stroke play",
  medal: "Medal",
  stableford: "Stableford",
  match_play: "Match play",
  skins: "Skins",
  four_ball_stroke: "4BBB Stroke",
  four_ball_match: "4BBB Match",
  foursomes: "Foursomes",
  scramble: "Scramble",
  greensomes: "Greensomes",
  nassau: "Nassau",
  custom: "Custom",
};

type UnfinishedSummary = {
  round: Round;
  holesScored: number;
  currentHole: number | null;
  totalStrokes: number | null;
  scoreToPar: number | null;
  gameLabel: string;
  playerScores: Array<{ name: string; strokes: number | null; holes: number }>;
};

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
    description: "Range, short game, putting, on-course or sim - AthletiAI picks the right stats.",
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
  {
    label: "Practice History",
    description: "Review sim, range, short-game and on-course sessions.",
    href: "/golf/practice-history",
    icon: History,
    tone: "bg-teal-400/15 text-teal-100 border-teal-200/20",
  },
  {
    label: "Practice Plan",
    description: "Turn weaknesses into your next focused session.",
    href: "/golf/practice-plan",
    icon: CalendarDays,
    tone: "bg-blue-400/15 text-blue-100 border-blue-200/20",
  },
];

export default function GolfHub() {
  const [, navigate] = useLocation();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<Record<string, UnfinishedSummary>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadRounds() {
      setLoading(true);
      const { data } = await supabase.from("rounds").select("*").order("created_at", { ascending: false }).limit(12);
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
    () => rounds.filter((round) => !isCompleteScoringRound(round)).slice(0, 3),
    [rounds]
  );

  // ── Enrich each unfinished round with its live scoring context ──
  useEffect(() => {
    if (!unfinishedRounds.length) return;
    let cancelled = false;

    async function enrich() {
      const ids = unfinishedRounds.map((r) => r.id);
      const [
        { data: holeRows },
        { data: players },
        { data: playerHoles },
        { data: games },
      ] = await Promise.all([
        supabase.from("round_holes").select("*").in("round_id", ids),
        supabase.from("round_players").select("*").in("round_id", ids),
        supabase.from("round_player_holes").select("*").in("round_id", ids),
        supabase.from("round_games").select("*").in("round_id", ids),
      ]);
      if (cancelled) return;

      const next: Record<string, UnfinishedSummary> = {};
      unfinishedRounds.forEach((round) => {
        const rHoles = ((holeRows as RoundHole[]) || []).filter((h) => h.round_id === round.id);
        const rPlayers = ((players as RoundPlayer[]) || []).filter((p) => p.round_id === round.id);
        const rPlayerHoles = ((playerHoles as import("@/lib/types").RoundPlayerHole[]) || [])
          .filter((ph) => ph.round_id === round.id);
        const rGames = ((games as RoundGame[]) || []).filter((g) => g.round_id === round.id);

        const scored = rHoles.filter((h) => h.score != null);
        const totalStrokes = scored.reduce((sum, h) => sum + (h.score ?? 0), 0);
        const totalPar = scored.reduce((sum, h) => sum + (h.par ?? 4), 0);
        const currentHole = rHoles.length ? Math.max(...rHoles.map((h) => h.hole_number)) : null;

        const playerScores = rPlayers.map((player) => {
          const phs = rPlayerHoles.filter((ph) => ph.round_player_id === player.id && ph.gross_score != null);
          return {
            name: player.display_name,
            strokes: phs.length ? phs.reduce((s, ph) => s + (ph.gross_score ?? 0), 0) : null,
            holes: phs.length,
          };
        });

        next[round.id] = {
          round,
          holesScored: scored.length,
          currentHole,
          totalStrokes: scored.length ? totalStrokes : null,
          scoreToPar: scored.length ? totalStrokes - totalPar : null,
          gameLabel: rGames.length ? GAME_LABEL[rGames[0].game_type] || rGames[0].game_type : "Stroke play",
          playerScores,
        };
      });
      setSummaries(next);
    }

    enrich();
    return () => {
      cancelled = true;
    };
  }, [unfinishedRounds]);
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pb-6 sm:px-6">
      <StravaGolfQueue />
      <section className="overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(135deg,rgba(6,36,55,0.96),rgba(7,77,58,0.9))] p-5 text-white shadow-[0_24px_70px_rgba(2,14,28,0.28)]">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-200/25 bg-emerald-300/15">
            <Flag className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusPill tone="pulse">Live golf</StatusPill>
              <StatusPill tone="golf">Course ready</StatusPill>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Start, follow and finish rounds</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
              Built for scoring as you play: partners, game formats, comments and post-round stats can now sit on the same round foundation.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button type="button" variant="pulse" className="min-h-14 justify-between rounded-2xl" onClick={() => navigate("/golf/submit")}>
            <span className="inline-flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Start Round
            </span>
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button type="button" variant="secondary" className="min-h-14 justify-between rounded-2xl border-white/15 bg-white/10 text-white hover:bg-white/14 hover:text-white" onClick={() => navigate("/golf")}>
            <span className="inline-flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Open History
            </span>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-golf/20 bg-golf/7 dark:border-emerald-200/12 dark:bg-[#0b2a24]">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-golf/12 text-golf dark:bg-emerald-300/12 dark:text-emerald-100">
              <Activity className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-dark dark:text-white">Live and unfinished rounds</h2>
                <StatusPill tone="golf">{loading ? "Loading" : `${unfinishedRounds.length} open`}</StatusPill>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted dark:text-white/60">
                Pick up rounds that are live, paused or missing holes before they count fully in your golf record.
              </p>

              <div className="mt-4 space-y-2">
                {unfinishedRounds.length ? (
                  unfinishedRounds.map((round) => {
                    const summary = summaries[round.id];
                    return (
                      <button
                        key={round.id}
                        type="button"
                        onClick={() => navigate(`/golf/submit?resume=${round.id}`)}
                        className="flex w-full flex-col gap-3 rounded-2xl border border-line bg-white/70 px-4 py-3 text-left transition active:scale-[0.99] dark:border-emerald-200/12 dark:bg-[#0f342c] dark:hover:bg-[#123d33]"
                        data-testid={`unfinished-round-${round.id}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-dark dark:text-white">
                                {round.round_name || round.course || "Unfinished round"}
                              </p>
                              <StatusPill tone="pulse">{getRoundStatusLabel(round)}</StatusPill>
                            </div>
                            <p className="mt-0.5 text-xs text-muted dark:text-white/60">
                              {round.course || "No course set"} · {summary?.gameLabel || "Stroke play"} ·{" "}
                              {round.date || formatDate(round.created_at)}
                            </p>
                          </div>
                          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted dark:text-white/42" />
                        </div>

                        {summary && (
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="rounded-xl bg-steel/5 px-2 py-2 dark:bg-white/5">
                              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted dark:text-white/50">Hole</p>
                              <p className="mt-0.5 text-sm font-semibold text-dark dark:text-white">
                                {summary.currentHole ? `${summary.currentHole}/${round.target_holes || 18}` : "–"}
                              </p>
                            </div>
                            <div className="rounded-xl bg-steel/5 px-2 py-2 dark:bg-white/5">
                              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted dark:text-white/50">You</p>
                              <p className="mt-0.5 text-sm font-semibold text-dark dark:text-white">
                                {summary.totalStrokes ?? "–"}
                                {summary.scoreToPar !== null && (
                                  <span className="ml-1 text-xs text-muted dark:text-white/60">
                                    ({summary.scoreToPar === 0 ? "E" : summary.scoreToPar > 0 ? `+${summary.scoreToPar}` : summary.scoreToPar})
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="rounded-xl bg-steel/5 px-2 py-2 dark:bg-white/5">
                              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted dark:text-white/50">Scored</p>
                              <p className="mt-0.5 text-sm font-semibold text-dark dark:text-white">
                                {summary.holesScored}
                              </p>
                            </div>
                          </div>
                        )}

                        {summary && summary.playerScores.length > 1 && (
                          <div className="flex flex-wrap gap-1.5">
                            {summary.playerScores.slice(0, 4).map((ps, i) => (
                              <span
                                key={`${round.id}-${i}`}
                                className="rounded-full bg-golf/10 px-2 py-0.5 text-[11px] font-semibold text-golf dark:bg-emerald-300/12 dark:text-emerald-100"
                              >
                                {ps.name.split(" ")[0]}: {ps.strokes ?? "–"}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-line bg-white/45 px-3 py-4 text-sm text-muted dark:border-emerald-200/12 dark:bg-[#0b1f2b] dark:text-emerald-50/65">
                    No open rounds right now. Start a round when you get to the first tee.
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold/12 text-gold">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-dark dark:text-white">Recent course memory</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted dark:text-white/60">
                Your recent courses sit here so the app can become faster at round setup.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {recentCourses.length ? (
                  recentCourses.map((course) => (
                    <span key={course} className="rounded-full bg-steel/8 px-3 py-1.5 text-xs font-semibold text-dark dark:bg-emerald-300/10 dark:text-emerald-50/75">
                      {course}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-steel/8 px-3 py-1.5 text-xs font-semibold text-muted dark:bg-emerald-300/10 dark:text-emerald-50/60">
                    Courses will appear after your first saved round
                  </span>
                )}
              </div>
            </div>
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
              className="group rounded-[1.5rem] border border-line bg-panel p-4 text-left shadow-[0_16px_40px_rgba(11,17,23,0.07)] transition active:scale-[0.99] dark:border-emerald-200/12 dark:bg-[#0b2a24] dark:hover:bg-[#0d332b]"
            >
              <div className="flex items-center gap-3">
                <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${item.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-dark dark:text-white">{item.label}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted dark:text-white/58">{item.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted transition group-active:translate-x-0.5 dark:text-white/40" />
              </div>
            </button>
          );
        })}
      </section>

      <Card className="border-golf/20 bg-golf/7 dark:border-emerald-200/12 dark:bg-[#0b2a24]">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-golf/12 text-golf dark:bg-emerald-300/12 dark:text-emerald-100">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-dark dark:text-white">Friends-only round following</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted dark:text-white/60">
              Live rounds can now use the scoring foundation for partners, games, comments, reactions and media. Keep this private or friends-only until team/coach mode is ready.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-muted dark:text-white/52">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1 dark:bg-emerald-300/10 dark:text-emerald-50/75">
                <Shield className="h-3.5 w-3.5" />
                Friends or private
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1 dark:bg-emerald-300/10 dark:text-emerald-50/75">
                <MessageCircle className="h-3.5 w-3.5" />
                Comments ready
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function getRoundStatusLabel(round: Round) {
  if (round.live_status === "live") return "Live";
  if (round.live_status === "paused") return "Paused";
  if (round.status === "draft") return "Draft";
  if (round.status === "unfinished") return "Unfinished";
  return "Open";
}

function formatDate(value?: string | null) {
  if (!value) return "No date";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
