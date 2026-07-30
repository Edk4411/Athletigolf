import { ExternalLink, Flag } from "lucide-react";
import { PageHeader, StatusPill, Surface } from "@/components/ui";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { OnboardingData } from "@/lib/types";

type Pick = {
  category: string;
  name: string;
  who: string;
  why: string;
  buyLink: string;
  handicapRange: [number, number];
  playingStyle?: string;
  minSwingSpeed?: number;
};

const golfGear: Pick[] = [
  {
    category: "Ball",
    name: "Titleist Pro V1",
    who: "Low handicaps wanting tour-level control.",
    why: "Industry benchmark for spin and feel.",
    buyLink: "https://www.google.com/search?q=Titleist+Pro+V1",
    handicapRange: [0, 10],
  },
  {
    category: "Ball",
    name: "Callaway Supersoft",
    who: "Higher handicaps needing distance and forgiveness.",
    why: "Soft feel, low compression.",
    buyLink: "https://www.google.com/search?q=Callaway+Supersoft",
    handicapRange: [11, 54],
  },
  {
    category: "Driver",
    name: "Ping G430 LST",
    who: "Faster swingers wanting workability.",
    why: "Low spin, tight dispersion.",
    buyLink: "https://www.google.com/search?q=Ping+G430+LST+driver",
    handicapRange: [0, 10],
    minSwingSpeed: 100,
  },
  {
    category: "Driver",
    name: "TaylorMade Qi10 Max",
    who: "Players needing max forgiveness.",
    why: "High MOI for stability.",
    buyLink: "https://www.google.com/search?q=TaylorMade+Qi10+Max+driver",
    handicapRange: [11, 54],
  },
  {
    category: "Irons",
    name: "Mizuno JPX 925 Tour",
    who: "Players valuing feel and precision.",
    why: "Forged feel, shot shaping.",
    buyLink: "https://www.google.com/search?q=Mizuno+JPX+925+Tour",
    handicapRange: [0, 10],
    playingStyle: "aggressive",
  },
  {
    category: "Irons",
    name: "Ping G430",
    who: "Game improvement seekers.",
    why: "High launch, forgiving.",
    buyLink: "https://www.google.com/search?q=Ping+G430+irons",
    handicapRange: [11, 54],
    playingStyle: "conservative",
  },
  {
    category: "Wedges",
    name: "Titleist Vokey SM10",
    who: "Players wanting versatile short game tools.",
    why: "Tour-proven grinds.",
    buyLink: "https://www.google.com/search?q=Titleist+Vokey+SM10",
    handicapRange: [0, 54],
  },
  {
    category: "Putter",
    name: "Odyssey Ai-One",
    who: "Players wanting consistent roll.",
    why: "Advanced insert technology.",
    buyLink: "https://www.google.com/search?q=Odyssey+Ai-One+Milled",
    handicapRange: [0, 54],
  },
  {
    category: "Accessory",
    name: "Bushnell Pro X3+",
    who: "Players wanting precise distance data.",
    why: "Slope compensation, clear optics.",
    buyLink: "https://www.google.com/search?q=Bushnell+Pro+X3+",
    handicapRange: [0, 20],
  },
];

export default function GolfGear() {
  const [profile, setProfile] = useState<{ handicap: number | null; swingSpeed: number | null; playingStyle: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.from("profiles").select("golf_handicap, onboarding_data").eq("id", user.id).maybeSingle();
      if (data) {
        const onboarding = data.onboarding_data as OnboardingData | null;
        setProfile({
            handicap: data.golf_handicap,
            swingSpeed: (onboarding?.golf as any)?.swingSpeed || null,
            playingStyle: (onboarding?.golf as any)?.playingStyle || null,
        });
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const filteredGear = profile 
    ? golfGear.filter(gear => {
        // Fallback if no personal data
        if (profile.handicap === null && !profile.playingStyle && !profile.swingSpeed) return true;
        
        // Prioritise handicap
        if (profile.handicap !== null && (profile.handicap < gear.handicapRange[0] || profile.handicap > gear.handicapRange[1])) return false;
        
        // Playing style
        if (profile.playingStyle && gear.playingStyle && profile.playingStyle !== gear.playingStyle) return false;
        
        // Swing speed
        if (profile.swingSpeed && gear.minSwingSpeed && profile.swingSpeed < gear.minSwingSpeed) return false;
        
        return true;
      })
    : golfGear;

  return (
    <main className="min-h-screen bg-cream px-4 py-5 md:px-8 md:py-7">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          eyebrow="Recommendations"
          title="Golf Gear Picks"
          description={loading ? "Loading personal recommendations..." : profile?.handicap !== null ? `Tour-proven gear suited to your ${profile.handicap} handicap.` : "Tour-proven gear for all levels."}
          tone="text-golf"
        />
        
        <div className="grid gap-4 md:grid-cols-2">
          {filteredGear.map((item) => (
            <Surface key={`${item.category}-${item.name}`} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <StatusPill tone="golf">{item.category}</StatusPill>
                  <h3 className="mt-2 text-lg font-semibold text-dark">{item.name}</h3>
                </div>
                <Flag className="h-5 w-5 text-muted" />
              </div>
              <p className="text-sm text-muted"><span className="font-semibold text-dark">Best for:</span> {item.who}</p>
              <p className="text-sm text-muted"><span className="font-semibold text-dark">Why:</span> {item.why}</p>
              <a
                href={item.buyLink}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-golf hover:underline"
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