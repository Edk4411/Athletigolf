/**
 * LocalStorage draft helpers for Round Tracker.
 *
 * The draft is keyed by user ID so different users on the same device don't
 * collide. This is the offline autosave layer — every meaningful state change
 * mirrors into localStorage instantly so that closing the tab, locking the
 * phone or losing signal never wipes an active round.
 */

const KEY_PREFIX = "ag_round_draft";

function draftKey(userId: string) {
  return `${KEY_PREFIX}_${userId}`;
}

export type RoundDraftHole = {
  par: number;
  yardage: number | null;
  meters: number | null;
  handicap: number | null; // stroke index 1-18
  score: string;
  fairway: string;
  teeShotLocation: string;
  gir: boolean;
  putts: string;
  penaltyShots: string;
  chipShots: string;
  greensideBunkerShots: string;
  recoveryShotType: string;
};

export type RoundDraftPlayer = {
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

/**
 * Serialised course/tee snapshot so the round can rehydrate without a network
 * round-trip to the golf course search edge function.
 */
export type RoundDraftCourse = {
  externalId: number | null;
  cachedCourseId: string | null;
  clubName: string;
  courseName: string;
  isManual: boolean;
} | null;

export type RoundDraftTee = {
  id: string | null;
  teeName: string;
  courseRating: number | null;
  slopeRating: number | null;
  totalYards: number | null;
  totalMeters: number | null;
  parTotal: number | null;
} | null;

export type RoundDraftState = {
  /** Server-side round row id (null until the first `startRound` succeeds). */
  existingRoundId: string | null;
  /** Which wizard step the user was on when the draft was written. */
  step: "setup" | "holes" | "review" | "saved";
  setupSubStep: 1 | 2 | 3;
  scoreTab: "scorecard" | "stats" | "game";

  holesPlayed: 9 | 18;
  /** Front nine (holes 1-9), back nine (holes 10-18), or full 18. */
  nineSelection: "front" | "back" | "all";
  roundName: string;
  course: string;
  selectedCourse: RoundDraftCourse;
  selectedTee: RoundDraftTee;
  teeColour: string;
  date: string;
  notes: string;
  visibility: "private" | "friends";
  competition: boolean;

  ownHandicap: string;
  ownAllowancePercent: number;

  selectedGames: string[];
  roundIntent: "casual" | "competition";

  livePlayers: RoundDraftPlayer[];
  playerHoleScores: Record<string, string[]>;

  holes: RoundDraftHole[];
  currentHoleIndex: number;

  averageDrivingDistance: string;
  longestDrive: string;
  teeShotQuality: string;
  playingPartners: string;

  savedAt: string;
};

export function saveRoundDraft(
  userId: string,
  state: Omit<RoundDraftState, "savedAt">
): void {
  try {
    const payload: RoundDraftState = {
      ...state,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(draftKey(userId), JSON.stringify(payload));
  } catch {
    // Storage might be full or disabled; silently ignore.
  }
}

export function loadRoundDraft(userId: string): RoundDraftState | null {
  try {
    const raw = localStorage.getItem(draftKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RoundDraftState;
    // Reject drafts older than 48 hours
    if (parsed.savedAt) {
      const age = Date.now() - new Date(parsed.savedAt).getTime();
      if (age > 48 * 60 * 60 * 1000) {
        clearRoundDraft(userId);
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearRoundDraft(userId: string): void {
  try {
    localStorage.removeItem(draftKey(userId));
  } catch {
    // Ignore
  }
}

/** Does a draft exist and does it look like an active in-progress round? */
export function hasActiveDraft(userId: string): boolean {
  const draft = loadRoundDraft(userId);
  if (!draft) return false;
  if (draft.step === "saved") return false;
  const scored = draft.holes.some((h) => h.score !== "");
  return draft.step === "holes" || scored;
}
