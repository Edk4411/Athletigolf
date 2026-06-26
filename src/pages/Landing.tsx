import heroGolf from "../assets/hero-golf.jpg";
export default function Landing() {
  return (
    <div className="min-h-screen bg-cream text-dark font-sans">
      {/* NAVBAR */}
      <nav className="w-full flex items-center justify-between px-8 py-6 border-b border-black/10">
        <h1 className="text-xl font-semibold tracking-tight">AthletiGolf</h1>

        <div className="hidden md:flex gap-8 text-sm">
          <a href="#features" className="hover:opacity-70 transition">Features</a>
          <a href="#how" className="hover:opacity-70 transition">How It Works</a>
          <a href="#plans" className="hover:opacity-70 transition">Plans</a>
        </div>

        <a
          href="/auth"
          className="bg-dark text-white px-5 py-2 rounded-full text-sm hover:scale-105 transition"
        >
          Get Started
        </a>
      </nav>

      {/* HERO */}
      <section className="grid lg:grid-cols-2 min-h-[85vh]">
        <div className="flex flex-col justify-center px-8 md:px-16 py-20">
          <p className="uppercase tracking-[0.25em] text-xs text-black/60 mb-5">
            Golf & Fitness Performance Platform
          </p>

          <h1 className="text-5xl md:text-7xl font-medium leading-none tracking-tight mb-8">
            Train Smarter.
            <br />
            Play Better.
          </h1>

          <p className="text-lg text-black/70 max-w-xl leading-relaxed mb-10">
            Track your golf performance, gym progress and athletic development all in one place.
          </p>

          <div className="flex flex-wrap gap-4">
            <a
              href="/auth"
              className="bg-dark text-white px-7 py-3 rounded-full hover:scale-105 transition"
            >
              Join Early Access
            </a>

            <a
              href="#features"
              className="border border-black/20 px-7 py-3 rounded-full hover:bg-black hover:text-white transition"
            >
              Learn More
            </a>
          </div>
        </div>

        <div className="relative overflow-hidden min-h-[50vh] lg:min-h-0">
         <img
  src={heroGolf}
  alt="Golfer hitting a shot"
  className="w-full h-full object-cover"
/>

          <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md rounded-3xl p-5 shadow-xl w-64">
            <p className="text-sm text-black/60 mb-2">Weekly Progress</p>
            <h3 className="text-3xl font-semibold">+12%</h3>
            <p className="text-sm text-black/70 mt-2">
              Strength and performance improvement this month.
            </p>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="px-8 md:px-16 py-10 grid md:grid-cols-4 gap-5 border-y border-black/10 bg-white/30">
        {[
          { title: "Workout Tracking", text: "Log lifts and monitor progression over time." },
          { title: "Golf Insights", text: "Analyse fairways, GIR, scrambling and putting." },
          { title: "Practice Logs", text: "Record range, putting and short-game sessions." },
          { title: "Practice Feedback", text: "Build smarter warm-ups and training sessions." },
        ].map((item, index) => (
          <div
  key={index}
  className="bg-white rounded-3xl p-6 shadow-sm border border-black/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
>
            <h3 className="font-semibold mb-2">{item.title}</h3>
            <p className="text-sm text-black/60 leading-relaxed">{item.text}</p>
          </div>
        ))}
      </section>

      {/* FITNESS + GOLF SECTION */}
      <section id="features" className="px-8 md:px-16 py-24 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="uppercase tracking-[0.25em] text-xs text-black/50 mb-5">Fitness First</p>
          <h2 className="text-4xl md:text-5xl font-medium leading-tight mb-6">Built for Performance</h2>
          <p className="text-black/70 leading-relaxed mb-8 text-lg">
            AthletiGolf helps users track gym workouts, training splits and strength progression while building long-term athletic performance.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {["Workout Logging", "Strength Progression", "Custom Splits", "Session History"].map((feature, index) => (
              <div key={index} className="bg-white rounded-2xl px-5 py-4 border border-black/10">
                {feature}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-2xl p-8 border border-black/5">
          <div className="flex justify-between items-center mb-8">
            <div>
              <p className="text-sm text-black/50">Bench Press</p>
              <h3 className="text-3xl font-semibold">75kg</h3>
            </div>
            <div className="text-right">
              <p className="text-sm text-black/50">Progress</p>
              <h3 className="text-3xl font-semibold">+10kg</h3>
            </div>
          </div>

          <div className="space-y-4">
            {[70, 72, 75, 74, 75].map((weight, index) => (
              <div key={index}>
                <div className="flex justify-between mb-1 text-sm">
                  <span>Week {index + 1}</span>
                  <span>{weight}kg</span>
                </div>
                <div className="h-3 bg-black/10 rounded-full overflow-hidden">
                  <div className="h-full bg-dark rounded-full" style={{ width: `${weight}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DARK SECTION */}
      <section className="bg-dark text-white px-8 md:px-16 py-24">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="uppercase tracking-[0.25em] text-xs text-white/50 mb-5">Golf Insights</p>
            <h2 className="text-4xl md:text-5xl font-medium leading-tight mb-6">
              Smarter Practice.<br />Better Rounds.
            </h2>
            <p className="text-white/70 text-lg leading-relaxed mb-8">
              AthletiGolf uses post-round feedback like fairways hit, greens in regulation, scramble rate and putting performance to identify patterns and highlight areas for improvement.
            </p>
            <p className="text-white/70 leading-relaxed">
              Rather than focusing on swing mechanics, the platform connects on-course performance to physical preparation, helping golfers build more effective warm-ups, practice routines and training plans.
            </p>
          </div>

          <div className="bg-white text-black rounded-[2rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <div>
                <p className="text-sm text-black/50">Round Analysis</p>
                <h3 className="text-3xl font-semibold">78</h3>
              </div>
              <div className="text-right">
                <p className="text-sm text-black/50">Putting Avg</p>
                <h3 className="text-3xl font-semibold">1.9</h3>
              </div>
            </div>

            <div className="space-y-5">
              {[["Fairways Hit", "64%"], ["Greens in Regulation", "58%"], ["Scramble Rate", "47%"], ["Putts Per Hole", "1.9"]].map(([label, value], index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                  <div className="h-3 bg-black/10 rounded-full overflow-hidden">
                    <div className="h-full bg-dark rounded-full" style={{ width: value }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="px-8 md:px-16 py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="uppercase tracking-[0.25em] text-xs text-black/50 mb-5">How It Works</p>
          <h2 className="text-4xl md:text-5xl font-medium mb-6">Built Around Progress</h2>
          <p className="text-black/70 text-lg leading-relaxed">
            AthletiGolf combines fitness tracking and performance feedback into one streamlined platform.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { number: "01", title: "Track", text: "Log workouts, rounds and focused practice sessions." },
            { number: "02", title: "Analyse", text: "Identify patterns in performance, consistency and progression." },
            { number: "03", title: "Improve", text: "Use your trends to decide where to focus next." },
          ].map((step, index) => (
            <div key={index} className="bg-white rounded-[2rem] p-8 border border-black/5 shadow-sm">
              <p className="text-5xl font-medium text-black/10 mb-6">{step.number}</p>
              <h3 className="text-2xl font-semibold mb-4">{step.title}</h3>
              <p className="text-black/60 leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PLANS */}
      <section id="plans" className="px-8 md:px-16 py-24 bg-white/40">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="uppercase tracking-[0.25em] text-xs text-black/50 mb-5">Memberships</p>
          <h2 className="text-4xl md:text-5xl font-medium mb-6">Choose Your Plan</h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            { name: "Strength", desc: "Fitness tracking and progression tools.", features: ["Workout logging", "Custom splits", "Progress tracking", "Session history"] },
            { name: "Performance", desc: "Golf-focused insights and practice tracking.", features: ["Round statistics", "Practice session logs", "Warm-up guidance", "Performance feedback"] },
            { name: "Complete", desc: "The planned full AthletiGolf experience.", features: ["Golf and gym tracking", "Trend reports", "Premium analytics", "Priority access"] },
          ].map((plan, index) => (
            <div
              key={index}
              className={`rounded-[2rem] p-8 border ${index === 2 ? "bg-dark text-white" : "bg-white text-black"} shadow-lg`}
            >
              <h3 className="text-3xl font-semibold mb-3">{plan.name}</h3>
              <p className={`mb-8 leading-relaxed ${index === 2 ? "text-white/70" : "text-black/60"}`}>{plan.desc}</p>

              <div className="space-y-4 mb-10">
                {plan.features.map((feature, fi) => (
                  <div key={fi} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${index === 2 ? "bg-white" : "bg-dark"}`} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <a
                href="/auth"
                className={`block w-full py-3 rounded-full text-center transition ${index === 2 ? "bg-white text-black hover:bg-white/90" : "bg-dark text-white hover:opacity-90"}`}
              >
                Get Started
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-8 md:px-16 py-10 border-t border-black/10 flex flex-col md:flex-row justify-between gap-6">
        <div>
          <h3 className="text-xl font-semibold mb-2">AthletiGolf</h3>
          <p className="text-black/60 max-w-md">
            Performance-focused fitness and golf insights designed to help users train smarter and improve consistently.
          </p>
        </div>
        <div className="flex gap-8 text-sm text-black/60">
          <a href="#">Instagram</a>
          <a href="#">Pricing</a>
          <a href="#">Features</a>
          <a href="#">Contact</a>
        </div>
      </footer>
    </div>
  );
}
