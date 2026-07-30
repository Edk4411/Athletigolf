import { Dumbbell, Flag } from "lucide-react";
import { useLocation } from "wouter";
import { PageHeader, Surface } from "@/components/ui";

export default function Recommendations() {
  const [, navigate] = useLocation();

  return (
    <main className="min-h-screen bg-cream px-4 py-5 md:px-8 md:py-7">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          eyebrow="Gear & Fuel"
          title="What AthletiGolf recommends"
          description="Honest picks the team stands behind. We don't take affiliate money."
          tone="text-pulse"
        />

        <div className="grid gap-4 md:grid-cols-2">
            <button
              onClick={() => navigate("/recommendations/supplements")}
              className="group flex flex-col gap-3 rounded-2xl border border-line bg-panel p-6 text-left transition hover:border-pulse/50 hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-pulse/10 text-pulse group-hover:bg-pulse group-hover:text-white">
                  <Dumbbell className="h-6 w-6" />
                </span>
                <h3 className="text-xl font-semibold text-dark">Supplements</h3>
              </div>
              <p className="text-muted">Essential fuel picks for training and recovery.</p>
            </button>

            <button
              onClick={() => navigate("/recommendations/golf-gear")}
              className="group flex flex-col gap-3 rounded-2xl border border-line bg-panel p-6 text-left transition hover:border-golf/50 hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-golf/10 text-golf group-hover:bg-golf group-hover:text-white">
                  <Flag className="h-6 w-6" />
                </span>
                <h3 className="text-xl font-semibold text-dark">Golf Gear</h3>
              </div>
              <p className="text-muted">Tour-proven gear suited to your swing.</p>
            </button>
        </div>
      </div>
    </main>
  );
}