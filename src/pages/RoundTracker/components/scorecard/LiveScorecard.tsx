import React from "react";
import { Card, StatCard, Button } from "@/components/ui";
import { Trophy, MessageCircle, AlertTriangle } from "lucide-react";
import ScoreBadge from "@/components/ScoreBadge";
import { HoleInputForm } from "./HoleInputForm";
import { ScorecardControls } from "./ScorecardControls";
import { PlayerAvatar } from "../setup/Shared";
import { Hole } from "../../lib/validation";

export function LiveScorecard({
  holes,
  currentHole,
  currentHoleIndex,
  holesPlayed,
  nineSelection,
  holeStartOffset,
  selectedGames,
  livePlayers,
  playerHoleScores,
  hasMatchGame,
  matchState,
  liveLeaderboard,
  handicapAllowancePercent,
  setHandicapAllowancePercent,
  setCurrentHoleIndex,
  updateHole,
  updatePlayerHoleScore,
  goToPreviousHole,
  goToNextHole,
  reviewRound,
}: any) {
  return (
    <Card className="p-5 md:p-7">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-golf">
            Hole {currentHoleIndex + 1 + holeStartOffset} of {nineSelection === "back" ? "18" : holesPlayed}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <ScoreBadge score={currentHole.score || null} par={currentHole.par} size="lg" />
            <h2 className="text-4xl font-semibold">
              {currentHole.score ? (currentHole.score - currentHole.par > 0 ? `+${currentHole.score - currentHole.par}` : currentHole.score - currentHole.par === 0 ? "E" : currentHole.score - currentHole.par) : "Not scored"}
            </h2>
          </div>
          <p className="mt-2 text-sm text-muted">
            {(currentHole.yardage || currentHole.handicap) && (
              <>
                {currentHole.yardage ? `${currentHole.yardage} yd` : ""}
                {currentHole.yardage && currentHole.handicap ? " / " : ""}
                {currentHole.handicap ? `SI ${currentHole.handicap}` : ""}
              </>
            )}
          </p>
        </div>

        <div className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible">
          {holes.map((hole: any, index: number) => (
            <button
              key={index}
              onClick={() => setCurrentHoleIndex(index)}
              className={`h-10 w-10 rounded-lg border text-sm font-semibold transition ${
                index === currentHoleIndex
                  ? "border-golf bg-golf text-white"
                  : hole.score
                    ? "border-golf/30 bg-golf/10 text-golf"
                    : "border-line bg-white text-muted hover:border-golf/40"
              }`}
              aria-label={`Hole ${index + 1 + holeStartOffset}`}
            >
              {index + 1 + holeStartOffset}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-line bg-panel p-4">
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-golf" />
          <h3 className="font-semibold text-dark">Live leaderboard</h3>
        </div>
        <div className="space-y-2">
          {liveLeaderboard.map((player: any, idx: number) => {
            const teamColour =
              hasMatchGame
                ? player.team === "A"
                  ? "border-l-4 border-blue-500"
                  : "border-l-4 border-red-500"
                : "";
            return (
              <div key={player.id} className={`flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 ${teamColour}`}>
                <div className="flex min-w-0 items-center gap-3">
                  <PlayerAvatar src={player.avatarUrl} name={player.name} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-dark">{idx + 1}. {player.name}</p>
                    <p className="text-xs text-muted">{player.holes}/{holesPlayed}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="flex justify-end"><ScoreBadge score={player.score} scoreToPar={player.toPar} /></p>
                  <p className="mt-1 flex justify-end"><ScoreBadge score={player.toPar === null ? null : (player.toPar > 0 ? `+${player.toPar}` : player.toPar === 0 ? "E" : player.toPar)} scoreToPar={player.toPar} size="sm" /></p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-golf/20 bg-golf/5 p-4">
        <div className="mb-3 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-golf" />
          <h3 className="font-semibold text-dark">Live round feed</h3>
        </div>
        {hasMatchGame && (
          <div className="mt-4 rounded-xl border border-golf/20 bg-panel p-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-golf">Match status</p>
            <h4 className="mt-2 text-2xl font-semibold text-dark">{matchState.label}</h4>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <span className="rounded-lg bg-golf/10 px-2 py-2 font-bold text-golf">{matchState.teamAWins} Team A</span>
              <span className="rounded-lg bg-steel/10 px-2 py-2 font-bold text-muted">{matchState.halved} Halved</span>
              <span className="rounded-lg bg-pulse/10 px-2 py-2 font-bold text-pulse">{matchState.teamBWins} Team B</span>
            </div>
          </div>
        )}
      </div>

      <HoleInputForm
        currentHole={currentHole}
        currentHoleIndex={currentHoleIndex}
        updateHole={updateHole}
        livePlayers={livePlayers}
        playerHoleScores={playerHoleScores}
        updatePlayerHoleScore={updatePlayerHoleScore}
      />

      <ScorecardControls
        currentHoleIndex={currentHoleIndex}
        holesPlayed={holesPlayed}
        holes={holes}
        holeStartOffset={holeStartOffset}
        setCurrentHoleIndex={setCurrentHoleIndex}
        goToPreviousHole={goToPreviousHole}
        goToNextHole={goToNextHole}
        reviewRound={reviewRound}
      />
    </Card>
  );
}
