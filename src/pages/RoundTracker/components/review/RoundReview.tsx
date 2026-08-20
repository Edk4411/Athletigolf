import React from "react";
import { Card, Button } from "@/components/ui";
import ScoreBadge from "@/components/ScoreBadge";
import { ArrowLeft, Save } from "lucide-react";
import { Hole } from "../../lib/validation";
import { formatOption } from "../../lib/validation";
import { parseStat } from "../../lib/validation";

export function RoundReview({
  holes,
  saving,
  setCurrentHoleIndex,
  setStep,
  finishRound,
}: {
  holes: Hole[];
  saving: boolean;
  setCurrentHoleIndex: React.Dispatch<React.SetStateAction<number>>;
  setStep: React.Dispatch<React.SetStateAction<any>>;
  finishRound: (status: "completed" | "unfinished") => Promise<void>;
}) {
  return (
    <>
      <Card className="mb-6 border-golf/20 bg-golf/5">
        <h2 className="mb-2 text-2xl font-semibold text-golf">
          Review Before Saving
        </h2>
        <p className="text-black/60">
          Check the summary and hole details below. Skipped holes will stay out
          of the saved stats.
        </p>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-steel/10 text-muted">
              <tr>
                <th className="p-4">Hole</th>
                <th className="p-4">Par</th>
                <th className="p-4">Yards</th>
                <th className="p-4">SI</th>
                <th className="p-4">Score</th>
                <th className="p-4">Fairway</th>
                <th className="p-4">Tee lie</th>
                <th className="p-4">GIR</th>
                <th className="p-4">Putts</th>
                <th className="p-4">Pen</th>
                <th className="p-4">Short game</th>
                <th className="p-4">Edit</th>
              </tr>
            </thead>
            <tbody>
              {holes.map((hole, index) => (
                <tr key={index} className="border-t border-line">
                  <td className="p-4 font-semibold">{index + 1}</td>
                  <td className="p-4">{hole.par}</td>
                  <td className="p-4">{hole.yardage || "-"}</td>
                  <td className="p-4">{hole.handicap || "-"}</td>
                  <td className="p-4">
                    {hole.score ? (
                      <ScoreBadge score={hole.score} par={hole.par} size="sm" />
                    ) : (
                      <span className="rounded-full bg-steel/10 px-3 py-1 text-xs font-semibold text-muted">
                        Skipped
                      </span>
                    )}
                  </td>
                  <td className="p-4 capitalize">{formatOption(hole.fairway)}</td>
                  <td className="p-4 capitalize">
                    {hole.teeShotLocation ? formatOption(hole.teeShotLocation) : "-"}
                  </td>
                  <td className="p-4">{hole.gir ? "Yes" : "No"}</td>
                  <td className="p-4">{hole.putts || "-"}</td>
                  <td className="p-4">{hole.penaltyShots || "0"}</td>
                  <td className="p-4">
                    {parseStat(hole.chipShots) + parseStat(hole.greensideBunkerShots)}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => {
                        setCurrentHoleIndex(index);
                        setStep("holes");
                      }}
                      className="font-semibold text-golf"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          variant="secondary"
          onClick={() => setStep("holes")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back To Hole Entry
        </Button>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={() => finishRound("unfinished")}
            disabled={saving}
            variant="secondary"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Unfinished"}
          </Button>

          <Button
            onClick={() => finishRound("completed")}
            disabled={saving}
            variant="golf"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Finished Round"}
          </Button>
        </div>
      </div>
    </>
  );
}
