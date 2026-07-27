/**
 * LocalStorage draft helpers for Round Tracker.
 * The draft is keyed by user ID so different users on the same device don't collide.
 */

const KEY_PREFIX = "ag_round_draft";

function draftKey(userId: string) {
  return `${KEY_PREFIX}_${userId}`;
}

export type RoundDraftHole = {
  par: number;
  yardage: number | null;
  meters: number | null;
  handicap: number | null;
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
};

export type RoundDraftState = {
  existingRoundId: string | null;
  holesPlayed: 9 | 18;
  roundName: string;
  course: string;
  teeColour: string;
  date: string;
  notes: string;
  visibility: "private" | "friends";
  ownHandicap: string;
  ownAllowancePercent: number;
  selectedGames: string[];
  livePlayers: RoundDraftPlayer[];
  playerHoleScores: Record<string, string[]>;
  holes: RoundDraftHole[];
  currentHoleIndex: number;
  savedAt: string;
};

export function saveRoundDraft(userId: string, state: Omit<RoundDraftState, "savedAt">): void {
  try {
    const payload: RoundDraftState = { ...state, savedAt: new Date().toISOString() };
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
