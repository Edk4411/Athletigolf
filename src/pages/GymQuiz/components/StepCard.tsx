import type { ReactNode } from "react";

interface StepCardProps {
  eyebrow: string;
  title: string;
  detail: string;
  children: ReactNode;
}

export default function StepCard({ eyebrow, title, detail, children }: StepCardProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
      <div className="rounded-xl border border-pulse/20 bg-pulse/10 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-pulse">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-dark">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{detail}</p>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}
