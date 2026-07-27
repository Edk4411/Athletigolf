/**
 * WHS handicap calculation library.
 *
 * Course Handicap  = Handicap Index × (Slope Rating / 113) + (Course Rating - Par)
 * Playing Handicap = Course Handicap × (Allowance % / 100)
 */

export type GameFormat =
  | "stroke_play"
  | "medal"
  | "stableford"
  | "match_play"
  | "skins"
  | "four_ball_stroke"
  | "four_ball_match"
  | "foursomes";

/** Default WHS allowance percentages by game format. */
export const DEFAULT_ALLOWANCES: Record<GameFormat, number> = {
  stroke_play: 95,
  medal: 95,
  stableford: 100,
  match_play: 100,
  skins: 95,
  four_ball_stroke: 85,
  four_ball_match: 85,
  foursomes: 50,
};

/** Return the default allowance % for the primary (first) selected format. */
export function getDefaultAllowancePercent(formats: GameFormat[]): number {
  const primary = formats[0] ?? "stroke_play";
  return DEFAULT_ALLOWANCES[primary] ?? 95;
}

/**
 * WHS Course Handicap.
 * Returns an integer (round to nearest whole number).
 */
export function computeCourseHandicap(
  handicapIndex: number,
  slopeRating: number,
  courseRating: number,
  par: number
): number {
  return Math.round(handicapIndex * (slopeRating / 113) + (courseRating - par));
}

/**
 * WHS Playing Handicap.
 * Returns an integer.
 */
export function computePlayingHandicap(
  courseHandicap: number,
  allowancePercent: number
): number {
  return Math.round(courseHandicap * (allowancePercent / 100));
}

/**
 * Number of strokes a player receives on a specific hole.
 *
 * Uses the WHS distribution rule:
 *   base = Math.floor(playingHandicap / 18)
 *   remainder = Math.floor(playingHandicap % 18)  ← Math.floor, not Math.round
 *   strokes = base + (strokeIndex <= remainder ? 1 : 0)
 *
 * For 9-hole rounds only half the handicap distributes.
 */
export function getStrokesReceived(
  playingHandicap: number,
  holeStrokeIndex: number | null,
  holesPlayed: 9 | 18
): number {
  if (!playingHandicap || playingHandicap <= 0) return 0;
  const si = holeStrokeIndex || 18;
  const base = Math.floor(playingHandicap / 18);
  const remainder = Math.floor(playingHandicap % 18); // ← was Math.round (bug)
  const adj = holesPlayed === 9 ? 0.5 : 1;
  return Math.floor(base * adj) + (si <= remainder ? 1 : 0);
}

/** Standard Stableford points. Returns 0 for pick-up. */
export function stablefordPoints(
  score: number,
  par: number,
  strokesReceived: number
): number {
  const toPar = score - strokesReceived - par;
  if (toPar <= -3) return 5;
  if (toPar === -2) return 4;
  if (toPar === -1) return 3;
  if (toPar === 0) return 2;
  if (toPar === 1) return 1;
  return 0;
}

/**
 * Parse a handicap string to a finite non-negative number.
 * Returns 0 for empty or invalid input.
 */
export function parseHandicapIndex(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}
