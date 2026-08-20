import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import { Hole } from "../../lib/validation";

export function ScorecardControls({
  currentHoleIndex, holesPlayed, holes, holeStartOffset,
  setCurrentHoleIndex, goToPreviousHole, goToNextHole, reviewRound,
}: {
  currentHoleIndex: number;
  holesPlayed: 9 | 18;
  holes: Hole[];
  holeStartOffset: number;
  setCurrentHoleIndex: React.Dispatch<React.SetStateAction<number>>;
  goToPreviousHole: () => void;
  goToNextHole: () => void;
  reviewRound: () => void;
}) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Button
        variant="secondary"
        onClick={goToPreviousHole}
        disabled={currentHoleIndex === 0}
        className="w-full lg:w-auto"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>

      <div className="flex gap-3">
        {currentHoleIndex < holesPlayed - 1 && (
          <>
            <Button
              variant="secondary"
              onClick={goToNextHole}
            >
              Skip
            </Button>

            <Button
              variant="golf"
              onClick={goToNextHole}
            >
              Next Hole
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        <Button
          variant="golf"
          onClick={reviewRound}
        >
          Finish
        </Button>
      </div>
    </div>
  );
}
