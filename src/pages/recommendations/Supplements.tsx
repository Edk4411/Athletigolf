import { ExternalLink, Zap, Dumbbell } from "lucide-react";
import { PageHeader, StatusPill, Surface } from "@/components/ui";

type Pick = {
  category: string;
  name: string;
  purpose: string;
  who: string;
  pros: string[];
  cons: string[];
  recommendedUse: string;
  warnings?: string;
  buyLink: string;
};

const supplements: Pick[] = [
  {
    category: "Whey Protein",
    name: "Optimum Nutrition Gold Standard 100% Whey",
    purpose: "Provides high-quality, fast-digesting protein to support muscle repair.",
    who: "Great all-round baseline for most golfers hitting the gym.",
    pros: ["High protein content", "Low fat/carbs", "Third-party tested", "Mixes easily"],
    cons: ["Contains dairy/lactose", "Can be expensive without bulk"],
    recommendedUse: "1 scoop post-workout or to hit daily protein targets.",
    buyLink: "https://www.google.com/search?q=Optimum+Nutrition+Gold+Standard+Whey",
  },
  {
    category: "Creatine",
    name: "Thorne Creatine (Creapure)",
    purpose: "Increases strength, power, and muscle mass.",
    who: "The one supplement almost every gym-going golfer should take.",
    pros: ["Highly pure (Creapure)", "NSF Certified for Sport", "Well-researched"],
    cons: ["Slightly more expensive than generic monohydrate"],
    recommendedUse: "5g daily, mixed into water or protein shake.",
    buyLink: "https://www.google.com/search?q=Thorne+Creatine",
  },
  {
    category: "Pre-workout",
    name: "Transparent Labs Stim-Free Pre-Workout",
    purpose: "Improves pump and endurance without caffeine jitters.",
    who: "For late-day training or sensitive lifters.",
    pros: ["Caffeine-free", "Transparent labeling", "Great pumps"],
    cons: ["No energy boost from caffeine", "Higher cost"],
    recommendedUse: "1 scoop 20-30 mins before training.",
    warnings: "Contains beta-alanine which may cause tingling sensations.",
    buyLink: "https://www.google.com/search?q=Transparent+Labs+Stim-Free+Pre-Workout",
  },
  {
    category: "Hydration",
    name: "Liquid I.V. Hydration Multiplier",
    purpose: "Rapid hydration through optimized electrolyte ratios.",
    who: "Golfers playing in the heat or training intensely.",
    pros: ["Fast hydration", "Easy to carry in bag", "Great taste"],
    cons: ["Contains added sugar/calories"],
    recommendedUse: "1 stick mixed into 500ml water as needed.",
    buyLink: "https://www.google.com/search?q=Liquid+I.V.+Hydration+Multiplier",
  },
  {
    category: "Recovery",
    name: "Legion Recharge Post-Workout",
    purpose: "Enhances recovery and reduces soreness after heavy training.",
    who: "Athletes looking for a comprehensive post-workout blend.",
    pros: ["Scientifically backed ingredients", "No artificial sweeteners"],
    cons: ["Only available in a few flavours"],
    recommendedUse: "1 scoop mixed into water post-workout.",
    buyLink: "https://www.google.com/search?q=Legion+Recharge+Post-Workout",
  },
];

export default function Supplements() {
  return (
    <main className="min-h-screen bg-cream px-4 py-5 md:px-8 md:py-7">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          eyebrow="Recommendations"
          title="Supplement Picks"
          description="Baseline essentials for training and recovery."
          tone="text-pulse"
        />
        
        <div className="grid gap-6">
          {supplements.map((item) => (
            <Surface key={`${item.category}-${item.name}`} className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <StatusPill tone="pulse">{item.category}</StatusPill>
                  <h3 className="mt-2 text-xl font-semibold text-dark">{item.name}</h3>
                </div>
                <Dumbbell className="h-6 w-6 text-muted" />
              </div>
              <p className="text-sm text-muted"><span className="font-semibold text-dark">Purpose:</span> {item.purpose}</p>
              <p className="text-sm text-muted"><span className="font-semibold text-dark">Best for:</span> {item.who}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Pros</h4>
                  <ul className="mt-1 list-disc pl-4 text-sm text-dark">
                    {item.pros.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Cons</h4>
                  <ul className="mt-1 list-disc pl-4 text-sm text-dark">
                    {item.cons.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              </div>
              <p className="text-sm text-muted"><span className="font-semibold text-dark">Recommended Use:</span> {item.recommendedUse}</p>
              {item.warnings && <p className="text-sm text-danger"><span className="font-semibold">Note:</span> {item.warnings}</p>}
              <a
                href={item.buyLink}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-pulse hover:underline"
              >
                Find it online <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Surface>
          ))}
        </div>
      </div>
    </main>
  );
}
