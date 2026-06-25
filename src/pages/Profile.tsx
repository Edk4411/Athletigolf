import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Profile, Round, Workout } from "@/lib/types";

export default function Profile() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editHandicap, setEditHandicap] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .maybeSingle();
    setProfile(profileData as Profile | null);

    const { data: roundsData } = await supabase
      .from("rounds")
      .select("*")
      .order("created_at", { ascending: false });
    setRounds((roundsData as Round[]) || []);

    const { data: workoutsData } = await supabase
      .from("workouts")
      .select("*")
      .order("created_at", { ascending: false });
    setWorkouts((workoutsData as Workout[]) || []);

    setLoading(false);
  };

  const openEditor = () => {
    setEditName(profile?.full_name || "");
    setEditAge(profile?.age?.toString() || "");
    setEditHeight(profile?.height || "");
    setEditWeight(profile?.weight || "");
    setEditHandicap(profile?.golf_handicap?.toString() || "");
    setEditing(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user?.id,
        full_name: editName || null,
        age: editAge ? Number(editAge) : null,
        height: editHeight || null,
        weight: editWeight || null,
        golf_handicap: editHandicap ? Number(editHandicap) : null,
      });
    setSaving(false);
    if (!error) {
      setEditing(false);
      loadData();
    }
  };

  const name =
    profile?.full_name ||
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Athlete";
  const initial = name.charAt(0).toUpperCase();

  const roundsLogged = rounds.length;
  const workoutsLogged = workouts.length;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "New Member";

  const handicap = profile?.golf_handicap ?? null;

  const avgScore =
    rounds.length > 0
      ? (
          rounds.reduce((sum, r) => sum + (r.score || 0), 0) / rounds.length
        ).toFixed(1)
      : "-";

  const avgFairways =
    rounds.length > 0
      ? Math.round(
          rounds.reduce((sum, r) => sum + (r.fairways_hit || 0), 0) /
            rounds.length
        )
      : 0;

  const avgGir =
    rounds.length > 0
      ? Math.round(
          rounds.reduce((sum, r) => sum + (r.greens_in_regulation || 0), 0) /
            rounds.length
        )
      : 0;

  const avgPutts =
    rounds.length > 0
      ? (
          rounds.reduce((sum, r) => sum + (r.putts || 0), 0) / rounds.length
        ).toFixed(1)
      : "-";

  const avgScramble =
    rounds.length > 0
      ? Math.round(
          rounds.reduce((sum, r) => sum + (r.scramble_percentage || 0), 0) /
            rounds.length
        )
      : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-black/40 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream p-8 md:p-12">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="bg-dark text-white rounded-[2.5rem] p-10 mb-10 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8">
            <div className="w-32 h-32 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-4xl font-semibold">
              {initial}
            </div>
            <div className="flex-1">
              <p className="uppercase tracking-[0.25em] text-xs text-white/50 mb-4">Athlete Profile</p>
              <h1 className="text-5xl font-semibold mb-4">{name}</h1>
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="bg-white/10 px-4 py-2 rounded-full text-sm">
                  {roundsLogged} Rounds Logged
                </div>
                <div className="bg-white/10 px-4 py-2 rounded-full text-sm">
                  {workoutsLogged} Workouts Logged
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="bg-white/10 px-5 py-3 rounded-2xl text-sm">
                  Handicap {handicap ?? "-"}
                </div>
                <div className="bg-white/10 px-5 py-3 rounded-2xl text-sm">
                  Member Since {memberSince}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={openEditor}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl transition"
              >
                Edit Profile
              </button>
              <button
                onClick={signOut}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid xl:grid-cols-3 gap-8">
          {/* LEFT COLUMN */}
          <div className="space-y-8">
            {/* CONSISTENCY */}
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-black/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <h2 className="text-3xl font-semibold mb-8">Consistency</h2>
              <div className="space-y-6">
                {[
                  ["Rounds Logged", roundsLogged.toString()],
                  ["Workouts Logged", workoutsLogged.toString()],
                  ["Member Since", memberSince],
                ].map(([label, value], index) => (
                  <div key={index} className="flex items-center justify-between">
                    <p className="text-black/60">{label}</p>
                    <h3 className="text-xl font-semibold">{value}</h3>
                  </div>
                ))}
              </div>
            </div>

            {/* PERSONAL DETAILS */}
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-black/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <h2 className="text-3xl font-semibold mb-8">Personal Details</h2>
              <div className="space-y-6">
                {[
                  ["Age", profile?.age?.toString() || "-"],
                  ["Height", profile?.height || "-"],
                  ["Weight", profile?.weight || "-"],
                  ["Golf Handicap", profile?.golf_handicap?.toString() || "-"],
                ].map(([label, value], index) => (
                  <div key={index} className="bg-cream rounded-2xl px-6 py-5 flex items-center justify-between">
                    <p className="font-medium">{label}</p>
                    <h3 className="text-2xl font-semibold">{value}</h3>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="xl:col-span-2 space-y-8">
            {/* GOLF PERFORMANCE */}
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-black/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <p className="text-sm text-black/50 mb-2">Golf Performance</p>
                  <h2 className="text-4xl font-semibold">Scoring Averages</h2>
                </div>
                <div className="bg-dark text-white px-6 py-4 rounded-2xl">
                  <p className="text-sm text-white/60 mb-1">Current Handicap</p>
                  <h3 className="text-2xl font-semibold">{handicap ?? "-"}</h3>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-10">
                {[["Average Score", avgScore], ["Rounds Logged", roundsLogged.toString()], ["Workouts Logged", workoutsLogged.toString()]].map(([label, value], index) => (
                  <div key={index} className="bg-cream rounded-[2rem] p-8">
                    <p className="text-black/50 mb-3">{label}</p>
                    <h3 className="text-5xl font-semibold">{value}</h3>
                  </div>
                ))}
              </div>

              <div className="space-y-7">
                {[
                  ["Fairways Hit (avg)", `${avgFairways}`],
                  ["Greens In Regulation (avg)", `${avgGir}`],
                  ["Scramble Rate (avg)", `${avgScramble}%`],
                  ["Putting Average (avg)", avgPutts],
                ].map(([label, value], index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-3">
                      <span className="font-medium">{label}</span>
                      <span className="text-black/60">{value}</span>
                    </div>
                    <div className="h-4 bg-black/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-dark rounded-full"
                        style={{
                          width: value.includes("%")
                            ? value
                            : `${Math.min(Number(value) * 10, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PERFORMANCE FOCUS */}
            <div className="bg-dark text-white rounded-[2rem] p-8 shadow-2xl">
              <p className="uppercase tracking-[0.25em] text-xs text-white/50 mb-4">Performance Focus</p>
              <h2 className="text-4xl font-semibold mb-6">
                {rounds.length === 0
                  ? "Start Tracking Your Rounds"
                  : "Keep Building Consistency"}
              </h2>
              <p className="text-white/70 text-lg leading-relaxed mb-8">
                {rounds.length === 0
                  ? "Log your first round to start seeing personalised performance insights and trends."
                  : `You've logged ${rounds.length} rounds with an average score of ${avgScore}. Keep logging rounds and workouts to unlock deeper insights.`}
              </p>
              <div className="grid md:grid-cols-3 gap-5">
                {["Mobility Work", "Mid-Iron Practice", "Short Game Reps"].map((item, index) => (
                  <div key={index} className="bg-white/10 rounded-2xl px-5 py-6 text-center">
                    <h3 className="text-lg font-medium">{item}</h3>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            onClick={() => setEditing(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="relative z-10 w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="mb-2 text-sm uppercase tracking-[0.25em] text-black/40">
                  Edit Profile
                </p>
                <h2 className="text-3xl font-semibold">Your Details</h2>
              </div>
              <button
                onClick={() => setEditing(false)}
                className="rounded-xl px-3 py-2 text-2xl text-black/50 transition hover:bg-black/5 hover:text-black"
              >
                X
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-black/50">Full Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full rounded-2xl border border-black/10 px-5 py-4 outline-none focus:border-black"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm text-black/50">Age</label>
                  <input
                    type="number"
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    placeholder="e.g. 25"
                    className="w-full rounded-2xl border border-black/10 px-5 py-4 outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-black/50">Golf Handicap</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editHandicap}
                    onChange={(e) => setEditHandicap(e.target.value)}
                    placeholder="e.g. 12.4"
                    className="w-full rounded-2xl border border-black/10 px-5 py-4 outline-none focus:border-black"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm text-black/50">Height</label>
                  <input
                    value={editHeight}
                    onChange={(e) => setEditHeight(e.target.value)}
                    placeholder="e.g. 180cm"
                    className="w-full rounded-2xl border border-black/10 px-5 py-4 outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-black/50">Weight</label>
                  <input
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    placeholder="e.g. 80kg"
                    className="w-full rounded-2xl border border-black/10 px-5 py-4 outline-none focus:border-black"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => setEditing(false)}
                className="rounded-2xl border border-black/10 px-6 py-3 transition hover:bg-black/5"
              >
                Cancel
              </button>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="rounded-2xl bg-dark px-6 py-3 text-white transition hover:scale-[1.02] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
