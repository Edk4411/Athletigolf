import type { LiveParticipant, Hole } from "./validation";
import type { GolfCourseTee } from "@/lib/types";

export type LivePlayer = {
  id: string;
  name: string;
  handicap: string;
  allowancePercent: number;
  type: "friend" | "guest";
  team: "A" | "B";
  userId?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
};

export type LiveGame = {
  game_type: "stroke_play" | "medal" | "stableford" | "match_play" | "skins" | "four_ball_stroke" | "four_ball_match" | "foursomes";
  // ... other properties if any
};

export type MatchResultSnapshot = {
  primary_game_type: string;
  sides: Array<{
    id: string;
    name: string;
    team_colour: "blue" | "red" | null;
    won: number;
    lost: number;
    halved: number;
  }>;
  result_label: string;
  finish_hole: number | null;
} | null;

export function buildMatchResultSnapshot(
  livePlayers: LivePlayer[],
  playerHoleScores: Record<string, string[]>,
  matchState: any,
  selectedGames: LiveGame[]
): MatchResultSnapshot {

  const isMatch = selectedGames.some(
    (g) =>
      g.game_type === "match_play" ||
      g.game_type === "four_ball_match" ||
      g.game_type === "foursomes"
  );

  if (!isMatch) return null;

  const teamA = livePlayers.filter(
    (p) => p.team === "A"
  );

  const teamB = livePlayers.filter(
    (p) => p.team === "B"
  );

  if (!teamA.length || !teamB.length) {
    return null;
  }

  let won = 0;
  let lost = 0;
  let halved = 0;

  const totalHoles = Math.max(
    0,
    ...Object.values(playerHoleScores).map(
      (arr) => arr.length
    )
  );

  for (let i = 0; i < totalHoles; i++) {
    const a = teamBestScore(
      teamA,
      playerHoleScores,
      i
    );

    const b = teamBestScore(
      teamB,
      playerHoleScores,
      i
    );

    if (a == null || b == null) continue;

    if (a < b) won++;
    else if (a > b) lost++;
    else halved++;
  }

  return {
    primary_game_type:
      selectedGames[0]?.game_type || "match_play",

    sides: [
      {
        id: "team-a",
        name: "Blue Team",
        team_colour: "blue",
        won,
        lost,
        halved,
      },
      {
        id: "team-b",
        name: "Red Team",
        team_colour: "red",
        won: lost,
        lost: won,
        halved,
      },
    ],

    result_label:
      matchState.status ||
      (
        won === lost
          ? "AS"
          : won > lost
          ? `${won - lost} UP`
          : `${lost - won} DOWN`
      ),

    finish_hole:
      matchState.closeout
        ? matchState.holesPlayed || null
        : null,
  };
}

export function teamBestScore(
  team: LivePlayer[],
  scores: Record<string, string[]>,
  holeIndex: number
): number | null {

  let best: number | null = null;

  for (const player of team) {
    const raw = scores[player.id]?.[holeIndex];
    const value = raw ? Number(raw) : null;

    if (value !== null && !Number.isNaN(value)) {
      best =
        best === null
          ? value
          : Math.min(best, value);
    }
  }

  return best;
}

export function calculateMatchState(
  holes: Hole[],
  players: LiveParticipant[],
  playerScores: Record<string, string[]>,
  holesPlayed: number,
  scoreForPlayer: (player: LiveParticipant, holeIndex: number) => number | null =
    (player, holeIndex) => getParticipantScore(player.id, holeIndex, holes, playerScores)
) {
  let teamAWins = 0, teamBWins = 0, halved = 0;
  const holeResults: Array<{
    hole: number; label: string; leader: "A" | "B" | "AS";
    teamAScore: number | null; teamBScore: number | null; matchLabel: string;
  }> = [];

  holes.forEach((hole, index) => {
    const teamAScore = getTeamHoleScore("A", index, players, scoreForPlayer);
    const teamBScore = getTeamHoleScore("B", index, players, scoreForPlayer);
    if (teamAScore === null || teamBScore === null) return;
    let leader: "A" | "B" | "AS" = "AS";
    let label = "Halved";
    if (teamAScore < teamBScore) { teamAWins++; leader = "A"; label = "Team A wins"; }
    else if (teamBScore < teamAScore) { teamBWins++; leader = "B"; label = "Team B wins"; }
    else halved++;
    const lead = teamAWins - teamBWins;
    holeResults.push({ hole: index + 1, label, leader, teamAScore, teamBScore, matchLabel: formatMatchLabel(lead) });
  });

  const lead = teamAWins - teamBWins;
  const countedHoles = holeResults.length;
  const holesRemaining = Math.max(holesPlayed - countedHoles, 0);
  const leaderName = lead > 0 ? "Team A" : lead < 0 ? "Team B" : "";
  const closeout = Math.abs(lead) > holesRemaining && countedHoles > 0
    ? `${leaderName} wins ${Math.abs(lead)}&${holesRemaining}`
    : null;

  return {
    label: closeout || formatMatchLabel(lead),
    closeout, teamAWins, teamBWins, halved,
    holesPlayed: countedHoles, holesRemaining, holeResults,
  };
}

export function getTeamHoleScore(
  team: "A" | "B", holeIndex: number, players: LiveParticipant[],
  scoreForPlayer: (player: LiveParticipant, holeIndex: number) => number | null
) {
  const scores = players
    .filter((p) => p.team === team)
    .map((p) => scoreForPlayer(p, holeIndex))
    .filter((s): s is number => s !== null);
  return scores.length ? Math.min(...scores) : null;
}

export function getParticipantScore(
  playerId: string, holeIndex: number, holes: Hole[], playerScores: Record<string, string[]>
) {
  const raw = playerId === "owner" ? holes[holeIndex]?.score : playerScores[playerId]?.[holeIndex];
  if (raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function formatMatchLabel(lead: number) {
  if (lead === 0) return "All square";
  return `${lead > 0 ? "Team A" : "Team B"} ${Math.abs(lead)} Up`;
}

export function calculateSkinsState(
  holes: Hole[], players: LiveParticipant[],
  playerScores: Record<string, string[]>, holesPlayed: 9 | 18,
  selectedTee: GolfCourseTee | null
) {
  let carryover = 0;
  const playerSkins = new Map<string, number>();
  const holeResults: Array<{
    hole: number; label: string; winningPlayerId: string | null;
    skinsAwarded: number; carryover: number;
  }> = [];

  holes.slice(0, holesPlayed).forEach((hole, index) => {
    const scoredPlayers = players
      .map((p) => ({ player: p, score: getParticipantScore(p.id, index, holes, playerScores) }))
      .filter((item): item is { player: LiveParticipant; score: number } => item.score !== null);
    if (!scoredPlayers.length) return;
    const best = Math.min(...scoredPlayers.map((i) => i.score));
    const winners = scoredPlayers.filter((i) => i.score === best);
    if (winners.length === 1) {
      const skinsAwarded = carryover + 1;
      const winner = winners[0].player;
      playerSkins.set(winner.id, (playerSkins.get(winner.id) || 0) + skinsAwarded);
      holeResults.push({ hole: index + 1, label: `${winner.name} wins ${skinsAwarded} skin${skinsAwarded === 1 ? "" : "s"}`, winningPlayerId: winner.id, skinsAwarded, carryover });
      carryover = 0;
    } else {
      carryover++;
      holeResults.push({ hole: index + 1, label: `Carryover (${carryover})`, winningPlayerId: null, skinsAwarded: 0, carryover });
    }
  });

  return { playerSkins, holeResults, carryover };
}
