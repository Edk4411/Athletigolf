import { useState } from "react";
import { Dumbbell, ExternalLink, Flag, Zap } from "lucide-react";
import { PageHeader, StatusPill, Surface } from "@/components/ui";

type Tab = "supplements" | "golf";

type Pick = {
  category: string;
  name: string;
  who: string;
  why: string;
  buyLink: string;
};

const supplements: Pick[] = [
  {
    category: "Whey Protein",
    name: "Optimum Nutrition Gold Standard 100% Whey",
    who: "Great all-round baseline for most golfers hitting the gym.",
    why: "24g protein, low fat/carbs, mixes well, third-party tested.",
    buyLink: "https://www.google.com/search?q=Optimum+Nutrition+Gold+Standard+Whey",
  },
  {
    category: "Whey Protein",
    name: "Transparent Labs Grass-Fed Whey Isolate",
    who: "For lifters who want a cleaner label and no artificial sweeteners.",
    why: "28g protein per scoop, no fillers, easy on the stomach.",
    buyLink: "https://www.google.com/search?q=Transparent+Labs+Grass-Fed+Whey+Isolate",
  },
  {
    category: "Vegan Protein",
    name: "Vega Sport Premium Protein",
    who: "Dairy-free option that still hits 30g protein.",
    why: "Pea + pumpkin + sunflower + alfalfa blend, NSF Certified for Sport.",
    buyLink: "https://www.google.com/search?q=Vega+Sport+Premium+Protein",
  },
  {
    category: "Pre-Workout (High Stim)",
    name: "Ryse Loaded Pre",
    who: "For hard training days when you want a big kick.",
    why: "3.2g beta-alanine, 6g citrulline, 300mg caffeine, tastes great.",
    buyLink: "https://www.google.com/search?q=Ryse+Loaded+Pre-Workout",
  },
  {
    category: "Pre-Workout (Moderate)",
    name: "Legion Pulse",
    who: "Balanced option that won't wreck your sleep on afternoon lifts.",
    why: "Naturally sweetened, effective doses, ~200mg caffeine per scoop.",
    buyLink: "https://www.google.com/search?q=Legion+Pulse+pre-workout",
  },
  {
    category: "Pre-Workout (Stim-Free)",
    name: "Transparent Labs Stim-Free",
    who: "For late-day sessions or if you already had coffee.",
    why: "Pump + performance ingredients without caffeine.",
    buyLink: "https://www.google.com/search?q=Transparent+Labs+Stim-Free",
  },
  {
    category: "Creatine",
    name: "Thorne Creatine (Creapure)",
    who: "The one supplement almost every gym-going golfer should take.",
    why: "5g Creapure monohydrate, NSF Certified for Sport, easy to mix.",
    buyLink: "https://www.google.com/search?q=Thorne+Creatine",
  },
];

