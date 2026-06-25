import { useEffect, useState } from "react";
import { Link } from "wouter";

type PracticeSession = {
  id: number;
  type: string;
  date: string;
  duration: string;
  focus: string;
  rating: string;
  notes: string;
};

export default function PracticeHistory() {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);

  useEffect(() => {
    const savedSessions = JSON.parse(localStorage.getItem("practiceSessions") || "[]");
    setSessions(savedSessions);
  }, []);

  const deleteSession = (id: number) => {
    const updated = sessions.filter((session) => session.id !== id);
    setSessions(updated);
    localStorage.setItem("practiceSessions", JSON.stringify(updated));
  };

  const totalSessions = sessions.length;
  const puttingSessions = sessions.filter((s) => s.type === "Putting").length;
  const rangeSessions = sessions.filter((s) => s.type === "Driving Range").length;
  const shortGameSessions = sessions.filter(
    (s) => s.type === "Chipping" || s.type === "Short Game"
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

        {sessions.length === 0 ? (
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
                    <p className="text-black/50 text-sm mb-2">{session.date}</p>
                    <h2 className="text-3xl font-semibold mb-2">
                      {session.type}
                    </h2>
                    <p className="text-black/60">
                      Focus: {session.focus}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 min-w-[260px]">
                    <div className="bg-[#f7f3ea] rounded-2xl p-4">
                      <p className="text-black/50 text-sm">Duration</p>
                      <p className="text-xl font-semibold">{session.duration}</p>
                    </div>

                    <div className="bg-[#f7f3ea] rounded-2xl p-4">
                      <p className="text-black/50 text-sm">Rating</p>
                      <p className="text-xl font-semibold">{session.rating}</p>
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
                  className="mt-5 text-sm text-red-500 hover:text-red-700"
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
