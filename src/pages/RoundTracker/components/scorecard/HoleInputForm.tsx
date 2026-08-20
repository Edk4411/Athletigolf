import React from "react";
import { FairwayResult, TeeShotLocation } from "@/lib/types";
import { Field, SelectField } from "../setup/Shared";
import { Hole } from "../../lib/validation";

export function HoleInputForm({
  currentHole, currentHoleIndex, updateHole, livePlayers, playerHoleScores, updatePlayerHoleScore,
}: {
  currentHole: Hole;
  currentHoleIndex: number;
  updateHole: <K extends keyof Hole>(index: number, field: K, value: Hole[K]) => void;
  livePlayers: any[];
  playerHoleScores: Record<string, string[]>;
  updatePlayerHoleScore: (playerId: string, holeIndex: number, score: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
      <SelectField
        label="Par"
        value={currentHole.par.toString()}
        onChange={(value) => {
          const nextPar = Number(value);
          updateHole(currentHoleIndex, "par", nextPar);
        }}
        options={["3", "4", "5"]}
      />

      <Field
        label="Score"
        type="number"
        value={currentHole.score}
        onChange={(value) =>
          updateHole(currentHoleIndex, "score", value)
        }
      />

      <SelectField
        label="Fairway"
        value={currentHole.fairway}
        disabled={currentHole.par === 3}
        onChange={(value) =>
          updateHole(
            currentHoleIndex,
            "fairway",
            value as FairwayResult
          )
        }
        options={["na", "hit", "left", "right", "miss"]}
      />

      {currentHole.par !== 3 &&
        currentHole.fairway !== "hit" &&
        currentHole.fairway !== "na" && (
          <SelectField
            label="Where did it finish?"
            value={currentHole.teeShotLocation || ""}
            onChange={(value) =>
              updateHole(
                currentHoleIndex,
                "teeShotLocation",
                value as "" | TeeShotLocation
              )
            }
            options={[
              "",
              "rough",
              "fairway_bunker",
              "woods",
              "water",
              "out_of_bounds",
              "other_fairway",
              "other",
            ]}
          />
        )}

      <label className="flex items-center gap-3 rounded-lg border border-line px-4 py-3">
        <input
          type="checkbox"
          checked={currentHole.gir}
          onChange={(event) =>
            updateHole(
              currentHoleIndex,
              "gir",
              event.target.checked
            )
          }
        />
        <span className="text-sm font-medium">GIR</span>
      </label>
      <Field
        label="Putts"
        type="number"
        value={currentHole.putts}
        onChange={(value) => updateHole(currentHoleIndex, "putts", value)}
      />
      {livePlayers.map((player: any) => (
        <Field
          key={player.id}
          label={`${player.name} score`}
          type="number"
          value={playerHoleScores[player.id]?.[currentHoleIndex] || ""}
          onChange={(value) => updatePlayerHoleScore(player.id, currentHoleIndex, value)}
        />
      ))}
    </div>
  );
}
