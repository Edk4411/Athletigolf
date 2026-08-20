import React from "react";
import { ArrowLeft, ArrowRight, UserPlus, Users } from "lucide-react";
import { Button, Card } from "../../../../components/ui";
import { Field, PlayerAvatar } from "./Shared";
import { computeCourseHandicap, computePlayingHandicap, parseHandicapIndex } from "@/lib/handicap";
import { getDisplayName } from "@/lib/nameFormatting";

export function PlayerStep({
  ownHandicap, ownAllowancePercent, selectedTee, livePlayers, friends,
  newPlayerName, newPlayerHandicap, newPlayerAllowance, defaultAllowance,
  setOwnHandicap, setOwnAllowancePercent, setNewPlayerName, setNewPlayerHandicap,
  setNewPlayerAllowance, addFriendPlayer, addLivePlayer, removeLivePlayer,
  onBack, onNext,
}: any) {
  return (
    <Card className="p-6 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-golf/10 text-golf">
          <Users className="h-5 w-5" />
        </span>
        <h2 className="text-xl font-semibold">Players</h2>
      </div>

      <div className="mb-5 rounded-2xl border border-golf/20 bg-golf/5 p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-golf">You</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Handicap index" value={ownHandicap} onChange={setOwnHandicap} type="number" placeholder="e.g. 12.4" />
          <div>
            <label className="mb-2 block text-sm text-muted">Allowance %</label>
            <input
              type="number" min={0} max={100}
              value={ownAllowancePercent}
              onChange={(e) => setOwnAllowancePercent(Number(e.target.value))}
              className="w-full rounded-lg border border-line px-4 py-3 outline-none focus:border-golf"
            />
          </div>
          {selectedTee?.slopeRating && selectedTee.courseRating && selectedTee.parTotal && ownHandicap && (
            <div className="flex flex-col justify-end">
              <p className="text-xs text-muted">Course HCP</p>
              <p className="text-2xl font-semibold text-golf">
                {computeCourseHandicap(
                  parseHandicapIndex(ownHandicap),
                  selectedTee.slopeRating,
                  selectedTee.courseRating,
                  selectedTee.parTotal
                )}
              </p>
              <p className="text-xs text-muted">
                Playing HCP: {computePlayingHandicap(
                  computeCourseHandicap(
                    parseHandicapIndex(ownHandicap),
                    selectedTee.slopeRating,
                    selectedTee.courseRating,
                    selectedTee.parTotal
                  ),
                  ownAllowancePercent
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {friends.length > 0 && (
        <div className="mb-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted">Add friends</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {friends.slice(0, 6).map((friend: any) => {
              const alreadyAdded = livePlayers.some((p: any) => p.userId === friend.other_user_id);
              const friendName = getDisplayName(friend) || (friend.other_username ? `@${friend.other_username}` : `Friend ${friend.other_user_id.slice(0, 8)}`);
              return (
                <button
                  key={friend.other_user_id}
                  type="button"
                  disabled={alreadyAdded}
                  onClick={() => addFriendPlayer(friend)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white/70 p-3 text-left transition hover:border-golf/40 disabled:opacity-55"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <PlayerAvatar src={friend.other_avatar_url} name={friendName} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-dark">{friendName}</span>
                      <span className="block text-xs text-muted">
                        {friend.other_golf_handicap == null ? "No handicap" : `HCP ${friend.other_golf_handicap}`}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-golf/10 px-2.5 py-1 text-xs font-bold text-golf">
                    {alreadyAdded ? "Added" : "Add"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_100px_100px_auto]">
        <Field label="Guest name" value={newPlayerName} onChange={setNewPlayerName} placeholder="Sam, Jack…" />
        <Field label="HCP index" value={newPlayerHandicap} onChange={setNewPlayerHandicap} type="number" placeholder="14.0" />
        <Field label="Allowance %" value={newPlayerAllowance} onChange={setNewPlayerAllowance} type="number" placeholder={String(defaultAllowance)} />
        <Button type="button" variant="golf" className="self-end" onClick={addLivePlayer}>
          <UserPlus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {livePlayers.length > 0 && (
        <div className="mb-4 space-y-2">
          {livePlayers.map((player: any) => (
            <div key={player.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white/70 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-dark">{player.name}</p>
                <p className="text-xs text-muted">
                  {player.handicap ? `HCP ${player.handicap}` : "No HCP"} · Allowance {player.allowancePercent}%
                </p>
              </div>
              <button type="button" onClick={() => removeLivePlayer(player.id)} className="text-xs font-semibold text-muted hover:text-danger">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button variant="golf" onClick={onNext}>
          Next: Game
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
