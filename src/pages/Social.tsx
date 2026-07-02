import { useEffect, useMemo, useState } from "react";
import { Activity, Check, Copy, Dumbbell, Flag, MapPin, Pencil, ShieldCheck, UserPlus, Users, X } from "lucide-react";
import { Button, EmptyState, FieldLabel, PageHeader, SelectInput, Surface, TextArea, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { FriendConnection, LiveActivity, OnboardingData } from "@/lib/types";

type ActivityType = LiveActivity["activity_type"];

const activityOptions: Array<{ value: ActivityType; label: string }> = [
  { value: "gym", label: "At the gym" },
  { value: "course", label: "On the course" },
  { value: "practice", label: "Practicing" },
  { value: "available", label: "Available" },
];

export default function Social() {
  const [activities, setActivities] = useState<LiveActivity[]>([]);
  const [connections, setConnections] = useState<FriendConnection[]>([]);
  const [userId, setUserId] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("gym");
  const [locationName, setLocationName] = useState("");
  const [detail, setDetail] = useState("");
  const [visibility, setVisibility] = useState<LiveActivity["visibility"]>("friends");
  const [friendId, setFriendId] = useState("");
  const [editingFriendId, setEditingFriendId] = useState("");
  const [friendLabel, setFriendLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSocial();
  }, []);

  async function loadSocial() {
    setLoading(true);
    const [{ data: authData }, { data: active }, { data: friends }, { data: profile }] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("live_activities")
        .select("*")
        .is("ended_at", null)
        .order("started_at", { ascending: false }),
      supabase
        .from("friend_connections")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("onboarding_data").maybeSingle(),
    ]);

    setUserId(authData.user?.id || "");
    setActivities((active as LiveActivity[]) || []);
    setConnections((friends as FriendConnection[]) || []);
    const onboarding = (profile?.onboarding_data as OnboardingData | null) || null;
    setVisibility(onboarding?.privacy?.defaultLiveVisibility || "friends");
    setLoading(false);
  }

  async function startActivity(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const { error: endError } = await supabase
      .from("live_activities")
      .update({ ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .is("ended_at", null);

    if (endError) {
      setError(endError.message);
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("live_activities").insert({
      activity_type: activityType,
      location_name: locationName.trim() || null,
      detail: detail.trim() || null,
      visibility,
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setLocationName("");
    setDetail("");
    await loadSocial();
  }

  async function endActivity(id: string) {
    setSaving(true);
    setError("");
    const { error: endError } = await supabase
      .from("live_activities")
      .update({ ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id);
    setSaving(false);

    if (endError) {
      setError(endError.message);
      return;
    }

    await loadSocial();
  }

  async function sendFriendRequest(event: React.FormEvent) {
    event.preventDefault();
    const receiverId = friendId.trim();
    if (!receiverId) return;
    if (receiverId === userId) {
      setError("You cannot add yourself as a friend.");
      return;
    }

    setSaving(true);
    setError("");

    const { error: insertError } = await supabase.from("friend_connections").insert({
      receiver_id: receiverId,
      status: "pending",
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setFriendId("");
    await loadSocial();
  }

  async function updateConnection(id: string, status: FriendConnection["status"]) {
    setSaving(true);
    setError("");
    const { error: updateError } = await supabase
      .from("friend_connections")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadSocial();
  }

  async function removeConnection(id: string) {
    setSaving(true);
    setError("");
    const { error: deleteError } = await supabase
      .from("friend_connections")
      .delete()
      .eq("id", id);
    setSaving(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadSocial();
  }

  async function saveFriendLabel(connection: FriendConnection) {
    const labelColumn = connection.requester_id === userId ? "requester_label" : "receiver_label";
    setSaving(true);
    setError("");
    const { error: updateError } = await supabase
      .from("friend_connections")
      .update({ [labelColumn]: friendLabel.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", connection.id);
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setEditingFriendId("");
    setFriendLabel("");
    await loadSocial();
  }

  function startRename(connection: FriendConnection) {
    setEditingFriendId(connection.id);
    setFriendLabel(getConnectionLabel(connection, userId));
  }

  const activeActivity = activities.find((activity) => activity.user_id === userId) || null;
  const friendActivities = activities.filter((activity) => activity.user_id !== userId);
  const friendNameById = useMemo(() => {
    const names = new Map<string, string>();
    connections.forEach((connection) => {
      if (connection.status !== "accepted") return;
      const otherId = getOtherUserId(connection, userId);
      names.set(otherId, getConnectionLabel(connection, userId));
    });
    return names;
  }, [connections, userId]);
  const incomingRequests = connections.filter(
    (connection) => connection.receiver_id === userId && connection.status === "pending"
  );
  const outgoingRequests = connections.filter(
    (connection) => connection.requester_id === userId && connection.status === "pending"
  );
  const acceptedConnections = connections.filter((connection) => connection.status === "accepted");
  const acceptedCount = useMemo(
    () => connections.filter((connection) => connection.status === "accepted").length,
    [connections]
  );
  const pendingCount = useMemo(
    () => connections.filter((connection) => connection.status === "pending").length,
    [connections]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-muted">
        Loading social hub...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-5 text-ink md:px-8 md:py-7">
      <PageHeader
        eyebrow="Social"
        title="Live activity"
        description="Check in, add friends, and see who is training, practicing or on course."
        tone="text-pulse"
      />

      <section className="mb-5 grid gap-4 md:grid-cols-3">
        <SocialMetric icon={Activity} label="Current status" value={activeActivity ? getActivityLabel(activeActivity.activity_type) : "Offline"} />
        <SocialMetric icon={Users} label="Friends" value={acceptedCount} />
        <SocialMetric icon={UserPlus} label="Pending" value={pendingCount} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Surface>
          <div className="mb-5 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pulse/10 text-pulse">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Check In</p>
              <h2 className="text-xl font-semibold text-dark">Share your session</h2>
            </div>
          </div>

          <form onSubmit={startActivity} className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-4">
              {activityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setActivityType(option.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    activityType === option.value
                      ? "border-pulse bg-pulse text-white"
                      : "border-line bg-panel text-muted hover:border-pulse/30 hover:text-pulse"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div>
              <FieldLabel>Activity</FieldLabel>
              <SelectInput value={activityType} onChange={(event) => setActivityType(event.target.value as ActivityType)}>
                {activityOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </SelectInput>
            </div>
            <Field label="Location" value={locationName} onChange={setLocationName} placeholder="Gym, course, range..." />
            <div>
              <FieldLabel>Detail</FieldLabel>
              <TextArea rows={3} value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="Push day, back nine, wedge practice..." />
            </div>
            <div>
              <FieldLabel>Visibility</FieldLabel>
              <SelectInput value={visibility} onChange={(event) => setVisibility(event.target.value as LiveActivity["visibility"])}>
                <option value="friends">Friends only</option>
                <option value="private">Private log</option>
              </SelectInput>
            </div>
            {error && <p className="rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm font-semibold text-danger">{error}</p>}
            <Button type="submit" variant="pulse" disabled={saving}>
              {saving ? "Saving..." : activeActivity ? "Replace Current Check-In" : "Start Check-In"}
            </Button>
          </form>
        </Surface>

        <div className="space-y-5">
          <Surface className="bg-dark text-white">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-pulse/15 text-pulse">
                {activeActivity?.activity_type === "course" ? <Flag className="h-5 w-5" /> : <Dumbbell className="h-5 w-5" />}
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-pulse">Live Now</p>
                <h2 className="mt-2 text-3xl font-semibold">{activeActivity ? getActivityLabel(activeActivity.activity_type) : "No active check-in"}</h2>
                <p className="mt-3 text-sm leading-relaxed text-white/64">
                  {activeActivity
                    ? `${activeActivity.location_name || "Location not set"} - ${activeActivity.detail || "No extra detail"}`
                    : "When you check in, the live status will appear here first. Friend visibility can expand once the social graph is tested."}
                </p>
              </div>
            </div>
          {activeActivity && (
              <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <p className="text-sm text-white/50">
                  Started {formatRelativeTime(activeActivity.started_at)}
                  {activeActivity.expires_at ? `, expires ${formatRelativeTime(activeActivity.expires_at)}` : ""}
                </p>
                <Button type="button" variant="secondary" onClick={() => endActivity(activeActivity.id)} disabled={saving} className="border-white/15 bg-white/10 text-white hover:bg-white/15">
                  End Check-In
                </Button>
              </div>
            )}
          </Surface>

          <Surface>
            <div className="mb-5 flex items-center gap-3">
              <Users className="h-5 w-5 text-pulse" />
              <h2 className="text-xl font-semibold text-dark">Friends live feed</h2>
            </div>
            {friendActivities.length ? (
              <div className="space-y-3">
                {friendActivities.map((activity) => (
                  <ActivityRow key={activity.id} activity={activity} name={friendNameById.get(activity.user_id)} />
                ))}
              </div>
            ) : (
              <EmptyState title="No friends live right now" description="Accepted friends with friends-visible check-ins will appear here." />
            )}
          </Surface>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Surface>
          <div className="mb-5 flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-pulse" />
            <h2 className="text-xl font-semibold text-dark">Add friend</h2>
          </div>
          <div className="mb-5 rounded-xl border border-pulse/20 bg-pulse/8 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Your friend code</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold text-dark">
                {userId || "Loading..."}
              </code>
              <Button type="button" variant="secondary" onClick={() => navigator.clipboard?.writeText(userId)} disabled={!userId} className="w-full sm:w-auto">
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>
          <form onSubmit={sendFriendRequest} className="grid gap-4">
            <Field label="Friend code" value={friendId} onChange={setFriendId} placeholder="Paste their AthletiGolf friend code" />
            <p className="text-sm leading-relaxed text-muted">
              Friend codes keep this private while the app is still young. Username search can come later.
            </p>
            <Button type="submit" variant="pulse" disabled={saving || !friendId.trim()}>
              Send Request
            </Button>
          </form>
        </Surface>

        <Surface>
          <div className="mb-5 flex items-center gap-3">
            <Users className="h-5 w-5 text-pulse" />
            <h2 className="text-xl font-semibold text-dark">Friends and requests</h2>
          </div>
          {connections.length ? (
            <div className="space-y-5">
              <ConnectionSection
                title="Incoming requests"
                empty="No incoming requests."
                connections={incomingRequests}
                userId={userId}
                editingFriendId={editingFriendId}
                friendLabel={friendLabel}
                setFriendLabel={setFriendLabel}
                onRename={startRename}
                onSaveLabel={saveFriendLabel}
                onCancelRename={() => setEditingFriendId("")}
                action={(connection) => (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => updateConnection(connection.id, "accepted")} disabled={saving}>
                      <Check className="h-4 w-4" />Accept
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => removeConnection(connection.id)} disabled={saving}>
                      <X className="h-4 w-4" />Decline
                    </Button>
                  </div>
                )}
              />
              <ConnectionSection
                title="Outgoing requests"
                empty="No outgoing requests."
                connections={outgoingRequests}
                userId={userId}
                editingFriendId={editingFriendId}
                friendLabel={friendLabel}
                setFriendLabel={setFriendLabel}
                onRename={startRename}
                onSaveLabel={saveFriendLabel}
                onCancelRename={() => setEditingFriendId("")}
                action={(connection) => (
                  <Button type="button" variant="ghost" onClick={() => removeConnection(connection.id)} disabled={saving}>
                    Cancel
                  </Button>
                )}
              />
              <ConnectionSection
                title="Friends"
                empty="No accepted friends yet."
                connections={acceptedConnections}
                userId={userId}
                editingFriendId={editingFriendId}
                friendLabel={friendLabel}
                setFriendLabel={setFriendLabel}
                onRename={startRename}
                onSaveLabel={saveFriendLabel}
                onCancelRename={() => setEditingFriendId("")}
                action={(connection) => (
                  <Button type="button" variant="ghost" onClick={() => removeConnection(connection.id)} disabled={saving}>
                    Remove
                  </Button>
                )}
              />
            </div>
          ) : (
            <EmptyState title="No friend requests yet" description="The friend graph is ready, but you have not added anyone yet." />
          )}
        </Surface>
      </section>

      <section className="mt-5">
        <Surface>
          <div className="mb-5 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-pulse" />
            <h2 className="text-xl font-semibold text-dark">Privacy controls</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <PrivacyCard title="Friends-only live feed" detail="Only accepted friends can see check-ins marked friends-only." />
            <PrivacyCard title="Private mode stays private" detail="Private check-ins are saved for you without broadcasting to friends." />
            <PrivacyCard title="You control status" detail="End or replace a check-in whenever your session changes." />
          </div>
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

function SocialMetric({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-5 shadow-sm">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pulse/10 text-pulse">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-sm font-medium text-muted">{label}</p>
      <h2 className="mt-2 text-2xl font-semibold text-dark">{value}</h2>
    </div>
  );
}

function PrivacyCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/70 p-4">
      <h3 className="font-semibold text-dark">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{detail}</p>
    </div>
  );
}

function ActivityRow({ activity, name }: { activity: LiveActivity; name?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-dark">{getActivityLabel(activity.activity_type)}</p>
          <p className="mt-1 text-sm text-muted">
            {activity.location_name || "No location"} {activity.detail ? `- ${activity.detail}` : ""}
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            {name || `Friend ${activity.user_id.slice(0, 8)}`} - {formatRelativeTime(activity.started_at)}
          </p>
        </div>
        <span className="w-fit rounded-full bg-pulse/10 px-3 py-1 text-xs font-bold text-pulse">Live</span>
      </div>
    </div>
  );
}

function ConnectionSection({
  title,
  empty,
  connections,
  userId,
  action,
  editingFriendId,
  friendLabel,
  setFriendLabel,
  onRename,
  onSaveLabel,
  onCancelRename,
}: {
  title: string;
  empty: string;
  connections: FriendConnection[];
  userId: string;
  action: (connection: FriendConnection) => React.ReactNode;
  editingFriendId: string;
  friendLabel: string;
  setFriendLabel: (value: string) => void;
  onRename: (connection: FriendConnection) => void;
  onSaveLabel: (connection: FriendConnection) => void;
  onCancelRename: () => void;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-muted">{title}</h3>
      {connections.length ? (
        <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white/70">
          {connections.map((connection) => {
            const otherId = getOtherUserId(connection, userId);
            const label = getConnectionLabel(connection, userId);
            return (
              <div key={connection.id} className="grid gap-3 p-4 md:grid-cols-[1fr_120px_auto] md:items-center">
                <div>
                  {editingFriendId === connection.id ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <TextInput value={friendLabel} onChange={(event) => setFriendLabel(event.target.value)} placeholder="Friend nickname" />
                      <Button type="button" variant="pulse" onClick={() => onSaveLabel(connection)}>
                        Save
                      </Button>
                      <Button type="button" variant="ghost" onClick={onCancelRename}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-dark">{label}</h4>
                      <button
                        type="button"
                        onClick={() => onRename(connection)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-steel/10 hover:text-dark"
                        aria-label={`Rename ${label}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <p className="mt-1 truncate text-sm text-muted">{otherId}</p>
                </div>
                <span className={getConnectionClass(connection.status)}>{connection.status}</span>
                <div className="flex flex-wrap gap-2 md:justify-end">{action(connection)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-line bg-white/45 p-4 text-sm text-muted">{empty}</p>
      )}
    </div>
  );
}

function getOtherUserId(connection: FriendConnection, userId: string) {
  return connection.requester_id === userId ? connection.receiver_id : connection.requester_id;
}

function getConnectionLabel(connection: FriendConnection, userId: string) {
  const label = connection.requester_id === userId ? connection.requester_label : connection.receiver_label;
  return label || `Friend ${getOtherUserId(connection, userId).slice(0, 8)}`;
}

function getActivityLabel(activity: ActivityType) {
  if (activity === "gym") return "At the gym";
  if (activity === "course") return "On the course";
  if (activity === "practice") return "Practicing";
  return "Available";
}

function getConnectionClass(status: FriendConnection["status"]) {
  const base = "w-fit rounded-full px-3 py-1 text-sm font-semibold";
  if (status === "accepted") return `${base} bg-golf/10 text-golf`;
  if (status === "blocked") return `${base} bg-danger/10 text-danger`;
  return `${base} bg-gold/15 text-gold`;
}

function formatRelativeTime(value: string) {
  const diffMinutes = Math.round((new Date(value).getTime() - Date.now()) / 60000);
  const absolute = Math.abs(diffMinutes);
  if (absolute < 1) return "just now";
  if (absolute < 60) return diffMinutes < 0 ? `${absolute}m ago` : `in ${absolute}m`;
  const hours = Math.round(absolute / 60);
  return diffMinutes < 0 ? `${hours}h ago` : `in ${hours}h`;
}
