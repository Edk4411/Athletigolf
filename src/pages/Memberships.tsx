export default function Memberships() {
  const plans = [
    {
      name: "Free",
      price: "GBP 0",
      tag: "Start tracking",
      description: "Basic tools to track your golf and gym progress.",
      features: [
        "Round tracking",
        "Workout tracking",
        "Basic analytics",
        "Profile overview",
      ],
      highlighted: false,
    },
    {
      name: "Pro",
      price: "GBP 4.99",
      tag: "Most popular",
      description: "Unlock the full AthletiGolf performance experience.",
      features: [
        "Advanced analytics",
        "AthletiGolf insights",
        "Gym-to-golf performance links",
        "Trend tracking",
        "AI recommendations",
        "Future premium features",
      ],
      highlighted: true,
    },
    {
      name: "Elite",
      price: "Coming Soon",
      tag: "For serious players",
      description: "Built for competitive golfers wanting deeper support.",
      features: [
        "Custom training plans",
        "Advanced golf reports",
        "Coach sharing",
        "Competition prep tools",
      ],
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-cream p-8 md:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 max-w-3xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
            Memberships
          </p>

          <h1 className="mb-4 text-5xl font-semibold">
            Unlock the full AthletiGolf experience
          </h1>

          <p className="text-lg leading-relaxed text-black/60">
            Start with free tracking, then upgrade when you want deeper
            analytics, smarter insights and more personalised golf and gym
            performance tools.
          </p>
        </div>

        <section className="grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-[2rem] p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                plan.highlighted
                  ? "bg-slate-950 text-white border border-[#D4AF37]/40"
                  : "bg-white text-black border border-black/5"
              }`}
            >
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-3xl font-semibold">{plan.name}</h2>

                <span
                  className={`rounded-full px-4 py-2 text-xs font-medium ${
                    plan.highlighted
                      ? "bg-[#D4AF37]/15 text-[#D4AF37]"
                      : "bg-cream text-black/60"
                  }`}
                >
                  {plan.tag}
                </span>
              </div>

              <div className="mb-6">
                <p
                  className={`mb-2 text-sm ${
                    plan.highlighted ? "text-white/50" : "text-black/50"
                  }`}
                >
                  From
                </p>

                <h3 className="text-5xl font-semibold">
                  {plan.price}
                  {plan.price !== "Coming Soon" && (
                    <span
                      className={`text-lg font-normal ${
                        plan.highlighted ? "text-white/50" : "text-black/50"
                      }`}
                    >
                      /month
                    </span>
                  )}
                </h3>
              </div>

              <p
                className={`mb-8 leading-relaxed ${
                  plan.highlighted ? "text-white/70" : "text-black/60"
                }`}
              >
                {plan.description}
              </p>

              <div className="mb-8 space-y-4">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-sm ${
                        plan.highlighted
                          ? "bg-[#D4AF37]/15 text-[#D4AF37]"
                          : "bg-black/5 text-black/60"
                      }`}
                    >
                      Check
                    </span>
                    <p
                      className={
                        plan.highlighted ? "text-white/80" : "text-black/70"
                      }
                    >
                      {feature}
                    </p>
                  </div>
                ))}
              </div>

              <button
                className={`w-full rounded-2xl px-6 py-4 font-semibold transition ${
                  plan.highlighted
                    ? "bg-[#D4AF37] text-slate-950 hover:bg-[#c29c2f]"
                    : "bg-slate-950 text-white hover:bg-slate-800"
                }`}
              >
                {plan.price === "Coming Soon" ? "Coming Soon" : "Choose Plan"}
              </button>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-[2rem] bg-white p-8 shadow-sm border border-black/5">
          <p className="mb-3 text-sm uppercase tracking-[0.25em] text-black/40">
            Why Pro?
          </p>

          <h2 className="mb-4 text-3xl font-semibold">
            Built around the link between gym work and golf performance.
          </h2>

          <p className="max-w-4xl text-lg leading-relaxed text-black/60">
            AthletiGolf Pro is designed to show how your training affects your
            golf. Over time, it will help connect things like leg training,
            recovery, strength progress and practice habits to scoring average,
            driving distance and handicap movement.
          </p>
        </section>
      </div>
    </div>
  );
}
