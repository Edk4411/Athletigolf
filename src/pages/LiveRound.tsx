import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Camera, Flame, MessageCircle, Send, ThumbsUp } from "lucide-react";
import { Button, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type {
  Round,
  RoundComment,
  RoundGame,
  RoundGameHole,
  RoundGameResult,
  RoundMedia,
  RoundPlayer,
  RoundPlayerHole,
  RoundReaction,
} from "@/lib/types";

const reactionOptions = [
  { id: "like", label: "👍", icon: ThumbsUp },
  { id: "fire", label: "🔥", icon: Flame },
  { id: "poop", label: "💩", icon: MessageCircle },
] as const;

export default function LiveRound() {
  const { user } = useAuth();
  const [, params] = useRoute("/golf/rounds/:roundId");
  const roundId = params?.roundId;
  const [round, setRound] = useState<Round | null>(null);
  const [players, setPlayers] = useState<RoundPlayer[]>([]);
  const [playerHoles, setPlayerHoles] = useState<RoundPlayerHole[]>([]);
  const [games, setGames] = useState<RoundGame[]>([]);
  const [gameHoles, setGameHoles] = useState<RoundGameHole[]>([]);
  const [gameResults, setGameResults] = useState<RoundGameResult[]>([]);
  const [comments, setComments] = useState<RoundComment[]>([]);
  const [reactions, setReactions] = useState<RoundReaction[]>([]);
  const [media, setMedia] = useState<RoundMedia[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaCaption, setMediaCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!roundId) return;
    loadRound();
  }, [roundId]);

  async function loadRound() {
    if (!roundId) return;
    setLoading(true);
    setError("");
    const [roundResult, playerResult, playerHoleResult, gameResult, gameHoleResult, gameResultRows, commentResult, reactionResult, mediaResult] =
      await Promise.all([
        supabase.from("rounds").select("*").eq("id", roundId).maybeSingle(),
        supabase.from("round_players").select("*").eq("round_id", roundId).order("player_order"),
        supabase.from("round_player_holes").select("*").eq("round_id", roundId).order("hole_number"),
        supabase.from("round_games").select("*").eq("round_id", roundId).order("created_at"),
        supabase.from("round_game_holes").select("*").eq("round_id", roundId).order("hole_number"),
        supabase.from("round_game_results").select("*").eq("round_id", roundId).order("position"),
        supabase.from("round_comments").select("*").eq("round_id", roundId).order("created_at", { ascending: false }),
        supabase.from("round_reactions").select("*").eq("round_id", roundId).order("created_at", { ascending: false }),
        supabase.from("round_media").select("*").eq("round_id", roundId).order("created_at", { ascending: false }),
      ]);

    if (roundResult.error) setError(roundResult.error.message);
    setRound((roundResult.data as Round) || null);
    setPlayers((playerResult.data as RoundPlayer[]) || []);
    setPlayerHoles((playerHoleResult.data as RoundPlayerHole[]) || []);
    setGames((gameResult.data as RoundGame[]) || []);
    setGameHoles((gameHoleResult.data as RoundGameHole[]) || []);
    setGameResults((gameResultRows.data as RoundGameResult[]) || []);
    setComments((commentResult.data as RoundComment[]) || []);
    setReactions((reactionResult.data as RoundReaction[]) || []);
    setMedia((mediaResult.data as RoundMedia[]) || []);
    setLoading(false);
  }

  const holesPlayed = round?.target_holes || 18;
  const leaderRows = useMemo(
    () =>
      players
        .map((player) => {
          const rows = playerHoles.filter((hole) => hole.round_player_id === player.id);
          const total = rows.reduce((sum, hole) => sum + (hole.gross_score || 0), 0);
          return { player, holes: rows.length, total: rows.length ? total : null };
        })
        .sort((a, b) => {
          if (a.total === null && b.total === null) return 0;
          if (a.total === null) return 1;
          if (b.total === null) return -1;
          return a.total - b.total;
        }),
    [playerHoles, players]
  );

  async function sendComment() {
    if (!roundId || !user || !commentBody.trim()) return;
    setSaving(true);
    const { error: commentError } = await supabase.from("round_comments").insert({
      round_id: roundId,
      author_user_id: user.id,
      comment_type: "comment",
      body: commentBody.trim(),
      media_url: null,
    });
    setSaving(false);
    if (commentError) {
      setError(commentError.message);
      return;
    }
    setCommentBody("");
    loadRound();
  }

  async function sendReaction(reaction: "like" | "fire" | "poop") {
    if (!roundId || !user) return;
    const { error: reactionError } = await supabase.from("round_reactions").insert({
      round_id: roundId,
      author_user_id: user.id,
      target_type: "round",
      target_id: null,
      hole_number: null,
      reaction,
    });
    if (reactionError) {
      setError(reactionError.message);
      return;
    }
    loadRound();
  }

  async function addMedia() {
    if (!roundId || !user || !mediaUrl.trim()) return;
    setSaving(true);
    const { error: mediaError } = await supabase.from("round_media").insert({
      round_id: roundId,
      uploaded_by: user.id,
      media_type: "image",
      url: mediaUrl.trim(),
      caption: mediaCaption.trim() || null,
    });
    setSaving(false);
    if (mediaError) {
      setError(mediaError.message);
      return;
    }
    setMediaUrl("");
    setMediaCaption("");
    loadRound();
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-cream text-muted">Loading live round...</div>;
  }

  if (!round) {
    return (
      <main className="min-h-screen bg-cream px-4 py-5 md:p-8">
        <EmptyState title="Round not found" description={error || "This round is private, deleted, or unavailable."} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-5 text-dark md:p-8">
      <Link href="/golf" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-golf">
        <ArrowLeft className="h-4 w-4" />
        Round History
      </Link>

      <PageHeader
        eyebrow={round.live_status === "live" ? "Live Round" : "Round Detail"}
        title={round.round_name || round.course || "Golf Round"}
        description={`${round.course || "Course not set"}${round.tee_name ? ` / ${round.tee_name}` : ""}`}
        tone="text-golf"
      />

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Status" value={formatStatus(round.live_status)} tone="bg-white" />
        <StatCard label="Players" value={players.length || 1} tone="bg-white" />
        <StatCard label="Games" value={games.length || "-"} tone="bg-white" />
        <StatCard label="Visibility" value={round.visibility || "private"} tone="bg-white" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <h2 className="mb-4 text-2xl font-semibold">Live scorecard</h2>
          {leaderRows.length ? (
            <div className="space-y-3">
              {leaderRows.map((row, index) => (
                <div key={row.player.id} className="rounded-2xl border border-line bg-panel p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{index + 1}. {row.player.display_name}</p>
                      <p className="text-xs text-muted">{row.player.is_owner ? "Owner" : row.player.player_type}{row.player.handicap !== null ? ` / HCP ${row.player.handicap}` : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold">{row.total ?? "-"}</p>
                      <p className="text-xs text-muted">{row.holes}/{holesPlayed} holes</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-9 gap-1 text-center text-xs sm:[grid-template-columns:repeat(18,minmax(0,1fr))]">
                    {Array.from({ length: holesPlayed }, (_, index) => {
                      const hole = playerHoles.find((item) => item.round_player_id === row.player.id && item.hole_number === index + 1);
                      return (
                        <div key={index} className="rounded-lg bg-white px-1 py-2">
                          <span className="block text-[10px] font-bold text-muted">{index + 1}</span>
                          <span className="font-semibold">{hole?.gross_score ?? "-"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No live player cards yet" description="Save the round from the scorecard flow to create live player rows." />
          )}
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-4 text-2xl font-semibold">Game standings</h2>
            {games.length ? (
              <div className="space-y-3">
                {games.map((game) => {
                  const latest = [...gameHoles].reverse().find((hole) => hole.round_game_id === game.id);
                  const results = gameResults.filter((result) => result.round_game_id === game.id);
                  return (
                    <div key={game.id} className="rounded-2xl border border-line bg-panel p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{game.name || formatGame(game.game_type)}</p>
                          <p className="text-xs capitalize text-muted">{game.status} / {game.handicap_mode}</p>
                        </div>
                        <span className="rounded-full bg-golf/10 px-3 py-1 text-xs font-bold text-golf">
                          {latest?.match_state?.label?.toString() || results[0]?.result_label || "In progress"}
                        </span>
                      </div>
                      {results.length > 0 && (
                        <div className="mt-3 grid gap-2">
                          {results.map((result) => (
                            <p key={result.id} className="rounded-lg bg-white px-3 py-2 text-sm text-muted">
                              {result.result_label || "Result"}{result.holes_won !== null ? ` / ${result.holes_won} holes won` : ""}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No games saved yet" description="Stroke, matchplay, skins and 4BBB results will appear here." />
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold">
              <MessageCircle className="h-5 w-5 text-golf" />
              Round feed
            </h2>
            <div className="mb-4 flex flex-wrap gap-2">
              {reactionOptions.map((option) => (
                <Button key={option.id} variant="secondary" onClick={() => sendReaction(option.id)}>
                  <span aria-hidden="true">{option.label}</span>
                  {reactions.filter((reaction) => reaction.reaction === option.id).length}
                </Button>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                placeholder="Comment on the round..."
                className="rounded-xl border border-line bg-white px-4 py-3 outline-none focus:border-golf"
              />
              <Button variant="golf" onClick={sendComment} disabled={saving || !commentBody.trim()}>
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-xl bg-panel px-4 py-3">
                  <p className="text-sm text-dark">{comment.body}</p>
                  <p className="mt-1 text-xs text-muted">{new Date(comment.created_at).toLocaleString()}</p>
                </div>
              ))}
              {!comments.length && <p className="text-sm text-muted">No comments yet.</p>}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold">
              <Camera className="h-5 w-5 text-golf" />
              Photos
            </h2>
            <div className="grid gap-2">
              <input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="Paste image URL" className="rounded-xl border border-line bg-white px-4 py-3 outline-none focus:border-golf" />
              <input value={mediaCaption} onChange={(event) => setMediaCaption(event.target.value)} placeholder="Caption optional" className="rounded-xl border border-line bg-white px-4 py-3 outline-none focus:border-golf" />
              <Button variant="secondary" onClick={addMedia} disabled={saving || !mediaUrl.trim()}>Add Photo</Button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {media.map((item) => (
                <figure key={item.id} className="overflow-hidden rounded-2xl border border-line bg-panel">
                  <img src={item.url} alt={item.caption || "Round media"} className="aspect-video w-full object-cover" />
                  {item.caption && <figcaption className="px-3 py-2 text-sm text-muted">{item.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

function formatStatus(status?: string | null) {
  if (!status) return "Saved";
  return status.replaceAll("_", " ");
}

function formatGame(game: string) {
  return game.replaceAll("_", " ");
}
