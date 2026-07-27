// Autosave orchestrator for a live round.
// - Snapshots current round state to localStorage on every change (debounced).
// - Upserts round meta + round_holes to Supabase after each hole.
// - Flushes on visibility change (tab hidden / app backgrounded) and before unload.

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { saveRoundDraft, type RoundDraftSnapshot } from "@/lib/roundDraft";

type Options = {
  enabled: boolean;
  userId: string | null | undefined;
  roundId: string | null;
  buildSnapshot: () => RoundDraftSnapshot;
  syncToSupabase?: () => Promise<void>; // optional server sync, called on hole flush
  debounceMs?: number;
};

export function useRoundAutosave({
  enabled, userId, roundId, buildSnapshot, syncToSupabase, debounceMs = 1200,
}: Options) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  // Flush helper - persist locally + optionally to Supabase.
  const flush = async (reason: "debounced" | "background" | "manual") => {
    if (!enabled) return;
    try {
      const snapshot = buildSnapshot();
      saveRoundDraft(userId, snapshot);
    } catch {
      /* ignore */
    }
    if (reason === "manual" || reason === "background") {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        if (roundId) {
          await supabase
            .from("rounds")
            .update({ auto_saved_at: new Date().toISOString() })
            .eq("id", roundId);
        }
        if (syncToSupabase) await syncToSupabase();
      } catch {
        /* silently tolerate - local snapshot is still safe */
      } finally {
        inFlightRef.current = false;
      }
    }
  };

  // Schedule a debounced local flush every time snapshot inputs change.
  const scheduleLocalFlush = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { flush("debounced"); }, debounceMs);
  };

  // Public trigger callers use when a hole is completed or setup changes.
  const flushNow = (reason: "background" | "manual" = "manual") => flush(reason);

  useEffect(() => {
    if (!enabled) return;
    scheduleLocalFlush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  useEffect(() => {
    if (!enabled) return;
    const onHide = () => { flush("background"); };
    const onBeforeUnload = () => { flush("background"); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onBeforeUnload);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onBeforeUnload);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, roundId]);

  return { flushNow };
}
