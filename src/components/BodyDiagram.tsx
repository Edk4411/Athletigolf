// Inline SVG muscle diagram - front + back silhouettes with highlighted regions
// driven by an ExerciseLibraryItem's primary + secondary muscles.

type MuscleKey =
  | "chest" | "shoulders" | "biceps" | "triceps" | "forearms" | "abs" | "obliques"
  | "quads" | "adductors" | "calves" | "shins"
  | "traps" | "upperBack" | "lats" | "lowerBack" | "glutes" | "hamstrings";

const KEYWORDS: Record<MuscleKey, RegExp> = {
  chest: /chest|pec|push/i,
  shoulders: /shoulder|delt/i,
  biceps: /bicep/i,
  triceps: /tricep/i,
  forearms: /forearm|grip|wrist/i,
  abs: /abs|core|rectus/i,
  obliques: /oblique|rotation/i,
  quads: /quad|legs? front|thigh front/i,
  adductors: /adductor|inner thigh/i,
  calves: /calf|calves|calv/i,
  shins: /shin|tibialis/i,
  traps: /trap/i,
  upperBack: /upper back|rhomboid|scapula/i,
  lats: /lat\b|lats|back \/ pull|posterior chain|back/i,
  lowerBack: /lower back|erector/i,
  glutes: /glute|hip/i,
  hamstrings: /hamstring|posterior chain|legs? back|thigh back/i,
};

function detectMuscles(inputs: string[]): Set<MuscleKey> {
  const found = new Set<MuscleKey>();
  const merged = inputs.filter(Boolean).join(" ");
  (Object.keys(KEYWORDS) as MuscleKey[]).forEach((key) => {
    if (KEYWORDS[key].test(merged)) found.add(key);
  });
  // "Legs" without any other qualifier -> highlight quads + hamstrings + glutes
  if (/legs?\b/i.test(merged) && !/(front|back|calf|hamstring|quad|glute)/i.test(merged)) {
    found.add("quads");
    found.add("hamstrings");
    found.add("glutes");
  }
  return found;
}

function fillFor(key: MuscleKey, primary: Set<MuscleKey>, secondary: Set<MuscleKey>) {
  if (primary.has(key)) return "#ef4444"; // red-500
  if (secondary.has(key)) return "#f59e0b"; // amber-500
  return "#e2e8f0"; // slate-200
}

function opacityFor(key: MuscleKey, primary: Set<MuscleKey>, secondary: Set<MuscleKey>) {
  if (primary.has(key)) return 0.92;
  if (secondary.has(key)) return 0.7;
  return 0.55;
}

type Props = {
  primaryMuscle?: string;
  secondaryMuscles?: string[];
  className?: string;
};

