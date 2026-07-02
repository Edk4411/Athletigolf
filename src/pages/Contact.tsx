import { useState } from "react";
import { Bug, Lightbulb, MessageSquare, Send } from "lucide-react";
import { Button, FieldLabel, PageHeader, SelectInput, Surface, TextArea, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";

const categoryOptions = [
  { value: "feedback", label: "General feedback", icon: MessageSquare },
  { value: "bug", label: "Bug report", icon: Bug },
  { value: "feature", label: "Feature idea", icon: Lightbulb },
  { value: "confusing", label: "Confusing screen", icon: MessageSquare },
];

export default function Contact() {
  const [category, setCategory] = useState("feedback");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [deviceContext, setDeviceContext] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function submitFeedback(event: React.FormEvent) {
    event.preventDefault();
    setStatus("idle");
    setErrorMessage("");

    if (!title.trim() || !message.trim()) {
      setStatus("error");
      setErrorMessage("Add a short title and the detail before sending.");
      return;
    }

    setSaving(true);
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase.from("feedback_reports").insert({
      user_id: authData.user?.id,
      category,
      title: title.trim(),
      message: message.trim(),
      page_url: pageUrl.trim() || null,
      device_context: deviceContext.trim() || null,
    });
    setSaving(false);

    if (error) {
      setStatus("error");
      setErrorMessage(error.message || "Could not send feedback.");
      return;
    }

    setTitle("");
    setMessage("");
    setPageUrl("");
    setDeviceContext("");
    setCategory("feedback");
    setStatus("success");
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-5 text-ink md:px-8 md:py-7">
      <PageHeader
        eyebrow="Support"
        title="Send feedback"
        description="Report bugs, confusing flows, or feature ideas while they are fresh. Alpha notes go straight into the admin inbox."
        tone="text-pulse"
      />

      <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          {categoryOptions.map((item) => {
            const Icon = item.icon;
            const selected = category === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setCategory(item.value)}
                className={`flex w-full items-start gap-3 rounded-xl border p-5 text-left transition ${
                  selected
                    ? "border-pulse bg-pulse/10 text-dark"
                    : "border-line bg-panel text-muted hover:border-pulse/35 hover:text-dark"
                }`}
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pulse/10 text-pulse">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold">{item.label}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">
                    {getCategoryDetail(item.value)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <Surface>
          <form onSubmit={submitFeedback} className="grid gap-5">
            <div>
              <FieldLabel>Feedback type</FieldLabel>
              <SelectInput value={category} onChange={(event) => setCategory(event.target.value)}>
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </div>

            <Field label="Short title" value={title} onChange={setTitle} placeholder="Practice history view button missing notes" />

            <div>
              <FieldLabel>What happened?</FieldLabel>
              <TextArea
                rows={7}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="What were you trying to do, what happened, and what did you expect instead?"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Page or screen" value={pageUrl} onChange={setPageUrl} placeholder="/golf/practice-history" />
              <Field label="Device" value={deviceContext} onChange={setDeviceContext} placeholder="iPhone, laptop, Edge..." />
            </div>

            {status === "success" && (
              <div className="rounded-xl border border-golf/20 bg-golf/10 p-4 text-sm font-semibold text-golf">
                Feedback sent. Thank you, this is now in the admin inbox.
              </div>
            )}

            {status === "error" && (
              <div className="rounded-xl border border-danger/25 bg-danger/10 p-4 text-sm font-semibold text-danger">
                {errorMessage}
              </div>
            )}

            <Button type="submit" variant="pulse" disabled={saving}>
              <Send className="h-4 w-4" />
              {saving ? "Sending..." : "Send Feedback"}
            </Button>
          </form>
        </Surface>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <TextInput value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function getCategoryDetail(category: string) {
  if (category === "bug") return "Something breaks, fails to save, or behaves differently than expected.";
  if (category === "feature") return "A new idea that would make AthletiGolf more useful.";
  if (category === "confusing") return "A screen, label, or flow that does not make sense quickly.";
  return "General notes about the app experience.";
}
