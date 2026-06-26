import heroGolf from "../assets/hero-golf.jpg";

const modules = [
  { label: "Golf Form", value: "Score, GIR, scrambling, putting" },
  { label: "Performance Lab", value: "Strength, sessions, weekly load" },
  { label: "Practice System", value: "Range, short game, putting work" },
];

const features = [
  "Round scorecards",
  "Hole-by-hole review",
  "Training console",
  "Weekly training board",
  "Practice history",
  "Performance reports",
];

export default function Landing() {
  return (
    <main className="min-h-screen bg-cream text-ink">
      <nav className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-dark/90 px-4 py-3 text-white backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <a href="/" className="text-lg font-semibold tracking-tight">AthletiGolf</a>
          <div className="hidden items-center gap-7 text-sm text-white/65 md:flex">
            <a href="#system" className="transition hover:text-white">System</a>
            <a href="#modules" className="transition hover:text-white">Modules</a>
            <a href="#plans" className="transition hover:text-white">Plans</a>
          </div>
          <a href="/auth" className="rounded-lg bg-pulse px-4 py-2 text-sm font-semibold text-dark transition hover:bg-pulse/85">
            Enter OS
          </a>
        </div>
      </nav>

      <section className="relative min-h-[92vh] overflow-hidden bg-dark pt-16 text-white">
        <img src={heroGolf} alt="Golfer hitting a shot" className="absolute inset-0 h-full w-full object-cover opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-r from-dark via-dark/82 to-dark/20" />
        <div className="relative mx-auto flex min-h-[calc(92vh-4rem)] max-w-7xl flex-col justify-center px-4 py-20 md:px-8">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-pulse">Golf x athletic performance</p>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[0.98] md:text-7xl">
            AthletiGolf Performance OS
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            A sharper way to track rounds, practice, strength work and the habits that move your game.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="/auth" className="rounded-lg bg-pulse px-6 py-3 font-semibold text-dark transition hover:bg-pulse/85">
              Start Tracking
            </a>
            <a href="#system" className="rounded-lg border border-white/15 bg-white/8 px-6 py-3 font-semibold text-white transition hover:bg-white/14">
              View System
            </a>
          </div>

          <div className="mt-12 grid max-w-3xl gap-3 sm:grid-cols-3">
            {modules.map((module) => (
              <div key={module.label} className="rounded-lg border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.16em] text-white/45">{module.label}</p>
                <p className="mt-3 text-sm font-semibold text-white/85">{module.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="system" className="px-4 py-16 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-lab">Command center</p>
            <h2 className="text-4xl font-semibold text-dark">Built like a daily performance workspace.</h2>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              AthletiGolf is moving beyond basic logs into a connected product for golfers who train with intent.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature} className="rounded-lg border border-line bg-panel p-5 shadow-sm">
                <span className="mb-4 block h-1.5 w-10 rounded-full bg-pulse" />
                <p className="font-semibold text-dark">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="modules" className="bg-dark px-4 py-16 text-white md:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3">
          {[
            ["Golf Form", "Review scoring, greens, fairways, short game and putting in one clean flow."],
            ["Performance Lab", "Plan training days, log work quickly and watch strength trends build."],
            ["Insight Layer", "Turn the relationship between training and golf stats into clear next actions."],
          ].map(([title, text]) => (
            <article key={title} className="rounded-xl border border-white/10 bg-white/8 p-7">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-pulse">Module</p>
              <h3 className="text-2xl font-semibold">{title}</h3>
              <p className="mt-4 leading-relaxed text-white/62">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="plans" className="px-4 py-16 md:px-8">
        <div className="mx-auto max-w-7xl rounded-xl border border-line bg-panel p-8 shadow-sm md:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-pulse">Early access</p>
          <div className="mt-4 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <h2 className="text-4xl font-semibold text-dark">Start with the tracking core.</h2>
              <p className="mt-4 max-w-3xl text-muted">
                Payments and premium analytics can sit on top later. The product already needs the daily workflow to feel serious.
              </p>
            </div>
            <a href="/auth" className="rounded-lg bg-dark px-6 py-3 text-center font-semibold text-white transition hover:-translate-y-0.5">
              Create Account
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
