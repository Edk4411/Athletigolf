import { useMemo, useState } from "react";
import { Check, Clock, Star } from "lucide-react";
import { Button, Card, PageHeader } from "@/components/ui";

type Plan = {
  name: string;
  price: string;
  tag: string;
  description: string;
  features: string[];
  highlighted: boolean;
  status: "current" | "waitlist";
};

export default function Memberships() {
  const [selectedPlan, setSelectedPlan] = useState("Free");
  const [message, setMessage] = useState("You're currently using the Free plan.");

  const plans: Plan[] = useMemo(
    () => [
      {
        name: "Free",
        price: "GBP 0",
        tag: "Current tools",
        description: "Core tracking for rounds, practice and gym sessions.",
        features: [
          "Round tracking",
          "Workout tracking",
          "Practice history",
          "Basic performance analytics",
        ],
        highlighted: false,
        status: "current",
      },
      {
        name: "Pro",
        price: "GBP 4.99",
        tag: "Waitlist open",
        description: "A planned upgrade for deeper trends and premium reporting.",
        features: [
          "Advanced trend views",
          "Gym-to-golf consistency reports",
          "Round comparison tools",
          "Priority access to new analytics",
        ],
        highlighted: true,
        status: "waitlist",
      },
      {
        name: "Elite",
        price: "Coming Soon",
        tag: "In development",
        description: "Designed for competitive golfers who want coach-ready reports.",
        features: [
          "Coach sharing",
          "Competition prep summaries",
          "Advanced golf reports",
          "Custom performance exports",
        ],
        highlighted: false,
        status: "waitlist",
      },
    ],
    []
  );

  const choosePlan = (plan: Plan) => {
    setSelectedPlan(plan.name);

    if (plan.status === "current") {
      setMessage("Free is active. You can keep using the core tracking tools.");
      return;
    }

    setMessage(
      `${plan.name} interest saved. We'll use this as the upgrade target when payments are connected.`
    );
  };

  return (
    <div className="min-h-screen bg-cream p-8 md:p-12">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Memberships"
          title="Choose how far you want to take AthletiGolf"
          description="Start with the live tracking tools, then register interest for premium reporting as the product grows."
          tone="text-[#D4AF37]"
        />

        <section className="grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.name;

            return (
              <Card
                key={plan.name}
                className={`transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  plan.highlighted
                    ? "border-[#D4AF37]/40 bg-slate-950 text-white"
                    : "text-black"
                } ${isSelected ? "ring-2 ring-[#D4AF37]" : ""}`}
              >
                <div className="mb-8 flex items-center justify-between gap-4">
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
                        className={`flex h-6 w-6 items-center justify-center rounded-full ${
                          plan.highlighted
                            ? "bg-[#D4AF37]/15 text-[#D4AF37]"
                            : "bg-black/5 text-black/60"
                        }`}
                      >
                        <Check className="h-4 w-4" />
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

                <Button
                  onClick={() => choosePlan(plan)}
                  className={
                    plan.highlighted
                      ? "w-full bg-[#D4AF37] text-slate-950 hover:bg-[#c29c2f]"
                      : "w-full"
                  }
                >
                  {plan.status === "current" ? (
                    <>
                      <Star className="h-4 w-4" />
                      Use Free
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4" />
                      Join Waitlist
                    </>
                  )}
                </Button>
              </Card>
            );
          })}
        </section>

        <section className="mt-8 rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-5 py-4 text-sm font-medium text-slate-950">
          {message}
        </section>

        <Card className="mt-12">
          <p className="mb-3 text-sm uppercase tracking-[0.25em] text-black/40">
            Why Pro?
          </p>

          <h2 className="mb-4 text-3xl font-semibold">
            Built around the link between gym consistency and golf performance.
          </h2>

          <p className="max-w-4xl text-lg leading-relaxed text-black/60">
            AthletiGolf Pro will focus on stronger reporting: how often you train,
            how your rounds trend, and which habits appear alongside better scoring.
          </p>
        </Card>
      </div>
    </div>
  );
}