export default function BodyDiagram({ primaryMuscle, secondaryMuscles = [], className = "" }: Props) {
  const primary = detectMuscles(primaryMuscle ? [primaryMuscle] : []);
  const secondary = detectMuscles(secondaryMuscles);
  // Don't double-highlight
  secondary.forEach((k) => primary.has(k) && secondary.delete(k));

  const M = (key: MuscleKey) => ({
    fill: fillFor(key, primary, secondary),
    opacity: opacityFor(key, primary, secondary),
    stroke: "#0f172a",
    strokeWidth: 0.6,
    strokeOpacity: 0.35,
  });

  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`}>
      {/* FRONT VIEW */}
      <figure className="rounded-2xl border border-line bg-white/70 p-3">
        <svg viewBox="0 0 120 240" className="mx-auto h-56 w-auto">
          {/* Head */}
          <ellipse cx="60" cy="18" rx="12" ry="14" fill="#f1f5f9" stroke="#0f172a" strokeOpacity="0.35" strokeWidth="0.6" />
          {/* Neck */}
          <rect x="55" y="30" width="10" height="8" fill="#f1f5f9" stroke="#0f172a" strokeOpacity="0.35" strokeWidth="0.6" />
          {/* Torso silhouette (light) */}
          <path d="M38 40 L82 40 L88 70 L88 110 L78 140 L42 140 L32 110 L32 70 Z" fill="#f8fafc" stroke="#0f172a" strokeOpacity="0.3" strokeWidth="0.6" />
          {/* Chest */}
          <path d="M42 42 L58 42 L58 62 Q50 66 42 62 Z" {...M("chest")} />
          <path d="M62 42 L78 42 L78 62 Q70 66 62 62 Z" {...M("chest")} />
          {/* Shoulders */}
          <ellipse cx="34" cy="46" rx="8" ry="7" {...M("shoulders")} />
          <ellipse cx="86" cy="46" rx="8" ry="7" {...M("shoulders")} />
          {/* Biceps */}
          <path d="M26 55 L32 55 L34 82 L28 82 Z" {...M("biceps")} />
          <path d="M88 55 L94 55 L92 82 L86 82 Z" {...M("biceps")} />
          {/* Forearms */}
          <path d="M26 84 L32 84 L34 112 L28 112 Z" {...M("forearms")} />
          <path d="M88 84 L94 84 L92 112 L86 112 Z" {...M("forearms")} />
          {/* Abs */}
          <rect x="52" y="68" width="16" height="46" rx="3" {...M("abs")} />
          {/* Obliques */}
          <path d="M42 68 L52 68 L52 114 L44 108 Z" {...M("obliques")} />
          <path d="M78 68 L68 68 L68 114 L76 108 Z" {...M("obliques")} />
          {/* Hips/waist join */}
          <path d="M42 140 L78 140 L82 152 L38 152 Z" fill="#f8fafc" stroke="#0f172a" strokeOpacity="0.3" strokeWidth="0.6" />
          {/* Quads */}
          <path d="M40 152 L58 152 L56 200 L42 200 Z" {...M("quads")} />
          <path d="M62 152 L80 152 L78 200 L64 200 Z" {...M("quads")} />
          {/* Shins */}
          <path d="M42 202 L56 202 L54 230 L44 230 Z" {...M("shins")} />
          <path d="M64 202 L78 202 L76 230 L66 230 Z" {...M("shins")} />
        </svg>
        <figcaption className="mt-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted">Front</figcaption>
      </figure>

      {/* BACK VIEW */}
      <figure className="rounded-2xl border border-line bg-white/70 p-3">
        <svg viewBox="0 0 120 240" className="mx-auto h-56 w-auto">
          <ellipse cx="60" cy="18" rx="12" ry="14" fill="#f1f5f9" stroke="#0f172a" strokeOpacity="0.35" strokeWidth="0.6" />
          <rect x="55" y="30" width="10" height="8" fill="#f1f5f9" stroke="#0f172a" strokeOpacity="0.35" strokeWidth="0.6" />
          <path d="M38 40 L82 40 L88 70 L88 110 L78 140 L42 140 L32 110 L32 70 Z" fill="#f8fafc" stroke="#0f172a" strokeOpacity="0.3" strokeWidth="0.6" />
          {/* Traps */}
          <path d="M46 40 L74 40 L68 54 L52 54 Z" {...M("traps")} />
          {/* Shoulders (rear) */}
          <ellipse cx="34" cy="46" rx="8" ry="7" {...M("shoulders")} />
          <ellipse cx="86" cy="46" rx="8" ry="7" {...M("shoulders")} />
          {/* Upper back */}
          <path d="M44 54 L76 54 L74 74 L46 74 Z" {...M("upperBack")} />
          {/* Lats */}
          <path d="M42 74 L58 74 L56 108 L38 100 Z" {...M("lats")} />
          <path d="M78 74 L62 74 L64 108 L82 100 Z" {...M("lats")} />
          {/* Triceps */}
          <path d="M26 55 L32 55 L34 82 L28 82 Z" {...M("triceps")} />
          <path d="M88 55 L94 55 L92 82 L86 82 Z" {...M("triceps")} />
          {/* Forearms */}
          <path d="M26 84 L32 84 L34 112 L28 112 Z" {...M("forearms")} />
          <path d="M88 84 L94 84 L92 112 L86 112 Z" {...M("forearms")} />
          {/* Lower back */}
          <rect x="52" y="108" width="16" height="26" rx="3" {...M("lowerBack")} />
          <path d="M42 140 L78 140 L82 152 L38 152 Z" fill="#f8fafc" stroke="#0f172a" strokeOpacity="0.3" strokeWidth="0.6" />
          {/* Glutes */}
          <path d="M40 148 L58 148 L58 170 L40 170 Z" {...M("glutes")} />
          <path d="M62 148 L80 148 L80 170 L62 170 Z" {...M("glutes")} />
          {/* Hamstrings */}
          <path d="M40 172 L58 172 L56 200 L42 200 Z" {...M("hamstrings")} />
          <path d="M62 172 L80 172 L78 200 L64 200 Z" {...M("hamstrings")} />
          {/* Calves */}
          <path d="M42 202 L56 202 L54 230 L44 230 Z" {...M("calves")} />
          <path d="M64 202 L78 202 L76 230 L66 230 Z" {...M("calves")} />
        </svg>
        <figcaption className="mt-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted">Back</figcaption>
      </figure>

      <div className="col-span-2 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#ef4444" }} /> Primary</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#f59e0b" }} /> Secondary</span>
      </div>
    </div>
  );
}
