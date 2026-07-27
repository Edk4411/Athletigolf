// Handicap allowance + playing-handicap helpers.
// Everything that touches a player's playing handicap should go through here so
// the same rules apply whether we're computing, displaying, or storing.

export type GameFormat =
  | "stroke_play" | "medal"
  | "stableford"
  | "match_play"
  | "skins"
  | "four_ball_stroke" | "four_ball_match"
  | "foursomes"
  | "greensomes"
  | "scramble"
  | "nassau"
  | "custom";

// USGA / WHS default allowances (single source of truth).
// Users can override per-round via handicap_allowance_percent.
export const DEFAULT_ALLOWANCE: Record<GameFormat, number> = {
  stroke_play: 95,
  medal: 95,
  stableford: 95,
  match_play: 100,
  skins: 100,
  four_ball_stroke: 85,
  four_ball_match: 90,
  foursomes: 50,        // sum of both players' course handicaps x 50%
  greensomes: 60,       // lower * 0.6 + higher * 0.4
  scramble: 25,         // 4-player scramble default (25/20/15/10)
  nassau: 100,
  custom: 100,
};

export function suggestedAllowance(format: GameFormat, numPlayersOnSide = 1): number {
  if (format === "scramble") {
    if (numPlayersOnSide === 2) return 35;
    if (numPlayersOnSide === 3) return 20;
    if (numPlayersOnSide === 4) return 15;
    return 25;
  }
  return DEFAULT_ALLOWANCE[format];
}

// Course Handicap = Handicap Index x (Slope / 113) + (Course Rating - Par).
// If slope/course rating aren't known, we just return the handicap index rounded.
export function computeCourseHandicap({
  handicapIndex,
  slopeRating,
  courseRating,
  parTotal,
}: {
  handicapIndex: number;
  slopeRating?: number | null;
  courseRating?: number | null;
  parTotal?: number | null;
}): number {
  if (!Number.isFinite(handicapIndex)) return 0;
  if (!slopeRating || !courseRating || !parTotal) return Math.round(handicapIndex);
  const value = handicapIndex * (slopeRating / 113) + (courseRating - parTotal);
  return Math.round(value);
}

// Playing Handicap = Course Handicap x allowance%.
// Rounded to the nearest whole shot (WHS convention).
export function computePlayingHandicap(courseHandicap: number, allowancePercent = 100): number {
  if (!Number.isFinite(courseHandicap)) return 0;
  return Math.round(courseHandicap * (allowancePercent / 100));
}

// Strokes received on a given hole given the player's playing handicap and the
// hole's stroke index (1 = hardest hole, 18 = easiest).
// For handicaps > 18, extra shots are given starting again at SI 1.
export function strokesOnHole(playingHandicap: number, strokeIndex: number | null | undefined): number {
  if (!strokeIndex || strokeIndex < 1) return 0;
  if (playingHandicap <= 0) return 0;
  const base = Math.floor(playingHandicap / 18);
  const remainder = playingHandicap - base * 18;
  return base + (strokeIndex <= remainder ? 1 : 0);
}

// Stableford points from gross score, par, and net-adjusted par (par + strokes on hole).
// Standard system: bogey=1, par=2, birdie=3, eagle=4, albatross=5.
export function stablefordPoints(grossScore: number | null, par: number, playingHandicap: number, strokeIndex: number | null): number | null {
  if (grossScore == null) return null;
  const shots = strokesOnHole(playingHandicap, strokeIndex);
  const netScore = grossScore - shots;
  const diff = par - netScore; // positive => under par
  return Math.max(0, 2 + diff);
}

// Match play: return per-hole result relative to the reference side.
// value > 0 => reference side won the hole; < 0 => lost; 0 => halved.
export function matchHoleResult(refNet: number | null, opponentNet: number | null): -1 | 0 | 1 | null {
  if (refNet == null || opponentNet == null) return null;
  if (refNet < opponentNet) return 1;
  if (refNet > opponentNet) return -1;
  return 0;
}

// Given a sequence of match hole results (+1 / 0 / -1), return the running status.
// "3 UP", "1 DOWN", "AS", "3&2" (closeout) etc.
export function matchStatusLabel(results: Array<-1 | 0 | 1>, holesRemaining: number): { lead: number; label: string; closeout: boolean } {
  const lead = results.reduce<number>((sum, r) => sum + r, 0);
  const abs = Math.abs(lead);
  if (abs > holesRemaining) {
    // Match is closed out.
    return { lead, label: `${abs} & ${abs - holesRemaining}`, closeout: true };
  }
  if (lead === 0) return { lead: 0, label: "AS", closeout: false };
  return { lead, label: `${abs} ${lead > 0 ? "UP" : "DOWN"}`, closeout: false };
}
