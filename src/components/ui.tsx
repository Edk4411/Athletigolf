import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-slate-950 text-white hover:bg-slate-800",
    secondary: "border border-black/10 bg-white text-black hover:bg-black/5",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-black/55 hover:bg-black/5 hover:text-black",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm",
        className
      )}
      {...props}
    />
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  tone = "text-slate-950",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  tone?: string;
}) {
  return (
    <div className="mb-12 max-w-3xl">
      <p className={cn("mb-4 text-xs font-semibold uppercase tracking-[0.25em]", tone)}>
        {eyebrow}
      </p>
      <h1 className={cn("mb-4 text-5xl font-semibold", tone)}>{title}</h1>
      {description && <p className="text-lg leading-relaxed text-black/60">{description}</p>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  tone = "bg-slate-950 text-white",
}: {
  label: string;
  value: ReactNode;
  tone?: string;
}) {
  return (
    <Card className={cn("transition-all duration-300 hover:-translate-y-1 hover:shadow-xl", tone)}>
      <p className="mb-3 text-sm opacity-65">{label}</p>
      <h2 className="text-4xl font-semibold">{value}</h2>
    </Card>
  );
}
