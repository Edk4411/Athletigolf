import { useState } from "react";
import { Link } from "wouter";

type PracticeType = "Driving Range" | "Putting" | "Chipping" | "Short Game" | "On Course";

type PracticeSession = {
  id: number;
  type: PracticeType;
  date: string;
  duration: string;
  focus: string;
  rating: string;
  notes: string;
};

export default function PracticeSession() {
  const [type, setType] = useState<PracticeType>("Driving Range");
  const [duration, setDuration] = useState("");
  const [focus, setFocus] = useState("");
  const [rating, setRating] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newSession: PracticeSession = {
      id: Date.now(),
      type,
      date: new Date().toLocaleDateString("en-GB"),
      duration,
      focus,
      rating,
      notes,
    };

    const oldSessions = JSON.parse(localStorage.getItem("practiceSessions") || "[]");
    localStorage.setItem("practiceSessions", JSON.stringify([newSession, ...oldSessions]));

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f7f3ea] text-[#101010] flex items-center justify-center p-6">
        <div className="bg-white rounded-[2rem] shadow-sm border border-black/5 p-10 max-w-xl w-full text-center">
          <h1 className="text-4xl font-semibold mb-4">Practice Logged</h1>
          <p className="text-black/60 mb-8">
            Nice work. Your practice session has been saved.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/golf/practice">
              <button className="bg-[#1f4d3a] text-white px-6 py-3 rounded-full font-medium hover:bg-[#17392b] transition">
                Log Another
              </button>
            </Link>

            <Link href="/golf/practice-history">
              <button className="bg-black text-white px-6 py-3 rounded-full font-medium hover:bg-black/80 transition">
                View History
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const focusOptions =
    type === "Driving Range"
      ? ["Driver", "Woods", "Long Irons", "Mid Irons", "Wedges", "Shot Shape"]
      : type === "Putting"
      ? ["Short Putts", "Lag Putting", "Green Reading", "Start Line", "Speed Control"]
      : type === "Chipping"
      ? ["Bump and Run", "Standard Chip", "Flop Shot", "Contact", "Landing Spot"]
      : type === "Short Game"
      ? ["Pitching", "Bunker Play", "Wedge Distance", "Up and Downs"]
      : ["Course Strategy", "Pre-shot Routine", "Scoring", "Shot Selection"];

  return (
    <div className="min-h-screen bg-[#f7f3ea] text-[#101010] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard">
            <button className="text-sm text-black/50 hover:text-black mb-4">
              Back to Dashboard
            </button>
          </Link>

          <h1 className="text-5xl font-semibold tracking-tight mb-3">
            Log Practice
          </h1>
          <p className="text-black/60">
            Track your range, putting, chipping and short game sessions.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-[2rem] shadow-sm border border-black/5 p-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-black/50 mb-2">
                Practice Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PracticeType)}
                className="w-full rounded-2xl border border-black/10 p-4 outline-none focus:border-[#1f4d3a]"
              >
                <option>Driving Range</option>
                <option>Putting</option>
                <option>Chipping</option>
                <option>Short Game</option>
                <option>On Course</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-black/50 mb-2">
                Duration
              </label>
              <input
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 45 mins"
                required
                className="w-full rounded-2xl border border-black/10 p-4 outline-none focus:border-[#1f4d3a]"
              />
            </div>

            <div>
              <label className="block text-sm text-black/50 mb-2">
                Focus Area
              </label>
              <select
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                required
                className="w-full rounded-2xl border border-black/10 p-4 outline-none focus:border-[#1f4d3a]"
              >
                <option value="">Select focus</option>
                {focusOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-black/50 mb-2">
                Session Rating
              </label>
              <select
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                required
                className="w-full rounded-2xl border border-black/10 p-4 outline-none focus:border-[#1f4d3a]"
              >
                <option value="">Rate session</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <option key={num}>{num}/10</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm text-black/50 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What felt good? What needs work?"
              rows={5}
              className="w-full rounded-2xl border border-black/10 p-4 outline-none focus:border-[#1f4d3a]"
            />
          </div>

          <button
            type="submit"
            className="mt-8 w-full bg-[#1f4d3a] text-white py-4 rounded-full font-medium hover:bg-[#17392b] transition"
          >
            Save Practice Session
          </button>
        </form>
      </div>
    </div>
  );
}
