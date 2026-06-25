import { useEffect, useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";

type PracticeSession = {
  id: string;
  practice_type: string;
  duration_minutes: number;
  focus_area: string | null;
  rating: number | null;
  notes: string | null;
  created_at: string;
};

export default function PracticeHistory() {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("practice_sessions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) setError(error.message);
      else setSessions(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const deleteSession = async (id: string) => {
    const { error } = await supabase
      .from("practice_sessions")
      .delete()
      .eq("id", id);

    if (!error) setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const totalSessions = sessions.length;
  const puttingSessions = sessions.filter((s) => s.practice_type === "Putting").length;
  const rangeSessions = sessions.filter((s) => s.practice_type === "Driving Range").length;
  const shortGameSessions = sessions.filter(
    (s) => s.practice_type === "Chipping" || s.practice_type === "Short Game"
  ).length;

  return (
    <div className="min-h-screen bg-[#f7f3ea] text-[#101010] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <Link href="/dashboard">
              <button className="text-sm text-black/50 hover:text-black mb-4">
                Back to Dashboard
              </button>
            </Link>

            <h1 className="text-5xl font-semibold tracking-tight mb-3">
              Practice History
            </h1>
            <p className="text-black/60">
              See your recent golf practice and track consistency.
            </p>
          </div>

          <Link href="/golf/practice">
            <button className="bg-[#1f4d3a] text-white px-6 py-3 rounded-full font-medium hover:bg-[#17392b] transition">
              + Log Practice
            </button>
          </Link>
        </div>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Sessions", value: totalSessions },
            { label: "Putting", value: puttingSessions },
            { label: "Range", value: rangeSessions },
            { label: "Short Game", value: shortGameSessions },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-[2rem] p-6 shadow-sm border border-black/5"
            >
              <p className="text-black/50 text-sm mb-2">{stat.label}</p>
              <h2 className="text-4xl font-semibold">{stat.value}</h2>
            </div>
          ))}
        </section>

        {loading ? (
          <div className="bg-white rounded-[2rem] p-10 text-center shadow-sm border border-black/5">
            <p className="text-black/50">Loading sessions...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-[2rem] p-10 text-center shadow-sm border border-red-100">
            <p className="text-red-600">{error}</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-10 text-center shadow-sm border border-black/5">
            <h2 className="text-3xl font-semibold mb-3">
              No practice sessions yet
            </h2>
            <p className="text-black/60 mb-6">
              Log your first session to start building your practice history.
            </p>

            <Link href="/golf/practice">
              <button className="bg-[#1f4d3a] text-white px-6 py-3 rounded-full font-medium hover:bg-[#17392b] transition">
                Log Practice
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-5">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-[2rem] p-6 shadow-sm border border-black/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div>
                    <p className="text-black/50 text-sm mb-2">
                      {new Date(session.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <h2 className="text-3xl font-semibold mb-2">
                      {session.practice_type}
                    </h2>
                    {session.focus_area && (
                      <p className="text-black/60">
                        Focus: {session.focus_area}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 min-w-[260px]">
                    <div className="bg-[#f7f3ea] rounded-2xl p-4">
                      <p className="text-black/50 text-sm">Duration</p>
                      <p className="text-xl font-semibold">{session.duration_minutes} min</p>
                    </div>

                    <div className="bg-[#f7f3ea] rounded-2xl p-4">
                      <p className="text-black/50 text-sm">Rating</p>
                      <p className="text-xl font-semibold">
                        {session.rating ? `${session.rating}/10` : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {session.notes && (
                  <div className="mt-5 bg-[#f7f3ea] rounded-2xl p-4">
                    <p className="text-black/50 text-sm mb-1">Notes</p>
                    <p className="text-black/70">{session.notes}</p>
                  </div>
                )}

                <button
                  onClick={() => deleteSession(session.id)}
                  className="mt-5 text-sm text-red-500 hover:text-red-700 transition"
                >
                  Delete Session
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
