// Shown on the Golf Hub when the user has an unfinished round waiting to be resumed.
// Reads from Supabase first, falls back to localStorage draft.

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, Play, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { clearRoundDraft, draftAgeMinutes, loadRoundDraft, type RoundDraftSnapshot } from "@/lib/roundDraft";

type UnfinishedRound = {
  id: string;
  round_name: string | null;
  course: string | null;
  holes_played: number | null;
  target_holes: number | null;
  updated_at?: string | null;
  auto_saved_at?: string | null;
  created_at: string;
};

export default function UnfinishedRoundBanner() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [remote, setRemote] = useState<UnfinishedRound | null>(null);
  const [local, setLocal] = useState<RoundDraftSnapshot | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLocal(loadRoundDraft(user.id));
    supabase
      .from("rounds")
      .select("id, round_name, course, holes_played, target_holes, created_at, auto_saved_at, updated_at")
      .in("status", ["draft", "unfinished"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setRemote((data as UnfinishedRound) || null));
  }, [user]);

  if (dismissed) return null;
  if (!remote && !local) return null;

  const roundName = remote?.round_name || local?.round_name || "Unfinished round";
  const courseName = remote?.course || local?.course || "";
  const holesDone = local?.current_hole_index != null ? `${local.current_hole_index}/${local.holes_played}` : (remote ? `${remote.holes_played ?? 0}/${remote.target_holes ?? 18}` : "");
  const ageMin = draftAgeMinutes(local);
  const ageLabel = ageMin == null ? "" : ageMin < 60 ? `${ageMin}m ago` : `${Math.round(ageMin / 60)}h ago`;

  const resumeHref = remote ? `/golf/live?resume=${remote.id}` : "/golf/live";

  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-50 p-4 shadow-sm" data-testid="unfinished-round-banner">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/20 text-amber-600">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-amber-900">You have an unfinished round</p>
        <p className="mt-0.5 truncate text-xs text-amber-800">
          {roundName}{courseName ? ` - ${courseName}` : ""}{holesDone ? ` - through ${holesDone}` : ""}{ageLabel ? ` - ${ageLabel}` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={() => navigate(resumeHref)}
        data-testid="resume-round-btn"
        className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700"
      >
        <Play className="h-3.5 w-3.5" /> Resume
      </button>
      <button
        type="button"
        onClick={() => { clearRoundDraft(user?.id); setDismissed(true); }}
        aria-label="Dismiss"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-amber-800/80 hover:bg-amber-100"
        data-testid="dismiss-unfinished-banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
