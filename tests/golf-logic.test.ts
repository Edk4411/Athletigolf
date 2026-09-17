import { getStrokesReceived, stablefordPoints } from "../src/lib/handicap.ts";
import { calculateMatchState } from "../src/pages/RoundTracker/lib/matchEngine.ts";

function equal(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

// Full-round allocation: 18 playing handicap is one stroke on every SI.
equal(getStrokesReceived(18, 1, 18), 1, "18-hole SI 1 allocation");
equal(getStrokesReceived(18, 18, 18), 1, "18-hole SI 18 allocation");

// Nine-hole allocation uses the selected nine's SI rank, not its source SI.
equal(getStrokesReceived(18, 10, 9, 1), 1, "back-nine hardest hole allocation");
equal(getStrokesReceived(18, 18, 9, 9), 1, "back-nine easiest hole allocation");
equal(getStrokesReceived(12, 15, 9, 6), 1, "nine-hole remainder allocation");
equal(getStrokesReceived(12, 18, 9, 9), 0, "nine-hole non-receiving allocation");

equal(stablefordPoints(4, 4, 0), 2, "Stableford par");
equal(stablefordPoints(5, 4, 1), 2, "Stableford net par");
equal(stablefordPoints(8, 4, 0), 0, "Stableford net double bogey or worse");

const holes = [{ par: 4, handicap: 1 }, { par: 4, handicap: 2 }];
const players = [
  { id: "owner", team: "A" },
  { id: "opponent", team: "B" },
];
const scores = { owner: [5, 4], opponent: [4, 5] };
const match = calculateMatchState(
  holes as any,
  players as any,
  scores,
  2,
  (player, holeIndex) => Number(scores[player.id as keyof typeof scores][holeIndex]) - (player.id === "owner" && holeIndex === 0 ? 1 : 0)
);
equal(match.halved, 1, "net match-play half");
equal(match.teamAWins, 1, "net match-play winner");

console.log("Golf logic tests passed.");
