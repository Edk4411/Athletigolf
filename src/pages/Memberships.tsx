import { useMemo, useState } from "react";
import { Check, Clock, Star } from "lucide-react";
import { Button, PageHeader, Surface } from "@/components/ui";

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
          description: "Core tracking for rounds, practice and training sessions.",
        features: [
          "Round tracking",
          "Training console",
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
          "Training-to-golf consistency reports",
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
    <main className="min-h-screen bg-cream px-4 py-5 md:px-8 md:py-7">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Membership OS"
          title="Choose your performance layer"
          description="Start with live tracking, then unlock deeper reports as AthletiGolf grows into a full training intelligence platform."
          tone="text-pulse"
        />

        <section className="grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.name;

            return (
              <Surface
                key={plan.name}
                className={`transition hover:-translate-y-1 hover:shadow-xl ${
                  plan.highlighted
                    ? "border-pulse/30 bg-dark text-white"
                    : "text-dark"
                } ${isSelected ? "ring-2 ring-pulse" : ""}`}
              >
                <div className="mb-8 flex items-center justify-between gap-4">
                  <h2 className="text-3xl font-semibold">{plan.name}</h2>

                  <span
                    className={`rounded-full px-4 py-2 text-xs font-medium ${
                      plan.highlighted
                        ? "bg-pulse/15 text-pulse"
                        : "bg-steel/8 text-muted"
                    }`}
                  >
                    {plan.tag}
                  </span>
                </div>

                <div className="mb-6">
                  <p
                    className={`mb-2 text-sm ${
                      plan.highlighted ? "text-white/50" : "text-muted"
                    }`}
                  >
                    From
                  </p>

                  <h3 className="text-5xl font-semibold">
                    {plan.price}
                    {plan.price !== "Coming Soon" && (
                      <span
                        className={`text-lg font-normal ${
                          plan.highlighted ? "text-white/50" : "text-muted"
                        }`}
                      >
                        /month
                      </span>
                    )}
                  </h3>
                </div>

                <p
                  className={`mb-8 leading-relaxed ${
                    plan.highlighted ? "text-white/70" : "text-muted"
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
                            ? "bg-pulse/15 text-pulse"
                            : "bg-steel/8 text-muted"
                        }`}
                      >
                        <Check className="h-4 w-4" />
                      </span>
                      <p
                        className={
                          plan.highlighted ? "text-white/80" : "text-muted"
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
                    plan.highlighted ? "w-full" : "w-full"
                  }
                  variant={plan.highlighted ? "pulse" : "primary"}
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
              </Surface>
            );
          })}
        </section>

        <section className="mt-8 rounded-lg border border-pulse/20 bg-pulse/10 px-5 py-4 text-sm font-medium text-dark">
          {message}
        </section>

        <Surface className="mt-12 bg-dark text-white">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-pulse">
            Why Pro?
          </p>

          <h2 className="mb-4 text-3xl font-semibold">
            Built around the link between gym consistency and golf performance.
          </h2>

          <p className="max-w-4xl text-lg leading-relaxed text-white/65">
            AthletiGolf Pro will focus on stronger reporting: how often you train,
            how your rounds trend, and which habits appear alongside better scoring.
          </p>
        </Surface>
      </div>
    </main>
  );
}