const golfGear: Pick[] = [
  {
    category: "Tour-Level Ball",
    name: "Titleist Pro V1 / Pro V1x",
    who: "Low-to-mid handicap players who want tour spin and feel.",
    why: "The industry benchmark for full-swing spin and short-game control.",
    buyLink: "https://www.google.com/search?q=Titleist+Pro+V1",
  },
  {
    category: "Tour-Level Ball",
    name: "TaylorMade TP5 / TP5x",
    who: "Fast swing speed players wanting five-layer construction.",
    why: "Great combination of speed, spin, and greenside feel.",
    buyLink: "https://www.google.com/search?q=TaylorMade+TP5",
  },
  {
    category: "Value Ball",
    name: "Srixon Q-Star Tour",
    who: "Mid-handicappers who want tour-like feel at a lower price.",
    why: "Urethane cover, softer feel, plays well below 100 mph.",
    buyLink: "https://www.google.com/search?q=Srixon+Q-Star+Tour",
  },
  {
    category: "Distance Ball",
    name: "Callaway Supersoft",
    who: "Higher handicaps or slower swing speeds chasing distance.",
    why: "Very soft feel, low compression, straighter ball flight.",
    buyLink: "https://www.google.com/search?q=Callaway+Supersoft",
  },
  {
    category: "Driver",
    name: "TaylorMade Qi10 Max",
    who: "Mid-to-high handicaps who want forgiveness on off-center strikes.",
    why: "Massive MOI, forgiving face, easy launch.",
    buyLink: "https://www.google.com/search?q=TaylorMade+Qi10+Max+driver",
  },
  {
    category: "Driver",
    name: "Ping G430 LST",
    who: "Faster swing speeds wanting a low-spin, workable driver.",
    why: "Low-spin head, tight dispersion, tour-caliber feel.",
    buyLink: "https://www.google.com/search?q=Ping+G430+LST+driver",
  },
  {
    category: "Irons (Game Improvement)",
    name: "Ping G430 Irons",
    who: "Mid-to-high handicaps needing forgiveness with distance.",
    why: "High launch, generous face, forgiving on mishits.",
    buyLink: "https://www.google.com/search?q=Ping+G430+irons",
  },
  {
    category: "Irons (Players)",
    name: "Mizuno JPX 925 Tour",
    who: "Low handicaps who prioritise feel and shot-shaping.",
    why: "Grain Flow Forged HD feel with modern forgiveness.",
    buyLink: "https://www.google.com/search?q=Mizuno+JPX+925+Tour",
  },
  {
    category: "Wedges",
    name: "Titleist Vokey SM10",
    who: "Any handicap that wants tour-standard wedge control.",
    why: "The most trusted wedge on tour - grinds for every turf condition.",
    buyLink: "https://www.google.com/search?q=Titleist+Vokey+SM10",
  },
  {
    category: "Putter",
    name: "Odyssey Ai-One Milled",
    who: "Any player looking for a modern, consistent-rolling mallet or blade.",
    why: "AI-designed insert delivers steadier ball speed on off-center hits.",
    buyLink: "https://www.google.com/search?q=Odyssey+Ai-One+Milled",
  },
];

export default function Recommendations() {
  const [tab, setTab] = useState<Tab>("supplements");
  const list = tab === "supplements" ? supplements : golfGear;

  return (
    <main className="min-h-screen bg-cream px-4 py-5 md:px-8 md:py-7">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          eyebrow="Gear & Fuel"
          title="What AthletiGolf recommends"
          description="Honest picks the team stands behind. Tap any item to see options - we don't take affiliate money."
          tone="text-pulse"
        />

        <div className="mb-6 inline-flex rounded-full border border-line bg-panel p-1" data-testid="recommendations-tabs">
          <button
            type="button"
            data-testid="tab-supplements"
            onClick={() => setTab("supplements")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === "supplements" ? "bg-pulse text-white shadow" : "text-muted hover:text-dark"
            }`}
          >
            <Zap className="h-4 w-4" /> Supplements
          </button>
          <button
            type="button"
            data-testid="tab-golf"
            onClick={() => setTab("golf")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === "golf" ? "bg-golf text-white shadow" : "text-muted hover:text-dark"
            }`}
          >
            <Flag className="h-4 w-4" /> Golf Gear
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {list.map((item) => (
            <Surface key={`${item.category}-${item.name}`} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <StatusPill tone={tab === "supplements" ? "pulse" : "golf"}>{item.category}</StatusPill>
                  <h3 className="mt-2 text-lg font-semibold text-dark">{item.name}</h3>
                </div>
                {tab === "supplements" ? (
                  <Dumbbell className="h-5 w-5 text-muted" />
                ) : (
                  <Flag className="h-5 w-5 text-muted" />
                )}
              </div>
              <p className="text-sm text-muted"><span className="font-semibold text-dark">Best for:</span> {item.who}</p>
              <p className="text-sm text-muted"><span className="font-semibold text-dark">Why:</span> {item.why}</p>
              <a
                href={item.buyLink}
                target="_blank"
                rel="noreferrer"
                data-testid={`buy-link-${item.name}`}
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
