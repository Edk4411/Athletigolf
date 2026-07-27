// Local-storage draft protection for a live round. Complements the Supabase
// persistence so an offline / backgrounded / crashed session can still be
// recovered.

const KEY_PREFIX = "athletigolf:round-draft:";

export type RoundDraftSnapshot = {
  version: 1;
  round_id: string | null;
  updated_at: string; // ISO
  step: string;
  holes_played: 9 | 18;
  round_name: string;
  course: string;
  tee_name: string;
  tee_colour: string;
  handicap_allowance_percent: number;
  primary_game_type: string;
  players: unknown; // opaque - the caller shapes it
  holes: unknown;   // opaque
  match_state: unknown;
  current_hole_index: number;
  notes: string;
};

function key(userId: string | null | undefined) {
  return `${KEY_PREFIX}${userId || "anonymous"}`;
}

export function saveRoundDraft(userId: string | null | undefined, snapshot: RoundDraftSnapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(userId), JSON.stringify(snapshot));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function loadRoundDraft(userId: string | null | undefined): RoundDraftSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RoundDraftSnapshot;
    return parsed?.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function clearRoundDraft(userId: string | null | undefined) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key(userId));
  } catch {
    /* ignore */
  }
}

export function draftAgeMinutes(snapshot: RoundDraftSnapshot | null): number | null {
  if (!snapshot?.updated_at) return null;
  const ts = new Date(snapshot.updated_at).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.round((Date.now() - ts) / 60000);
}
