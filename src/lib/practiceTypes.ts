// Canonical practice-session shape for the unified tracker.
// Everything is stored on `practice_sessions` - source lets us fan out to
// future integrations (TopTracer, Trackman, Garmin R10, Foresight, etc.).

export type PracticeMode =
  | "on_course"
  | "driving_range"
  | "short_game"
  | "putting"
  | "simulator";

export type PracticeSource =
  | "manual"
  | "toptracer"
  | "trackman"
  | "garmin_r10"
  | "flightscope"
  | "skytrak"
  | "foresight"
  | "uneekor"
  | "arccos"
  | "shotscope"
  | "other";

// Range / launch-monitor per-club summary (what TopTracer and Trackman surface).
export type ClubAverage = {
  club: string;
  shots?: number | null;
  avg_carry_yards?: number | null;
  avg_total_yards?: number | null;
  dispersion_yards?: number | null;
  ball_speed_mph?: number | null;
  club_speed_mph?: number | null;
  smash_factor?: number | null;
  launch_angle_deg?: number | null;
  spin_rpm?: number | null;
  apex_yards?: number | null;
  consistency_pct?: number | null;
};

// Short-game breakdown (distance-bucketed).
export type ShortGameBucket = {
  distance_yards: number;
  attempts: number;
  up_and_downs?: number;   // finished in 2 shots
  avg_proximity_ft?: number;
  success_rate_pct?: number; // any custom pass/fail criterion
};

// Putting breakdown (distance-bucketed).
export type PuttingBucket = {
  distance_ft: number;
  attempts: number;
  made: number;
  avg_start_line_offset_in?: number;
  short_misses?: number;
  long_misses?: number;
  left_misses?: number;
  right_misses?: number;
};

// On-course summary or per-hole detail.
export type OnCourseMetrics = {
  strokes?: number | null;
  putts?: number | null;
  greens_in_reg?: number | null;
  fairways_hit?: number | null;
  fairways_possible?: number | null;
  penalties?: number | null;
  up_and_downs?: number | null;
  sand_saves?: number | null;
};

// Simulator / launch-monitor round.
export type SimulatorMetrics = {
  simulator_brand?: string; // Trackman, Foresight, SkyTrak, TGC, GSPro, etc.
  course_name?: string;
  strokes?: number;
  strokes_gained_total?: number;
  strokes_gained_ott?: number; // off the tee
  strokes_gained_app?: number; // approach
  strokes_gained_atg?: number; // around the green
  strokes_gained_putt?: number;
  greens_in_reg?: number;
  fairways_hit?: number;
};

// TopTracer-style challenge (30-shot / 12-shot).
export type ChallengeResult = {
  total_score?: number | null;
  closest_to_pin_ft?: number | null;
  longest_drive_yards?: number | null;
  targets_hit?: string | null;
  shots_taken?: number | null;
  holes?: number | null;
};

// Umbrella `metrics` jsonb shape - keys are optional so any subset can be stored.
export type PracticeMetrics = {
  on_course?: OnCourseMetrics;
  short_game?: { buckets?: ShortGameBucket[]; avg_up_down_pct?: number; total_shots?: number };
  putting?: { buckets?: PuttingBucket[]; overall_make_pct?: number; total_putts?: number };
  simulator?: SimulatorMetrics;
  challenge_result?: ChallengeResult;
  [key: string]: unknown;
};

export const PRACTICE_MODES: Array<{ value: PracticeMode; label: string; blurb: string; icon: string }> = [
  { value: "on_course",     label: "On Course",                 blurb: "A round or holes played out on the course.",        icon: "Flag" },
  { value: "driving_range", label: "Driving Range",             blurb: "Full-swing session - clubs, carries, dispersion.",  icon: "Target" },
  { value: "short_game",    label: "Short Game / Pitching",     blurb: "Chipping, pitching, bunker - proximity + up-downs.", icon: "Wind" },
  { value: "putting",       label: "Putting Green",             blurb: "Made % by distance, misses, start line.",           icon: "Circle" },
  { value: "simulator",     label: "Simulator / Launch Monitor", blurb: "Trackman, Foresight, SkyTrak, GSPro, TGC, etc.",   icon: "Monitor" },
];

export const PRACTICE_SOURCES: Array<{ value: PracticeSource; label: string }> = [
  { value: "manual",      label: "Manual entry" },
  { value: "toptracer",   label: "TopTracer Range" },
  { value: "trackman",    label: "Trackman" },
  { value: "foresight",   label: "Foresight (GCQuad / GC3)" },
  { value: "skytrak",     label: "SkyTrak" },
  { value: "flightscope", label: "FlightScope" },
  { value: "garmin_r10",  label: "Garmin R10" },
  { value: "uneekor",     label: "Uneekor" },
  { value: "arccos",      label: "Arccos" },
  { value: "shotscope",   label: "Shot Scope" },
  { value: "other",       label: "Other" },
];

export const TOPTRACER_MODES = [
  { value: "warm_up",       label: "Warm-Up" },
  { value: "toptracer_30",  label: "TopTracer 30" },
  { value: "toptracer_12",  label: "TopTracer 12" },
  { value: "my_practice",   label: "My Practice" },
] as const;

export type PracticeSessionRow = {
  id: string;
  user_id: string;
  mode: PracticeMode | null;
  source: PracticeSource | null;
  source_session_id: string | null;
  source_mode: string | null;
  session_date: string | null;
  location: string | null;
  course_name: string | null;
  handicap_at_session: number | null;
  duration_minutes: number | null;
  focus_area: string | null;
  practice_type: string | null;
  type: string | null;
  rating: number | null;
  notes: string | null;
  ai_summary: string | null;
  metrics: PracticeMetrics | null;
  shots: unknown[] | null;
  club_averages: ClubAverage[] | null;
  created_at: string;
  updated_at: string | null;
};

// Legacy label -> new mode (used for reading old rows).
export function legacyTypeToMode(value: string | null | undefined): PracticeMode {
  const v = (value || "").toLowerCase();
  if (v.includes("putt")) return "putting";
  if (v.includes("chip") || v.includes("short game") || v.includes("pitch")) return "short_game";
  if (v.includes("course")) return "on_course";
  if (v.includes("sim") || v.includes("launch") || v.includes("monitor")) return "simulator";
  return "driving_range";
}
