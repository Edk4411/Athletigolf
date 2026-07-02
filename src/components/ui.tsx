import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "golf" | "gym" | "gold" | "pulse";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-dark text-white hover:bg-steel",
    secondary: "border border-line bg-panel text-ink hover:border-steel/25 hover:bg-white",
    danger: "bg-danger text-white hover:bg-danger/90",
    ghost: "text-muted hover:bg-steel/5 hover:text-ink",
    golf: "bg-golf text-white hover:bg-golf/90",
    gym: "bg-lab text-white hover:bg-lab/90",
    gold: "bg-gold text-dark hover:bg-gold/90",
    pulse: "bg-pulse text-white hover:bg-pulse/90",
  };

  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
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
      className={cn("rounded-xl border border-line bg-panel p-5 shadow-sm", className)}
      {...props}
    />
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  tone = "text-dark",
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  tone?: string;
}) {
  return (
    <div className="mb-7 flex flex-col gap-5 border-b border-line/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <p className={cn("mb-3 text-xs font-bold uppercase tracking-[0.2em]", tone)}>
          {eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-dark md:text-[2.65rem]">{title}</h1>
        {description && <p className="mt-3 text-base leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  tone = "bg-panel text-dark",
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: string;
}) {
  return (
    <Card className={cn("min-h-[116px]", tone)}>
      <p className="text-sm font-medium opacity-65">{label}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">{value}</h2>
      {sub && <p className="mt-2 text-sm opacity-65">{sub}</p>}
    </Card>
  );
}

export function Surface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn("rounded-xl border border-line bg-panel p-5 shadow-sm", className)}
      {...props}
    />
  );
}

export function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-muted">{eyebrow}</p>}
        <h2 className="text-xl font-semibold tracking-tight text-dark">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-white/55 p-8 text-center">
      <h3 className="text-lg font-semibold text-dark">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        onClick={onCancel}
        aria-label={cancelLabel}
      />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-line bg-panel p-6 shadow-2xl">
        <h2 className="text-2xl font-semibold text-dark">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-2 block text-sm font-medium text-muted">{children}</label>;
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none transition placeholder:text-muted/60 focus:border-pulse/50 focus:ring-4 focus:ring-pulse/10",
        className
      )}
      {...props}
    />
  );
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none transition placeholder:text-muted/60 focus:border-pulse/50 focus:ring-4 focus:ring-pulse/10",
        className
      )}
      {...props}
    />
  );
}

export function SelectInput({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-lg border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-pulse/50 focus:ring-4 focus:ring-pulse/10 disabled:bg-black/5 disabled:text-black/35",
        className
      )}
      {...props}
    />
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "golf" | "gym" | "gold" | "danger" | "pulse" | "dark";
}) {
  const tones = {
    neutral: "bg-steel/7 text-muted",
    golf: "bg-golf/10 text-golf",
    gym: "bg-lab/10 text-lab",
    gold: "bg-gold/15 text-dark",
    danger: "bg-danger/10 text-danger",
    pulse: "bg-pulse/10 text-pulse",
    dark: "bg-dark text-white",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}
