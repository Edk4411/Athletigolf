import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { Activity, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button, EmptyState, PageHeader, Surface } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { FriendProfileSummary, LiveActivity } from "@/lib/types";
import { getDisplayName } from "@/lib/nameFormatting";

export default function FriendProfile() {
  const [, params] = useRoute("/social/friends/:friendId");
  const friendId = params?.friendId || "";
  const [profile, setProfile] = useState<FriendProfileSummary | null>(null);
  const [activity, setActivity] = useState<LiveActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!friendId) return;
    let cancelled = false;

    async function loadFriendProfile() {
      setLoading(true);
      setError("");
      const [{ data: profileData, error: profileError }, { data: activityData }] = await Promise.all([
        supabase.rpc("get_friend_profile", { friend_user_id: friendId }),
        supabase
          .from("live_activities")
          .select("*")
          .eq("user_id", friendId)
          .eq("visibility", "friends")
          .is("ended_at", null)
          .order("started_at", { ascending: false })
          .limit(1),
      ]);

      if (cancelled) return;
      if (profileError) setError(profileError.message);
      setProfile(((profileData as FriendProfileSummary[]) || [])[0] || null);
      setActivity(((activityData as LiveActivity[]) || [])[0] || null);
      setLoading(false);
    }

    loadFriendProfile();
    return () => {
      cancelled = true;
    };
  }, [friendId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-muted">
        Loading friend profile...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen bg-cream px-4 py-5 text-ink md:px-8 md:py-7">
        <EmptyState
          title="Friend profile unavailable"
          description="This profile can only be opened for accepted friends."
          action={<Link href="/social" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-dark transition hover:bg-steel/5">Back to Social</Link>}
        />
      </main>
    );
  }

  const displayName = getDisplayName(profile as any);

  return (
    <main className="min-h-screen bg-cream px-4 py-5 text-ink md:px-8 md:py-7">
      <PageHeader
        eyebrow="Friend Profile"
        title={displayName}
        description="A lightweight friend page for status and basic profile context. Training and golf logs stay private unless sharing is added later."
        tone="text-pulse"
        actions={<Button type="button" variant="secondary" onClick={() => window.history.back()}><ArrowLeft className="h-4 w-4" />Back</Button>}
      />

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Surface>
          <div className="flex items-start gap-4">
            <FriendAvatar src={profile.avatar_url} name={displayName} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Accepted friend</p>
              <h2 className="mt-2 text-3xl font-semibold text-dark">{displayName}</h2>
              {profile.username && <p className="mt-1 text-sm font-semibold text-pulse">@{profile.username}</p>}
              {profile.bio && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{profile.bio}</p>}
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoTile label="Mode" value={formatMode(profile.main_sport)} />
            <InfoTile label="Goal" value={profile.main_goal || "Not shared"} />
            <InfoTile label="Handicap" value={profile.golf_handicap !== null && profile.golf_handicap !== undefined ? Number(profile.golf_handicap).toFixed(1) : "Not shared"} />
            <InfoTile label="Home Course" value={profile.home_course || "Not shared"} />
          </div>
        </Surface>

        <Surface className="bg-dark text-white">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-pulse/15 text-pulse">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-pulse">Live status</p>
              <h2 className="mt-2 text-3xl font-semibold">{activity ? getActivityLabel(activity.activity_type) : "Offline"}</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/64">
                {activity
                  ? `${activity.location_name || "Location not set"} - ${activity.detail || "No extra detail"}`
                  : "No friends-visible check-in is active right now."}
              </p>
            </div>
          </div>
        </Surface>
      </section>

      <Surface className="mt-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-pulse" />
          <p className="text-sm leading-relaxed text-muted">
            Friend profiles currently show only basic profile context and live check-ins. Rounds, workouts, Strava activity and wellness data stay private until you build explicit sharing controls.
          </p>
        </div>
      </Surface>
    </main>
  );
}

function FriendAvatar({ src, name }: { src?: string | null; name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "A";
  return (
    <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-pulse/15 bg-pulse/10 text-xl font-bold text-pulse">
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initial}
    </span>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/60 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold text-dark">{value}</p>
    </div>
  );
}

function formatMode(mode: string | null) {
  if (mode === "training") return "Fitness tracking";
  if (mode === "golf") return "Golf";
  if (mode === "both") return "Athletic performance";
  return "Not shared";
}

function getActivityLabel(type: LiveActivity["activity_type"]) {
  if (type === "course") return "On the course";
  if (type === "practice") return "Practicing";
  if (type === "available") return "Available";
  return "At the gym";
}
