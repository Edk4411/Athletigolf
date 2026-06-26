import type { Round } from "@/lib/types";

const FAIRWAY_HOLES_PER_ROUND = 14;

const hasValue = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined;

const average = (values: number[]) =>
  values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;

export function getGolfStats(rounds: Round[]) {
  const scoredRounds = rounds.filter((round) => hasValue(round.score));
  const fairwayRounds = rounds.filter((round) => hasValue(round.fairways_hit));
  const girRounds = rounds.filter((round) => hasValue(round.greens_in_regulation));
  const puttingRounds = rounds.filter((round) => hasValue(round.putts));
  const scrambleRounds = rounds.filter((round) => hasValue(round.scramble_percentage));

  const fairwaysHit = fairwayRounds.reduce(
    (sum, round) => sum + (round.fairways_hit ?? 0),
    0
  );
  const fairwaysPossible = fairwayRounds.reduce((sum, round) => {
    if (hasValue(round.fairways_possible) && round.fairways_possible > 0) {
      return sum + round.fairways_possible;
    }
    const holesPlayed = round.holes_played === 9 ? 9 : 18;
    return sum + (holesPlayed === 9 ? 7 : FAIRWAY_HOLES_PER_ROUND);
  }, 0);

  const greensHit = girRounds.reduce(
    (sum, round) => sum + (round.greens_in_regulation ?? 0),
    0
  );
  const greensPossible = girRounds.reduce(
    (sum, round) => sum + (round.holes_played === 9 ? 9 : 18),
    0
  );

  return {
    avgScore: average(scoredRounds.map((round) => round.score as number)),
    bestScore:
      scoredRounds.length > 0
        ? Math.min(...scoredRounds.map((round) => round.score as number))
        : null,
    avgFairwayPercent:
      fairwaysPossible > 0 ? Math.round((fairwaysHit / fairwaysPossible) * 100) : null,
    avgGirPercent:
      greensPossible > 0 ? Math.round((greensHit / greensPossible) * 100) : null,
    avgPutts: average(puttingRounds.map((round) => round.putts as number)),
    avgPenaltyShots: average(rounds.map((round) => round.penalty_shots ?? 0)),
    avgChipShots: average(rounds.map((round) => round.chip_shots ?? 0)),
    avgGreensideBunkerShots: average(
      rounds.map((round) => round.greenside_bunker_shots ?? 0)
    ),
    totalPenaltyShots: rounds.reduce(
      (sum, round) => sum + (round.penalty_shots ?? 0),
      0
    ),
    avgScramblePercent: average(
      scrambleRounds.map((round) => round.scramble_percentage as number)
    ),
  };
}

export const formatAverage = (value: number | null, digits = 1) =>
  value === null ? "-" : value.toFixed(digits);

export const formatPercent = (value: number | null) =>
  value === null ? "-" : `${value}%`;
