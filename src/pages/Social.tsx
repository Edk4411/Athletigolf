import { useEffect, useMemo, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import { Link } from "wouter";
import {
  Activity,
  Check,
  Clock,
  Copy,
  Dumbbell,
  Flag,
  MessageCircle,
  Pencil,
  Search,
  Trophy,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import ScoreBadge from "@/components/ScoreBadge";
import { Button, EmptyState, FieldLabel, SelectInput, Surface, TextArea, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { getDisplayName } from "@/lib/nameFormatting";
import type {
  FriendConnection,
  FriendConnectionProfile,
  FriendSearchResult,
  LiveActivity,
  OnboardingData,
} from "@/lib/types";
import { normalizeUsername } from "@/lib/usernames";

type ActivityType = LiveActivity["activity_type"];

const activityOptions: Array<{ value: ActivityType; label: string }> = [
  { value: "available", label: "Free to play/train" },
  { value: "course", label: "On the course" },
  { value: "gym", label: "At the gym" },
  { value: "practice", label: "Practicing" },
];

const activityMeta: Record<ActivityType, { label: string; icon: ComponentType<{ className?: string }>; tone: string }> = {
  available: { label: "Available", icon: Users, tone: "bg-sky-500/15 text-sky-700 dark:text-sky-200" },
  course: { label: "On course", icon: Flag, tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200" },
  gym: { label: "Gym", icon: Dumbbell, tone: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-200" },
  practice: { label: "Practice", icon: Trophy, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-200" },
};

export default function Social() {
  const [activities, setActivities] = useState<LiveActivity[]>([]);
  const [connections, setConnections] = useState<FriendConnectionProfile[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [activityType, setActivityType] = useState<ActivityType>("available");
  const [locationName, setLocationName] = useState("");
  const [detail, setDetail] = useState("");
  const [visibility, setVisibility] = useState<LiveActivity["visibility"]>("friends");
  const [friendSearch, setFriendSearch] = useState("");
  const [friendResults, setFriendResults] = useState<FriendSearchResult[]>([]);
  const [requestUsername, setRequestUsername] = useState("");
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadSocial();
  }, []);

  async function loadSocial() {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserId(null);
      setActivities([]);
      setConnections([]);
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const [activityResponse, connectionResponse, profileResponse] = await Promise.all([
      supabase
        .from("live_activities")
        .select("*")
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(50),
      supabase.rpc("get_friend_connections_with_profiles"),
      supabase.from("profiles").select("username, onboarding_data").eq("id", user.id).maybeSingle(),
    ]);

    if (activityResponse.error) {
      setError(activityResponse.error.message);
    } else {
      setActivities((activityResponse.data || []) as LiveActivity[]);
    }

    if (connectionResponse.error) {
      setError(connectionResponse.error.message);
    } else {
      setConnections((connectionResponse.data || []) as FriendConnectionProfile[]);
    }

    if (profileResponse.error) {
      setError(profileResponse.error.message);
    } else {
      const onboarding = profileResponse.data?.onboarding_data as OnboardingData | null;
      setProfileUsername(profileResponse.data?.username || onboarding?.social?.username || null);
    }

    setLoading(false);
  }

  async function startActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;

    setSaving(true);
    setError(null);

    const { error: endError } = await supabase
      .from("live_activities")
      .update({ ended_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("ended_at", null);

    if (endError) {
      setError(endError.message);
      setSaving(false);
      return;
    }

    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    const { error: insertError } = await supabase.from("live_activities").insert({
      user_id: userId,
      activity_type: activityType,
      location_name: locationName.trim() || null,
      detail: detail.trim() || null,
      visibility,
      started_at: new Date().toISOString(),
      expires_at: expiresAt,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setLocationName("");
      setDetail("");
      await loadSocial();
    }

    setSaving(false);
  }

  async function endActivity() {
    if (!userId) return;
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("live_activities")
      .update({ ended_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("ended_at", null);

    if (updateError) {
      setError(updateError.message);
    } else {
      await loadSocial();
    }

    setSaving(false);
  }

  async function searchFriends(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    await searchFriendsFromValue(friendSearch);
  }

  async function searchFriendsFromValue(value: string) {
    const query = normalizeUsername(value);
    if (!query || query.length < 2) {
      setFriendResults([]);
      return;
    }

    const { data, error: searchError } = await supabase.rpc("search_profiles_for_friend", {
      search_query: query,
    });

    if (searchError) {
      setError(searchError.message);
    } else {
      setFriendResults((data || []) as FriendSearchResult[]);
    }
  }

  async function sendFriendRequestTo(targetUserId: string) {
    if (!userId || targetUserId === userId) return;
    setSaving(true);
    setError(null);

    const { error: requestError } = await supabase.from("friend_connections").insert({
      requester_id: userId,
      receiver_id: targetUserId,
      status: "pending",
    });

    if (requestError) {
      setError(requestError.message);
    } else {
      await loadSocial();
      await searchFriendsFromValue(friendSearch);
    }

    setSaving(false);
  }

  async function sendFriendRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = normalizeUsername(requestUsername);

    if (!username) return;
    setSaving(true);
    setError(null);

    const { data, error: searchError } = await supabase.rpc("search_profiles_for_friend", {
      search_query: username,
    });

    if (searchError) {
      setError(searchError.message);
      setSaving(false);
      return;
    }

    const match = ((data || []) as FriendSearchResult[]).find((result) => result.username === username);
    if (!match) {
      setError("No profile found with that username.");
      setSaving(false);
      return;
    }

    await sendFriendRequestTo(match.user_id);
    setRequestUsername("");
    setSaving(false);
  }

  async function updateConnection(connectionId: string, status: FriendConnection["status"]) {
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("friend_connections")
      .update({ status })
      .eq("id", connectionId);

    if (updateError) {
      setError(updateError.message);
    } else {
      await loadSocial();
    }

    setSaving(false);
  }

  function findConnectionForSearchResult(result: FriendSearchResult) {
    return connections.find((connection) => connection.other_user_id === result.user_id) || null;
  }

  async function acceptIncomingFromSearch(result: FriendSearchResult) {
    const connection = findConnectionForSearchResult(result);
    if (!connection) return;

    await updateConnection(connection.id, "accepted");
    await searchFriendsFromValue(friendSearch);
  }

  async function removeConnection(connectionId: string) {
    setSaving(true);
    setError(null);

    const { error: deleteError } = await supabase.from("friend_connections").delete().eq("id", connectionId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      await loadSocial();
      if (friendSearch.trim()) {
        await searchFriendsFromValue(friendSearch);
      }
    }

    setSaving(false);
  }

  async function saveFriendLabel(connection: FriendConnectionProfile) {
    if (!userId) return;

    const otherUserId = getOtherUserId(connection, userId);
    const patch =
      connection.requester_id === userId
        ? { requester_label: editingLabel.trim() || null }
        : { receiver_label: editingLabel.trim() || null };

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("friend_connections")
      .update(patch)
      .eq("id", connection.id)
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .or(`requester_id.eq.${otherUserId},receiver_id.eq.${otherUserId}`);

    if (updateError) {
      setError(updateError.message);
    } else {
      setEditingConnectionId(null);
      setEditingLabel("");
      await loadSocial();
    }

    setSaving(false);
  }

  function startRename(connection: FriendConnectionProfile) {
    if (!userId) return;
    setEditingConnectionId(connection.id);
    setEditingLabel(getConnectionLabel(connection, userId));
  }

  const activeActivity = activities.find((activity) => activity.user_id === userId) || null;
  const friendActivities = activities.filter((activity) => activity.user_id !== userId);

  const friendNameById = useMemo(() => {
    const names = new Map<string, string>();
    connections.forEach((connection) => {
      if (connection.other_user_id) {
        names.set(connection.other_user_id, getConnectionLabel(connection, userId));
      }
    });
    return names;
  }, [connections, userId]);

  const incomingRequests = connections.filter((connection) => {
    const isIncoming = userId ? connection.receiver_id === userId : false;
    return connection.status === "pending" && isIncoming;
  });

  const outgoingRequests = connections.filter((connection) => {
    const isOutgoing = userId ? connection.requester_id === userId : false;
    return connection.status === "pending" && isOutgoing;
  });

  const acceptedConnections = connections.filter((connection) => connection.status === "accepted");
  const acceptedCount = acceptedConnections.length;
  const pendingCount = incomingRequests.length + outgoingRequests.length;
  const liveNow = friendActivities.slice(0, 5);
  const friendsOnCourse = friendActivities
    .filter((activity) => activity.activity_type === "course" || activity.activity_type === "practice")
    .slice(0, 8);
  const fourballInvites = friendActivities.filter((activity) => activity.activity_type === "available").slice(0, 3);
  const gymInvites = friendActivities.filter((activity) => activity.activity_type === "gym").slice(0, 3);
  const feedItems = friendActivities.slice(0, 6);

  function jumpToSocialSection(sectionId: string) {
    if (typeof document === "undefined") return;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <Surface className="p-8 text-center text-sm text-muted">Loading your social hub...</Surface>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 pb-28 sm:px-6">
      {error ? (
        <div className="rounded-[28px] border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[32px] border border-white/70 bg-gradient-to-br from-sky-950 via-cyan-950 to-emerald-950 text-white shadow-xl dark:border-white/10">
        <div className="space-y-6 p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-200">Friends</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">Social hub</h1>
              <p className="mt-2 max-w-2xl text-sm text-cyan-50/75">
                Follow friends mid-round, see training wins, and find people to play or train with.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => jumpToSocialSection("friend-search")} className="border-white/20 bg-white/10 text-white hover:bg-white/20">
                <UserPlus className="h-4 w-4" />
                Add friend
              </Button>
              <Button onClick={() => jumpToSocialSection("share-status")} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                <Activity className="h-4 w-4" />
                Share status
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <HeroStat label="Friends" value={acceptedCount.toString()} />
            <HeroStat label="Live now" value={friendActivities.length.toString()} />
            <HeroStat label="Requests" value={pendingCount.toString()} />
          </div>
        </div>
      </section>

      <Section title="Live now" action={<button onClick={() => jumpToSocialSection("friends-list")} className="text-sm font-bold text-cyan-600">View friends</button>}>
        {liveNow.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {liveNow.map((activity) => (
              <LiveNowCard key={activity.id} activity={activity} name={friendNameById.get(activity.user_id) || "Friend"} />
            ))}
          </div>
        ) : (
          <EmptyState title="No friends live right now" description="When friends start a round, check in at the gym, or share availability, they will appear here." />
        )}
      </Section>

      <Section title="Friends on course" action={<Link href="/activity/golf" className="text-sm font-bold text-cyan-600">Golf hub</Link>}>
        {friendsOnCourse.length ? (
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {friendsOnCourse.map((activity, index) => (
              <CourseFriendCard key={activity.id} activity={activity} name={friendNameById.get(activity.user_id) || "Friend"} index={index} />
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-border bg-muted/20 p-5 text-sm text-muted">
            No friends are currently on course. Live rounds and practice updates will sit here first.
          </div>
        )}
      </Section>

      <Section title="Looking for">
        <div className="grid gap-3 md:grid-cols-2">
          <InviteCard
            icon={Flag}
            title="Find a fourball"
            description="Friends who are free for a round or looking for players."
            items={fourballInvites}
            empty="No fourball invites yet."
            names={friendNameById}
          />
          <InviteCard
            icon={Dumbbell}
            title="Find a gym partner"
            description="Friends at the gym or open to training together."
            items={gymInvites}
            empty="No gym partner invites yet."
            names={friendNameById}
          />
        </div>
      </Section>

      <Section title="Friends feed" action={<Link href="/round-history" className="text-sm font-bold text-cyan-600">Round history</Link>}>
        {feedItems.length ? (
          <div className="grid gap-3">
            {feedItems.map((activity) => (
              <FeedCard key={activity.id} activity={activity} name={friendNameById.get(activity.user_id) || "Friend"} />
            ))}
          </div>
        ) : (
          <EmptyState title="The feed is quiet" description="Completed rounds, PBs, practice notes, and cardio milestones from friends will appear here." />
        )}
      </Section>

      <Section title="Friends" id="friends-list">
        <div id="friend-search" className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Surface className="space-y-4 p-5">
            <div>
              <h3 className="text-lg font-black text-foreground">Search by username</h3>
              <p className="text-sm text-muted">Find friends by username. Friend codes can stay retired.</p>
            </div>
            <form onSubmit={searchFriends} className="flex flex-col gap-3 sm:flex-row">
              <TextInput
                value={friendSearch}
                onChange={(event) => {
                  setFriendSearch(event.target.value);
                  void searchFriendsFromValue(event.target.value);
                }}
                placeholder="Search username"
              />
              <Button type="submit" disabled={saving}>
                <Search className="h-4 w-4" />
                Search
              </Button>
            </form>
            {friendResults.length ? (
              <div className="space-y-2">
                {friendResults.map((result) => {
                  const displayName = result.display_name || result.username || "AthletiGolf user";
                  const connection = findConnectionForSearchResult(result);

                  return (
                  <div key={result.user_id} className="flex items-center justify-between gap-3 rounded-[22px] border border-border bg-background/70 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <SocialAvatar name={displayName} url={result.avatar_url} />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-foreground">{getDisplayName(result as any)}</p>
                        <p className="truncate text-xs text-muted">@{result.username || "user"}</p>
                      </div>
                    </div>
                    <SearchResultAction
                      result={result}
                      saving={saving}
                      onAdd={() => sendFriendRequestTo(result.user_id)}
                      onAccept={() => acceptIncomingFromSearch(result)}
                      onRemove={() => connection && removeConnection(connection.id)}
                    />
                  </div>
                  );
                })}
              </div>
            ) : null}
          </Surface>

          <Surface className="space-y-4 p-5">
            <div>
              <h3 className="text-lg font-black text-foreground">Quick request</h3>
              <p className="text-sm text-muted">Send a request when you already know their username.</p>
            </div>
            <form onSubmit={sendFriendRequest} className="space-y-3">
              <TextInput value={requestUsername} onChange={(event) => setRequestUsername(event.target.value)} placeholder="friend_username" />
              <Button type="submit" disabled={saving || !requestUsername.trim()} className="w-full">
                <UserPlus className="h-4 w-4" />
                Send request
              </Button>
            </form>
            {profileUsername ? (
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(profileUsername)}
                className="flex w-full items-center justify-between rounded-[20px] border border-border bg-muted/30 px-3 py-2 text-left text-sm"
              >
                <span>
                  Your username <b>@{profileUsername}</b>
                </span>
                <Copy className="h-4 w-4 text-muted" />
              </button>
            ) : null}
          </Surface>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <ConnectionSection
            title="Requests"
            empty="No pending requests."
            connections={[...incomingRequests, ...outgoingRequests]}
            userId={userId}
            saving={saving}
            editingConnectionId={editingConnectionId}
            editingLabel={editingLabel}
            setEditingLabel={setEditingLabel}
            onAccept={(id) => updateConnection(id, "accepted")}
            onRemove={removeConnection}
            onStartRename={startRename}
            onSaveLabel={saveFriendLabel}
            onCancelRename={() => setEditingConnectionId(null)}
          />
          <ConnectionSection
            title="Your friends"
            empty="Accepted friends will appear here."
            connections={acceptedConnections}
            userId={userId}
            saving={saving}
            editingConnectionId={editingConnectionId}
            editingLabel={editingLabel}
            setEditingLabel={setEditingLabel}
            onAccept={(id) => updateConnection(id, "accepted")}
            onRemove={removeConnection}
            onStartRename={startRename}
            onSaveLabel={saveFriendLabel}
            onCancelRename={() => setEditingConnectionId(null)}
          />
        </div>
      </Section>

      <Section title="Share status" id="share-status">
        <Surface className="space-y-4 p-5">
          {activeActivity ? (
            <div className="rounded-[24px] border border-cyan-500/20 bg-cyan-500/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-700 dark:text-cyan-200">Currently shared</p>
                  <h3 className="mt-1 text-lg font-black text-foreground">{getActivityLabel(activeActivity.activity_type)}</h3>
                  <p className="text-sm text-muted">
                    {activeActivity.location_name || "No location"} {activeActivity.detail ? `- ${activeActivity.detail}` : ""}
                  </p>
                </div>
                <Button variant="ghost" onClick={endActivity} disabled={saving}>
                  <X className="h-4 w-4" />
                  End
                </Button>
              </div>
            </div>
          ) : null}

          <form onSubmit={startActivity} className="grid gap-4 md:grid-cols-2">
            <Field label="Status">
              <SelectInput value={activityType} onChange={(event) => setActivityType(event.target.value as ActivityType)}>
                {activityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Visibility">
              <SelectInput value={visibility} onChange={(event) => setVisibility(event.target.value as LiveActivity["visibility"])}>
                <option value="friends">Friends</option>
                <option value="private">Private</option>
                <option value="team">Team</option>
                <option value="public">Public</option>
              </SelectInput>
            </Field>
            <Field label="Place">
              <TextInput value={locationName} onChange={(event) => setLocationName(event.target.value)} placeholder="Course, gym, range..." />
            </Field>
            <Field label="Details">
              <TextArea value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="Looking for a fourth, pull day, front nine..." />
            </Field>
            <div className="md:col-span-2">
              <Button type="submit" disabled={saving} className="w-full">
                <Activity className="h-4 w-4" />
                Share with friends
              </Button>
            </div>
          </form>
        </Surface>
      </Section>
    </main>
  );
}

function Section({ title, action, id, children }: { title: string; action?: ReactNode; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/10 p-4">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-100/70">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </label>
  );
}

function LiveNowCard({ activity, name }: { activity: LiveActivity; name: string }) {
  const meta = activityMeta[activity.activity_type];
  const Icon = meta.icon;

  return (
    <Surface className="p-4">
      <div className="flex items-start gap-3">
        <div className={`rounded-2xl p-3 ${meta.tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-black text-foreground">{name}</p>
          <p className="text-sm font-bold text-muted">{meta.label}</p>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{activity.detail || activity.location_name || "Shared a live status."}</p>
          <p className="mt-3 flex items-center gap-1 text-xs font-bold text-muted">
            <Clock className="h-3.5 w-3.5" />
            {formatRelativeTime(activity.started_at)}
          </p>
        </div>
      </div>
    </Surface>
  );
}

function CourseFriendCard({ activity, name, index }: { activity: LiveActivity; name: string; index: number }) {
  const progress = Math.min(18, Math.max(1, 3 + index * 2));
  const score = index % 3 === 0 ? "E" : index % 3 === 1 ? "+2" : "-1";
  const scoreToPar = score === "E" ? 0 : Number(score);

  return (
    <Link
      href="/social"
      className="min-w-[230px] rounded-[28px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <SocialAvatar name={name} />
          <div>
            <p className="font-black text-foreground">{name}</p>
            <p className="text-xs font-bold text-muted">{activity.location_name || "On course"}</p>
          </div>
        </div>
        <ScoreBadge score={score} scoreToPar={scoreToPar} size="sm" />
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-bold text-muted">
          <span>Hole {progress}</span>
          <span>{Math.round((progress / 18) * 100)}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-emerald-100 dark:bg-emerald-950">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(progress / 18) * 100}%` }} />
        </div>
      </div>
    </Link>
  );
}

function InviteCard({
  icon: Icon,
  title,
  description,
  items,
  empty,
  names,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  items: LiveActivity[];
  empty: string;
  names: Map<string, string>;
}) {
  return (
    <Surface className="p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-cyan-500/15 p-3 text-cyan-700 dark:text-cyan-200">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-foreground">{title}</h3>
          <p className="text-sm text-muted">{description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {items.length ? (
          items.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between rounded-2xl bg-muted/30 px-3 py-2 text-sm">
              <span className="font-bold text-foreground">{names.get(activity.user_id) || "Friend"}</span>
              <span className="text-muted">{activity.detail || activity.location_name || "Available"}</span>
            </div>
          ))
        ) : (
          <p className="rounded-2xl bg-muted/30 px-3 py-3 text-sm text-muted">{empty}</p>
        )}
      </div>
    </Surface>
  );
}

function FeedCard({ activity, name }: { activity: LiveActivity; name: string }) {
  const meta = activityMeta[activity.activity_type];
  const Icon = meta.icon;
  const summary =
    activity.activity_type === "course"
      ? "started a live round"
      : activity.activity_type === "gym"
        ? "checked in for training"
        : activity.activity_type === "practice"
          ? "shared a practice session"
          : "is looking for company";

  return (
    <Surface className="p-4">
      <div className="flex items-start gap-3">
        <SocialAvatar name={name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black text-foreground">{name}</p>
            <span className="text-sm text-muted">{summary}</span>
          </div>
          <p className="mt-1 text-sm text-muted">{activity.detail || activity.location_name || "No extra notes."}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${meta.tone}`}>
              <Icon className="h-3.5 w-3.5" />
              {meta.label}
            </span>
            <span className="text-xs font-bold text-muted">{formatRelativeTime(activity.started_at)}</span>
          </div>
        </div>
        <div className="flex gap-1 text-muted">
          <button className="rounded-full p-2 hover:bg-muted/40" type="button" aria-label="Like">
            <Check className="h-4 w-4" />
          </button>
          <button className="rounded-full p-2 hover:bg-muted/40" type="button" aria-label="Comment">
            <MessageCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Surface>
  );
}

function SearchResultAction({
  result,
  saving,
  onAdd,
  onAccept,
  onRemove,
}: {
  result: FriendSearchResult;
  saving: boolean;
  onAdd: () => void;
  onAccept: () => void;
  onRemove: () => void;
}) {
  if (result.relationship_status === "accepted") {
    return (
      <Button variant="ghost" onClick={onRemove} disabled={saving}>
        <X className="h-4 w-4" />
        Remove
      </Button>
    );
  }

  if (result.relationship_status === "pending" && result.relationship_direction === "incoming") {
    return (
      <Button onClick={onAccept} disabled={saving}>
        <Check className="h-4 w-4" />
        Accept
      </Button>
    );
  }

  if (result.relationship_status === "pending" && result.relationship_direction === "outgoing") {
    return <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-700 dark:text-amber-200">Pending</span>;
  }

  return (
    <Button onClick={onAdd} disabled={saving}>
      <UserPlus className="h-4 w-4" />
      Add
    </Button>
  );
}

function ConnectionSection({
  title,
  empty,
  connections,
  userId,
  saving,
  editingConnectionId,
  editingLabel,
  setEditingLabel,
  onAccept,
  onRemove,
  onStartRename,
  onSaveLabel,
  onCancelRename,
}: {
  title: string;
  empty: string;
  connections: FriendConnectionProfile[];
  userId: string | null;
  saving: boolean;
  editingConnectionId: string | null;
  editingLabel: string;
  setEditingLabel: (value: string) => void;
  onAccept: (id: string) => void;
  onRemove: (id: string) => void;
  onStartRename: (connection: FriendConnectionProfile) => void;
  onSaveLabel: (connection: FriendConnectionProfile) => void;
  onCancelRename: () => void;
}) {
  return (
    <Surface className="space-y-3 p-5">
      <h3 className="text-lg font-black text-foreground">{title}</h3>
      {connections.length ? (
        connections.map((connection) => {
          const label = userId ? getConnectionLabel(connection, userId) : connection.other_display_name || "Friend";
          const isIncoming = userId ? connection.receiver_id === userId : false;
          const isEditing = editingConnectionId === connection.id;

          return (
            <div key={connection.id} className="rounded-[22px] border border-border bg-background/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <SocialAvatar name={label} url={connection.other_avatar_url} />
                  <div className="min-w-0">
                    <p className="truncate font-black text-foreground">{label}</p>
                    <p className="truncate text-xs text-muted">
                      @{connection.other_username || "friend"} {connection.other_golf_handicap != null ? `- HCP ${connection.other_golf_handicap}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {connection.status === "pending" && isIncoming ? (
                    <Button className="px-3 py-2 text-xs" onClick={() => onAccept(connection.id)} disabled={saving}>
                      <Check className="h-4 w-4" />
                      Accept
                    </Button>
                  ) : null}
                  <Button className="px-3 py-2 text-xs" variant="ghost" onClick={() => onStartRename(connection)} disabled={saving}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button className="px-3 py-2 text-xs" variant="ghost" onClick={() => onRemove(connection.id)} disabled={saving}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {isEditing ? (
                <div className="mt-3 flex gap-2">
                  <TextInput value={editingLabel} onChange={(event) => setEditingLabel(event.target.value)} placeholder="Nickname" />
                  <Button className="px-3 py-2 text-xs" onClick={() => onSaveLabel(connection)} disabled={saving}>
                    Save
                  </Button>
                  <Button className="px-3 py-2 text-xs" variant="ghost" onClick={onCancelRename}>
                    Cancel
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })
      ) : (
        <p className="rounded-2xl bg-muted/30 px-3 py-3 text-sm text-muted">{empty}</p>
      )}
    </Surface>
  );
}

function SocialAvatar({ name, url }: { name: string; url?: string | null }) {
  if (url) {
    return <img src={url} alt="" className="h-11 w-11 rounded-full object-cover" />;
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 text-sm font-black text-slate-950">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function getOtherUserId(connection: FriendConnectionProfile, currentUserId: string | null) {
  if (!currentUserId) return connection.other_user_id || connection.receiver_id;
  return connection.requester_id === currentUserId ? connection.receiver_id : connection.requester_id;
}

function getConnectionLabel(connection: FriendConnectionProfile, currentUserId: string | null) {
  const ownLabel = currentUserId && connection.requester_id === currentUserId ? connection.requester_label : connection.receiver_label;
  return ownLabel || connection.other_display_name || connection.other_username || "Friend";
}

function getActivityLabel(type: ActivityType) {
  return activityMeta[type]?.label || "Live";
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "Just now";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.round(diff / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
