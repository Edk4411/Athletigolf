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

export function getDefaultAllowancePercent(formats: GameFormat[]): number {
  const primary = formats[0] ?? "stroke_play";
  return DEFAULT_ALLOWANCES[primary] ?? 95;
}

export function computeCourseHandicap(
  handicapIndex: number,
  slopeRating: number,
  courseRating: number,
  par: number
): number {
  return Math.round(
    handicapIndex * (slopeRating / 113) + (courseRating - par)
  );
}

export function computePlayingHandicap(
  courseHandicap: number,
  allowancePercent: number
): number {
  return Math.round(courseHandicap * (allowancePercent / 100));
}

export function getStrokesReceived(
  playingHandicap: number,
  holeStrokeIndex: number | null,
  holesPlayed: 9 | 18
): number {
  if (!playingHandicap || playingHandicap <= 0) return 0;

  const si = holeStrokeIndex || 18;
  const base = Math.floor(playingHandicap / 18);
  const remainder = Math.floor(playingHandicap % 18);

  const adj = holesPlayed === 9 ? 0.5 : 1;

  return Math.floor(base * adj) + (si <= remainder ? 1 : 0);
}

export function strokesOnHole(
  playingHandicap: number,
  strokeIndex: number | null | undefined
): number {
  if (!strokeIndex || strokeIndex < 1) return 0;
  if (playingHandicap <= 0) return 0;

  const base = Math.floor(playingHandicap / 18);
  const remainder = playingHandicap - base * 18;

  return base + (strokeIndex <= remainder ? 1 : 0);
}

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

export function matchHoleResult(
  refNet: number | null,
  opponentNet: number | null
): -1 | 0 | 1 | null {
  if (refNet == null || opponentNet == null) return null;

  if (refNet < opponentNet) return 1;
  if (refNet > opponentNet) return -1;

  return 0;
}

export function matchStatusLabel(
  results: Array<-1 | 0 | 1>,
  holesRemaining: number
): { lead: number; label: string; closeout: boolean } {
  const lead = results.reduce((sum, r) => sum + r, 0);
  const abs = Math.abs(lead);

  if (abs > holesRemaining) {
    return {
      lead,
      label: `${abs} & ${abs - holesRemaining}`,
      closeout: true,
    };
  }

  if (lead === 0) {
    return {
      lead: 0,
      label: "AS",
      closeout: false,
    };
  }

  return {
    lead,
    label: `${abs} ${lead > 0 ? "UP" : "DOWN"}`,
    closeout: false,
  };
}

export function parseHandicapIndex(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}
