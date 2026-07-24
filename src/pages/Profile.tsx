import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Activity, Dumbbell, Edit3, Flag, LogOut, Target, X } from "lucide-react";
import { Button, FieldLabel, StatCard, Surface, TextInput } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { formatAverage, formatPercent, getGolfStats } from "@/lib/golfStats";
import { getTrainingIntelligence } from "@/lib/insights";
import { supabase } from "@/lib/supabase";
import type { Profile, Round, Workout } from "@/lib/types";
import { getDisplayName } from "@/lib/nameFormatting";
import { isValidUsername, normalizeUsername, usernameRules } from "@/lib/usernames";

export default function Profile() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editHandicap, setEditHandicap] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editHomeCourse, setEditHomeCourse] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: profileData }, { data: roundsData }, { data: workoutsData }] = await Promise.all([
      supabase.from("profiles").select("*").maybeSingle(),
      supabase.from("rounds").select("*").order("created_at", { ascending: false }),
      supabase.from("workouts").select("*").order("created_at", { ascending: false }),
    ]);

    setProfile(profileData as Profile | null);
    setRounds((roundsData as Round[]) || []);
    setWorkouts((workoutsData as Workout[]) || []);
    setLoading(false);
  };

  const openEditor = () => {
    setSaveError("");
    setEditName(profile?.full_name || "");
    setEditUsername(profile?.username || user?.user_metadata?.username || "");
    setEditAge(profile?.age?.toString() || "");
    setEditHeight(profile?.height || "");
    setEditWeight(profile?.weight || "");
    setEditHandicap(profile?.golf_handicap?.toString() || "");
    setEditAvatarUrl(profile?.avatar_url || "");
    setEditBio(profile?.bio || "");
    setEditHomeCourse(profile?.home_course || "");
    setEditing(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    setSaveError("");
    const cleanUsername = normalizeUsername(editUsername);
    if (!isValidUsername(cleanUsername)) {
      setSaveError(usernameRules);
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("profiles").upsert({
      id: user?.id,
      full_name: editName || null,
      username: cleanUsername,
      username_search: cleanUsername,
      age: editAge ? Number(editAge) : null,
      height: editHeight || null,
      weight: editWeight || null,
      golf_handicap: editHandicap ? Number(editHandicap) : null,
      avatar_url: editAvatarUrl || null,
      bio: editBio || null,
      home_course: editHomeCourse || null,
    });
    setSaving(false);

    if (error) {
      setSaveError(error.message.includes("username") ? "That username is taken. Try another one." : error.message);
      return;
    }

    setEditing(false);
    await loadData();
  };

  const name = profile?.full_name || user?.user_metadata?.username || user?.email?.split("@")[0] || "Athlete";
  const username = profile?.username || user?.user_metadata?.username || "";
  const initial = name.charAt(0).toUpperCase();
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : "New Member";
  const golfStats = getGolfStats(rounds);
  const training = getTrainingIntelligence(workouts);
  const totalTrainingVolume = Math.round(training.totalVolume);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-lg text-muted">Loading athlete profile...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-5 text-ink md:px-8 md:py-7">
      <div className="mx-auto max-w-7xl">
        <section className="mb-5 overflow-hidden rounded-2xl border border-white/10 bg-dark text-white shadow-sm">
          <div className="grid gap-6 p-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <ProfileAvatar src={profile?.avatar_url} name={name} size="large" />

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-pulse">Athlete Profile</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">{getDisplayName(profile)}</h1>
              <div className="mt-4 flex flex-wrap gap-2">
                <ProfilePill>{rounds.length} rounds</ProfilePill>
                <ProfilePill>{workouts.length} training sessions</ProfilePill>
                {username && <ProfilePill>@{username}</ProfilePill>}
                <ProfilePill>Member since {memberSince}</ProfilePill>
                <ProfilePill>Handicap {profile?.golf_handicap ?? "-"}</ProfilePill>
                {profile?.home_course && <ProfilePill>{profile.home_course}</ProfilePill>}
              </div>
              {profile?.bio && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/68">{profile.bio}</p>}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
              <Button variant="secondary" onClick={openEditor} className="border-white/15 bg-white/10 text-white hover:bg-white/15">
                <Edit3 className="h-4 w-4" />Edit Profile
              </Button>
              <Button variant="ghost" onClick={signOut} className="text-white/70 hover:bg-white/10 hover:text-white">
                <LogOut className="h-4 w-4" />Sign Out
              </Button>
            </div>
          </div>
        </section>

        <section className="mb-5 grid gap-4 md:grid-cols-4">
          <StatCard label="Avg Score" value={formatAverage(golfStats.avgScore)} />
          <StatCard label="FIR" value={formatPercent(golfStats.avgFairwayPercent)} />
          <StatCard label="GIR" value={formatPercent(golfStats.avgGirPercent)} />
          <StatCard label="Training Volume" value={`${totalTrainingVolume} kg`} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-5">
            <Surface>
              <div className="mb-5 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pulse/10 text-pulse">
                  <Activity className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Details</p>
                  <h2 className="text-xl font-semibold text-dark">Athlete record</h2>
                </div>
              </div>
              <div className="space-y-3">
                <DetailRow label="Age" value={profile?.age?.toString() || "-"} />
                <DetailRow label="Username" value={username ? `@${username}` : "-"} />
                <DetailRow label="Height" value={profile?.height || "-"} />
                <DetailRow label="Weight" value={profile?.weight || "-"} />
                <DetailRow label="Golf Handicap" value={profile?.golf_handicap?.toString() || "-"} />
                <DetailRow label="Home Course" value={profile?.home_course || "-"} />
              </div>
            </Surface>

            <Surface className="bg-dark text-white">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-pulse">Current Focus</p>
              <h2 className="mt-2 text-2xl font-semibold">{getProfileFocus(rounds, workouts)}</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/65">
                {rounds.length === 0
                  ? "Start with one round so AthletiGolf can build the first golf profile."
                  : "Keep golf and training logs consistent so profile trends get sharper over time."}
              </p>
            </Surface>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Surface>
              <div className="mb-5 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-golf/10 text-golf">
                  <Flag className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Golf</p>
                  <h2 className="text-xl font-semibold text-dark">Scoring profile</h2>
                </div>
              </div>
              <div className="space-y-4">
                <ProfileMeter label="Rounds" value={`${rounds.length}`} width={`${Math.min(rounds.length * 10, 100)}%`} tone="bg-golf" />
                <ProfileMeter label="Average Score" value={formatAverage(golfStats.avgScore)} width="70%" tone="bg-golf" />
                <ProfileMeter label="Scramble Rate" value={formatPercent(golfStats.avgScramblePercent)} width={formatPercent(golfStats.avgScramblePercent)} tone="bg-gold" />
                <ProfileMeter label="Avg Drive" value={golfStats.avgDrivingDistance === null ? "-" : `${Math.round(golfStats.avgDrivingDistance)} yd`} width="55%" tone="bg-pulse" />
              </div>
            </Surface>

            <Surface>
              <div className="mb-5 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-lab/10 text-lab">
                  <Dumbbell className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Training</p>
                  <h2 className="text-xl font-semibold text-dark">Performance profile</h2>
                </div>
              </div>
              <div className="space-y-4">
                <ProfileMeter label="Sessions" value={`${workouts.length}`} width={`${Math.min(workouts.length * 10, 100)}%`} tone="bg-lab" />
                <ProfileMeter label="Recent Volume" value={`${totalTrainingVolume} kg`} width="65%" tone="bg-lab" />
                <ProfileMeter label="Top Muscle" value={training.topMuscle?.muscle || "-"} width="55%" tone="bg-pulse" />
                <ProfileMeter label="Recent PR" value={training.recentPr ? `${training.recentPr.name} ${training.recentPr.weight}kg` : "-"} width="45%" tone="bg-gold" />
              </div>
            </Surface>

            <Surface className="lg:col-span-2">
              <div className="mb-5 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15 text-gold">
                  <Target className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Readiness</p>
                  <h2 className="text-xl font-semibold text-dark">Profile completeness</h2>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Readiness label="Personal details" complete={!!profile?.height && !!profile?.weight && !!profile?.age} />
                <Readiness label="Golf baseline" complete={rounds.length >= 3} />
                <Readiness label="Training baseline" complete={workouts.length >= 3} />
              </div>
            </Surface>
          </div>
        </section>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button onClick={() => setEditing(false)} className="absolute inset-0 bg-black/50" aria-label="Close profile editor" />
          <aside className="relative z-10 h-full w-full max-w-xl overflow-y-auto border-l border-line bg-panel p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4 border-b border-line pb-5">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-pulse">Edit Profile</p>
                <h2 className="text-3xl font-semibold tracking-tight text-dark">Your details</h2>
              </div>
              <button onClick={() => setEditing(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-steel/10 hover:text-dark" aria-label="Close profile editor">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <Field label="Full Name" value={editName} onChange={setEditName} placeholder="Enter your name" />
              <div>
                <Field label="Username" value={editUsername} onChange={(value) => setEditUsername(normalizeUsername(value))} placeholder="your_username" />
                <p className="mt-2 text-xs text-muted">{usernameRules}</p>
              </div>
              <Field label="Profile Picture URL" value={editAvatarUrl} onChange={setEditAvatarUrl} placeholder="https://..." />
              <Field label="Home Course" value={editHomeCourse} onChange={setEditHomeCourse} placeholder="Your home club or course" />
              <TextAreaField label="Bio" value={editBio} onChange={setEditBio} placeholder="Tell friends what you are working on..." />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Age" type="number" value={editAge} onChange={setEditAge} placeholder="25" />
                <Field label="Golf Handicap" type="number" value={editHandicap} onChange={setEditHandicap} placeholder="12.4" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Height" value={editHeight} onChange={setEditHeight} placeholder="180cm" />
                <Field label="Weight" value={editWeight} onChange={setEditWeight} placeholder="80kg" />
              </div>
            </div>

            {saveError && (
              <div className="mt-5 rounded-xl border border-danger/25 bg-danger/10 p-4 text-sm font-semibold text-danger">
                {saveError}
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
              <Button variant="pulse" onClick={saveProfile} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

function ProfilePill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-sm font-semibold text-white/78">
      {children}
    </span>
  );
}

function ProfileAvatar({ src, name, size = "medium" }: { src?: string | null; name: string; size?: "medium" | "large" }) {
  const sizeClass = size === "large" ? "h-24 w-24 text-4xl rounded-xl" : "h-12 w-12 text-lg rounded-lg";
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className={`${sizeClass} flex shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-white/8 font-semibold text-white`}>
      {src ? (
        <img src={src} alt={`${name} profile`} className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-line bg-steel/5 px-4 py-3">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-semibold text-dark">{value}</p>
    </div>
  );
}

function ProfileMeter({ label, value, width, tone }: { label: string; value: string; width: string; tone: string }) {
  const safeWidth = value === "-" ? "0%" : width;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <p className="font-semibold text-dark">{value}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-steel/10">
        <div className={`h-full rounded-full ${tone}`} style={{ width: safeWidth }} />
      </div>
    </div>
  );
}

function Readiness({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${complete ? "border-golf/20 bg-golf/8" : "border-gold/25 bg-gold/10"}`}>
      <p className="font-semibold text-dark">{label}</p>
      <p className="mt-1 text-sm text-muted">{complete ? "Ready" : "Needs more data"}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <TextInput type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        maxLength={240}
        className="w-full rounded-lg border border-line bg-white px-4 py-3 text-dark outline-none transition focus:border-pulse"
      />
      <p className="mt-1 text-xs text-muted">{value.length}/240</p>
    </div>
  );
}

function getProfileFocus(rounds: Round[], workouts: Workout[]) {
  if (rounds.length === 0) return "Log your first round";
  if (workouts.length === 0) return "Add training context";
  if (rounds.length < 3 || workouts.length < 3) return "Build the baseline";
  return "Maintain the performance signal";
}
