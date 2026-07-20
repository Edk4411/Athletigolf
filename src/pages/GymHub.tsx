import type { ComponentType } from "react";
import { useLocation } from "wouter";
import {
  Archive,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  HeartPulse,
  Library,
  Play,
  Sparkles,
} from "lucide-react";
import { Button, Card, StatusPill } from "@/components/ui";

type GymHubItem = {
  label: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
};

const gymItems: GymHubItem[] = [
  {
    label: "Training Board",
    description: "Plan your split, edit days and keep exercises tidy.",
    href: "/workouts",
    icon: Dumbbell,
    tone: "bg-sky-400/15 text-sky-100 border-sky-200/20",
  },
  {
    label: "Logbook",
    description: "Previous sessions, notes and training history.",
    href: "/gym/history",
    icon: CalendarDays,
    tone: "bg-blue-400/15 text-blue-100 border-blue-200/20",
  },
  {
    label: "Archived Splits",
    description: "Old boards you may want to bring back later.",
    href: "/workouts/archive",
    icon: Archive,
    tone: "bg-indigo-400/15 text-indigo-100 border-indigo-200/20",
  },
  {
    label: "Exercise Library",
    description: "Search movements and open full exercise guide pages.",
    href: "/exercises",
    icon: Library,
    tone: "bg-cyan-400/15 text-cyan-100 border-cyan-200/20",
  },
];

export default function GymHub() {
  const [, navigate] = useLocation();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pb-6 sm:px-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(135deg,rgba(8,24,56,0.96),rgba(16,82,115,0.88))] p-5 text-white shadow-[0_24px_70px_rgba(2,14,28,0.28)]">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-200/25 bg-sky-300/15">
            <Dumbbell className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusPill tone="pulse">Training</StatusPill>
              <StatusPill tone="gym">Library backed</StatusPill>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Plan sessions and train today</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
              Keep the app path simple: start a workout, open your split, then review the work you have already banked.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button type="button" variant="pulse" className="min-h-14 justify-between rounded-2xl" onClick={() => navigate("/workouts/submit")}>
            <span className="inline-flex items-center gap-2">
              <Play className="h-5 w-5" />
              Start Workout
            </span>
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button type="button" variant="secondary" className="min-h-14 justify-between rounded-2xl border-white/15 bg-white/10 text-white hover:bg-white/14 hover:text-white" onClick={() => navigate("/workouts")}>
            <span className="inline-flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Training Board
            </span>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {gymItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.href)}
              className="group rounded-[1.5rem] border border-line bg-panel p-4 text-left shadow-[0_16px_40px_rgba(11,17,23,0.07)] transition active:scale-[0.99] dark:border-sky-200/12 dark:bg-[#0b2033] dark:hover:bg-[#0f2b43]"
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

      <Card className="border-lab/20 bg-lab/7 dark:border-sky-200/12 dark:bg-[#0b2033]">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted dark:text-white/45">This week</p>
            <p className="mt-2 text-2xl font-semibold text-dark dark:text-white">Train clean</p>
          </div>
          <div className="rounded-2xl bg-white/65 p-4 dark:bg-[#102b42]">
            <HeartPulse className="h-5 w-5 text-pulse" />
            <p className="mt-2 text-sm font-semibold text-dark dark:text-white">Start with today's lift</p>
          </div>
          <div className="rounded-2xl bg-white/65 p-4 dark:bg-[#102b42]">
            <BarChart3 className="h-5 w-5 text-lab dark:text-sky-200" />
            <p className="mt-2 text-sm font-semibold text-dark dark:text-white">Review progress after</p>
          </div>
        </div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-semibold text-muted dark:bg-sky-300/10 dark:text-sky-50/70">
          <Sparkles className="h-3.5 w-3.5" />
          App-first gym flow
        </div>
      </Card>
    </div>
  );
}
