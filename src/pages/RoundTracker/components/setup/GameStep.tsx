import React from "react";
import { ArrowLeft, Flag, Handshake, Trophy } from "lucide-react";
import { Button, Card } from "../../../../components/ui";

export function GameStep({
  selectedGames, liveGameOptions, primaryGame, defaultAllowance,
  hasMatchGame, hasTeamGame, roundIntent, liveParticipants, teamCounts,
  saveError, saving, toggleGame, setRoundIntent, setCompetition,
  updatePlayerTeam, startRound, onBack,
}: any) {
  return (
    <Card className="p-6 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-golf/10 text-golf">
          <Trophy className="h-5 w-5" />
        </span>
        <h2 className="text-xl font-semibold">Game Format</h2>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {liveGameOptions.map((game: any) => {
          const active = selectedGames.includes(game.id);
          return (
            <button
              key={game.id}
              type="button"
              onClick={() => toggleGame(game.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-golf bg-golf text-white"
                  : "border-line bg-panel text-dark hover:border-golf/35"
              }`}
            >
              <span className="block text-sm font-semibold">{game.label}</span>
              <span className={`mt-1 block text-xs ${active ? "text-white/70" : "text-muted"}`}>{game.detail}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-golf/20 bg-golf/5 px-4 py-3 text-sm text-muted">
        Default allowance for <strong>{liveGameOptions.find((o: any) => o.id === primaryGame)?.label}</strong>: <strong>{defaultAllowance}%</strong>.
        Individual overrides set in step 2.
      </div>

      {hasMatchGame && (
        <div className="mt-5 rounded-2xl border border-gold/25 bg-gold/10 p-4">
          <div className="mb-4 flex items-start gap-3">
            <Handshake className="mt-1 h-5 w-5 shrink-0 text-gold" />
            <div>
              <h3 className="font-semibold text-dark">Match setup</h3>
              <p className="mt-1 text-sm text-muted">Assign teams and choose casual or competition.</p>
            </div>
          </div>
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            {(["casual", "competition"] as const).map((intent) => (
              <button
                key={intent}
                type="button"
                onClick={() => { setRoundIntent(intent); setCompetition(intent === "competition"); }}
                className={`rounded-xl border px-4 py-3 text-left font-semibold capitalize transition ${
                  roundIntent === intent
                    ? "border-gold bg-gold text-dark"
                    : "border-line bg-panel text-dark hover:border-gold/40"
                }`}
              >
                {intent} matchplay
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {liveParticipants.map((player: any) => (
              <div key={player.id} className="grid gap-2 rounded-xl bg-panel p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-semibold text-dark">{player.name}</p>
                  <p className="text-xs text-muted">
                    {player.type === "owner" ? "You" : player.type} {player.handicap ? `· HCP ${player.handicap}` : ""}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(["A", "B"] as const).map((team) => (
                    <button
                      key={team}
                      type="button"
                      disabled={player.id === "owner" && team === "B"}
                      onClick={() => updatePlayerTeam(player.id, team)}
                      className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                        player.team === team
                          ? team === "A"
                            ? "bg-blue-500 text-white"
                            : "bg-red-500 text-white"
                          : "bg-steel/10 text-muted hover:bg-steel/15 disabled:opacity-40"
                      }`}
                    >
                      {team === "A" ? "🔵 A" : "🔴 B"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs font-semibold text-muted">
            Team A: {teamCounts.A} · Team B: {teamCounts.B}
            {hasTeamGame ? " — 4BBB and foursomes need 2 vs 2." : ""}
          </p>
        </div>
      )}

      {saveError && (
        <div className="mt-4 rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
          {saveError}
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button variant="golf" onClick={startRound} disabled={saving}>
          <Flag className="h-4 w-4" />
          {saving ? "Creating round…" : "Start Hole Entry"}
        </Button>
      </div>
    </Card>
  );
}
