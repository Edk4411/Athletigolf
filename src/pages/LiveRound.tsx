import { useEffect, useMemo, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import { Link, useRoute } from "wouter";
import {
  ArrowLeft,
  Camera,
  ChevronDown,
  ChevronUp,
  Flame,
  Info,
  ListOrdered,
  MessageCircle,
  Send,
  ThumbsUp,
  Users,
} from "lucide-react";
import ScoreBadge from "@/components/ScoreBadge";
import { Button, Card, EmptyState } from "@/components/ui";
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
  RoundHole,
} from "@/lib/types";

type RoundTab = "leaderboard" | "info" | "feed";
type ReactionType = (typeof reactionOptions)[number]["id"];

const reactionOptions = [
  { id: "like", label: "Like", icon: ThumbsUp },
  { id: "fire", label: "Fire", icon: Flame },
  { id: "poop", label: "Oof", icon: MessageCircle },
] as const;

const tabs: Array<{ id: RoundTab; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "leaderboard", label: "Leaderboard", icon: ListOrdered },
  { id: "info", label: "Game info", icon: Info },
  { id: "feed", label: "Game feed", icon: MessageCircle },
];

export default function LiveRound() {
  const { user } = useAuth();
  const [, params] = useRoute("/golf/rounds/:roundId");
  const roundId = params?.roundId;
  const [round, setRound] = useState<Round | null>(null);
  const [roundHoles, setRoundHoles] = useState<RoundHole[]>([]);
  const [players, setPlayers] = useState<RoundPlayer[]>([]);
  const [playerHoles, setPlayerHoles] = useState<RoundPlayerHole[]>([]);
  const [games, setGames] = useState<RoundGame[]>([]);
  const [gameHoles, setGameHoles] = useState<RoundGameHole[]>([]);
  const [gameResults, setGameResults] = useState<RoundGameResult[]>([]);
  const [comments, setComments] = useState<RoundComment[]>([]);
  const [reactions, setReactions] = useState<RoundReaction[]>([]);
  const [media, setMedia] = useState<RoundMedia[]>([]);
  const [activeTab, setActiveTab] = useState<RoundTab>("leaderboard");
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
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
    const [
      roundResult,
      playerResult,
      playerHoleResult,
      gameResult,
      gameHoleResult,
      gameResultRows,
      commentResult,
      reactionResult,
      mediaResult,
      roundHoleResult,
    ] = await Promise.all([
      supabase.from("rounds").select("*").eq("id", roundId).maybeSingle(),
      supabase.from("round_players").select("*").eq("round_id", roundId).order("player_order"),
      supabase.from("round_player_holes").select("*").eq("round_id", roundId).order("hole_number"),
      supabase.from("round_games").select("*").eq("round_id", roundId).order("created_at"),
      supabase.from("round_game_holes").select("*").eq("round_id", roundId).order("hole_number"),
      supabase.from("round_game_results").select("*").eq("round_id", roundId).order("position"),
      supabase.from("round_comments").select("*").eq("round_id", roundId).order("created_at", { ascending: false }),
      supabase.from("round_reactions").select("*").eq("round_id", roundId).order("created_at", { ascending: false }),
      supabase.from("round_media").select("*").eq("round_id", roundId).order("created_at", { ascending: false }),
      supabase.from("round_holes").select("*").eq("round_id", roundId).order("hole_number", { ascending: true }),
    ]);

    if (roundResult.error) setError(roundResult.error.message);
    setRound((roundResult.data as Round) || null);
    setRoundHoles((roundHoleResult.data as RoundHole[]) || []);
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

  const holesPlayed = round?.target_holes || round?.holes_played || 18;
  const roundPar = round?.par_total || (holesPlayed === 9 ? 36 : 72);

  const leaderRows = useMemo(
    () =>
      players
        .map((player) => {
          const rows = playerHoles
            .filter((hole) => hole.round_player_id === player.id)
            .sort((a, b) => a.hole_number - b.hole_number);
          const scored = rows.filter((hole) => hole.gross_score !== null);
          const total = scored.reduce((sum, hole) => sum + Number(hole.gross_score || 0), 0);
          const expectedPar = scored.reduce(
            (sum, hole) => sum + (roundHoles.find((roundHole) => roundHole.hole_number === hole.hole_number)?.par ?? 0),
            0
          );

          return {
            player,
            holes: rows,
            holesComplete: scored.length,
            total: scored.length ? total : null,
            toPar: scored.length ? total - expectedPar : null,
          };
        })
        .sort((a, b) => {
          if (a.total === null && b.total === null) return a.player.player_order - b.player.player_order;
          if (a.total === null) return 1;
          if (b.total === null) return -1;
          return a.total - b.total;
        }),
    [playerHoles, players, roundHoles]
  );

  const selectedGame = games[0] || null;
  const activeGameHoles = useMemo(() => {
    if (!selectedGame) return [];
    return gameHoles
      .filter((hole) => hole.round_game_id === selectedGame.id)
      .sort((a, b) => a.hole_number - b.hole_number);
  }, [gameHoles, selectedGame]);
  const latestGameHole = activeGameHoles[activeGameHoles.length - 1] || null;

  async function sendComment(event?: FormEvent) {
    event?.preventDefault();
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

  async function sendReaction(reaction: ReactionType) {
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

  async function addMedia(event?: FormEvent) {
    event?.preventDefault();
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
    <main className="min-h-screen bg-cream px-4 py-5 pb-28 text-dark md:p-8">
      <section className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-[2rem] border border-golf/15 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Link
              href="/social"
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-panel text-dark shadow-sm transition hover:bg-golf/10 hover:text-golf"
              aria-label="Back to social"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-2xl font-black tracking-tight text-dark">{round.round_name || "Live round"}</p>
              <p className="truncate text-sm font-semibold text-muted">
                {round.course || "Course not set"}{round.tee_name ? ` / ${round.tee_name}` : ""}
              </p>
            </div>
            <span className="inline-flex h-12 min-w-12 items-center justify-center rounded-2xl bg-golf px-3 text-sm font-black uppercase text-white">
              {formatStatus(round.live_status)}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <MiniStat label="Players" value={players.length || 1} />
            <MiniStat label="Games" value={games.length || "-"} />
            <MiniStat label="Holes" value={holesPlayed} />
            <MiniStat label="Visibility" value={round.visibility || "private"} />
          </div>
        </header>

        <nav className="grid grid-cols-3 overflow-hidden rounded-[1.75rem] border border-line bg-white p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-[1.35rem] px-2 text-xs font-black transition ${
                activeTab === tab.id ? "bg-golf text-white shadow-sm" : "text-muted hover:bg-panel hover:text-dark"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </nav>

        {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

        {activeTab === "leaderboard" && (
          <LeaderboardTab
            games={games}
            leaderRows={leaderRows}
            holesPlayed={holesPlayed}
            roundHoles={roundHoles}
            expandedPlayerId={expandedPlayerId}
            onTogglePlayer={(playerId) => setExpandedPlayerId((current) => (current === playerId ? null : playerId))}
          />
        )}

        {activeTab === "info" && (
          <InfoTab
            round={round}
            players={players}
            games={games}
            gameResults={gameResults}
            latestGameHole={latestGameHole}
          />
        )}

        {activeTab === "feed" && (
          <FeedTab
            comments={comments}
            reactions={reactions}
            media={media}
            commentBody={commentBody}
            mediaCaption={mediaCaption}
            mediaUrl={mediaUrl}
            saving={saving}
            onCommentChange={setCommentBody}
            onMediaCaptionChange={setMediaCaption}
            onMediaUrlChange={setMediaUrl}
            onSendComment={sendComment}
            onSendReaction={sendReaction}
            onAddMedia={addMedia}
          />
        )}
      </section>
    </main>
  );
}

function LeaderboardTab({
  games,
  leaderRows,
  holesPlayed,
  roundHoles,
  expandedPlayerId,
  onTogglePlayer,
}: {
  games: RoundGame[];
  leaderRows: Array<{
    player: RoundPlayer;
    holes: RoundPlayerHole[];
    holesComplete: number;
    total: number | null;
    toPar: number | null;
  }>;
  holesPlayed: number;
  roundHoles: RoundHole[];
  expandedPlayerId: string | null;
  onTogglePlayer: (playerId: string) => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="bg-white px-4 pt-4">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {(games.length ? games : [{ id: "default", game_type: "stroke_play", name: "Stroke play" } as RoundGame]).map((game, index) => (
            <span
              key={game.id}
              className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-black ${
                index === 0 ? "bg-golf text-white" : "bg-panel text-muted"
              }`}
            >
              {game.name || formatGame(game.game_type)}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[2.2rem_1fr_4rem_4rem_4rem] bg-dark px-4 py-3 text-[0.7rem] font-black uppercase tracking-wide text-white">
        <span>#</span>
        <span>Name</span>
        <span className="text-right">Score</span>
        <span className="text-right">To par</span>
        <span className="text-right">Thru</span>
      </div>

      {leaderRows.length ? (
        <div className="bg-golf pb-4">
          {leaderRows.map((row, index) => (
            <div key={row.player.id} className="border-b border-white/15">
              <button
                type="button"
                onClick={() => onTogglePlayer(row.player.id)}
                className="grid w-full grid-cols-[2.2rem_1fr_4rem_4rem_4rem] items-center gap-0 bg-white px-4 py-4 text-left transition hover:bg-panel"
              >
                <span className="text-lg font-semibold text-muted">{index + 1}.</span>
                <span className="min-w-0">
                  <span className="block truncate text-lg font-semibold text-dark">{row.player.display_name}</span>
                  <span className="block truncate text-xs font-semibold text-muted">
                    {row.player.handicap !== null ? `HCP ${row.player.handicap}` : row.player.player_type}
                    {row.player.tee_name ? ` / ${row.player.tee_name}` : ""}
                  </span>
                </span>
                <span className="flex justify-end"><ScoreBadge score={row.total} scoreToPar={row.toPar} /></span>
                <span className="flex justify-end"><ScoreBadge score={formatToPar(row.toPar)} scoreToPar={row.toPar} /></span>
                <span className="flex items-center justify-end gap-1 text-right text-lg font-semibold">
                  {row.holesComplete >= holesPlayed ? "F" : row.holesComplete}
                  {expandedPlayerId === row.player.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </button>

              {expandedPlayerId === row.player.id && (
                <ExpandedScorecard player={row.player} holes={row.holes} roundHoles={roundHoles} holesPlayed={holesPlayed} position={index + 1} total={row.total} />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-5">
          <EmptyState title="No leaderboard yet" description="When scoring starts, players and live totals will appear here." />
        </div>
      )}
    </Card>
  );
}

function ExpandedScorecard({
  player,
  holes,
  roundHoles,
  holesPlayed,
  position,
  total,
}: {
  player: RoundPlayer;
  holes: RoundPlayerHole[];
  roundHoles: RoundHole[];
  holesPlayed: number;
  position: number;
  total: number | null;
}) {
  const holeNumbers = roundHoles.map((hole) => hole.hole_number).sort((a, b) => a - b);
  const front = holeNumbers.filter((holeNumber) => holeNumber <= 9);
  const back = holeNumbers.filter((holeNumber) => holeNumber >= 10);
  const totalNet = holes.reduce((sum, hole) => sum + Number(hole.net_score || 0), 0);

  return (
    <div className="bg-golf px-3 pb-4">
      <div className="rounded-b-[1.75rem] bg-white p-4 shadow-lg">
        {front.length > 0 && <ScorecardNine label="Out" holes={front} playerHoles={holes} roundHoles={roundHoles} />}
        {back.length > 0 && <ScorecardNine label="In" holes={back} playerHoles={holes} roundHoles={roundHoles} />}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <SummaryTile label="Player" value={player.display_name} />
          <SummaryTile label="Score" value={`${total ?? "-"}/${totalNet || "-"}`} />
          <SummaryTile label="Position" value={`${position}.`} />
        </div>
      </div>
    </div>
  );
}

function ScorecardNine({ label, holes, playerHoles, roundHoles }: { label: string; holes: number[]; playerHoles: RoundPlayerHole[]; roundHoles: RoundHole[] }) {
  const grossTotal = sumNumericCells(playerHoles, holes, "gross_score");
  const netTotal = sumNumericCells(playerHoles, holes, "net_score");
  const parTotal = sumPar(roundHoles, holes);

  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-line">
      <ScorecardRow label="Hole" cells={holes.map(String)} endLabel={label} tone="header" />
      <ScorecardRow
        label="Score"
        cells={holes.map((holeNumber) => {
          const score = playerHoles.find((hole) => hole.hole_number === holeNumber)?.gross_score ?? null;
          return <ScoreBadge score={score} par={getHolePar(roundHoles, holeNumber)} size="sm" />;
        })}
        endLabel={<ScoreBadge score={grossTotal} par={parTotal} size="sm" />}
        tone="strong"
      />
      <ScorecardRow
        label="Net"
        cells={holes.map((holeNumber) => {
          const score = playerHoles.find((hole) => hole.hole_number === holeNumber)?.net_score ?? null;
          return <ScoreBadge score={score} par={getHolePar(roundHoles, holeNumber)} size="sm" />;
        })}
        endLabel={<ScoreBadge score={netTotal} par={parTotal} size="sm" />}
      />
      <ScorecardRow
        label="Pts"
        cells={holes.map((holeNumber) => String(playerHoles.find((hole) => hole.hole_number === holeNumber)?.stableford_points ?? "-"))}
        endLabel={sumCells(playerHoles, holes, "stableford_points")}
      />
    </div>
  );
}

function ScorecardRow({
  label,
  cells,
  endLabel,
  tone,
}: {
  label: string;
  cells: ReactNode[];
  endLabel: ReactNode;
  tone?: "header" | "strong";
}) {
  return (
    <div className={`grid grid-cols-[4.2rem_repeat(9,minmax(0,1fr))_3rem] text-center text-xs ${tone === "header" ? "bg-golf text-white" : "bg-white"}`}>
      <span className="border-r border-line/60 px-2 py-2 text-left font-black">{label}</span>
      {cells.map((cell, index) => (
        <span key={`${label}-${index}`} className="flex items-center justify-center border-r border-line/60 px-1 py-2">
          {cell}
        </span>
      ))}
      <span className="flex items-center justify-center px-1 py-2 font-black">{endLabel}</span>
    </div>
  );
}

function InfoTab({
  round,
  players,
  games,
  gameResults,
  latestGameHole,
}: {
  round: Round;
  players: RoundPlayer[];
  games: RoundGame[];
  gameResults: RoundGameResult[];
  latestGameHole: RoundGameHole | null;
}) {
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
        <div className="bg-gradient-to-br from-golf to-emerald-800 p-5 text-white">
          <p className="mb-10 text-sm font-bold uppercase tracking-[0.24em] text-white/70">Game info</p>
          <h2 className="text-2xl font-black">{round.course || "Course not set"}</h2>
          <p className="text-sm font-semibold text-white/80">
            {round.tee_name || "Tee not set"}{round.par_total ? ` / Par ${round.par_total}` : ""}{round.slope_rating ? ` / Slope ${round.slope_rating}` : ""}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <InfoButton label="Course map" value={round.total_yards ? `${round.total_yards} yards` : "Coming soon"} />
          <InfoButton label="Directions" value="Coming soon" />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-black">
          <Users className="h-5 w-5 text-golf" />
          Players ({players.length})
        </h2>
        <div className="space-y-3">
          {players.map((player) => (
            <div key={player.id} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-3">
              <RoundAvatar src={player.avatar_url} name={player.display_name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-black">{player.display_name}</p>
                <p className="truncate text-sm font-semibold text-muted">
                  {player.handicap !== null ? `HCP ${player.handicap}` : "No handicap"}
                  {player.tee_name ? ` / ${player.tee_name}` : ""}
                </p>
              </div>
              <span className="rounded-full bg-golf/10 px-3 py-1 text-xs font-black text-golf">{player.player_type}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-2xl font-black">Formats</h2>
        {games.length ? (
          <div className="space-y-3">
            {games.map((game) => {
              const result = gameResults.find((item) => item.round_game_id === game.id);
              return (
                <div key={game.id} className="rounded-2xl border border-line bg-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{game.name || formatGame(game.game_type)}</p>
                      <p className="text-sm font-semibold capitalize text-muted">{game.scoring_basis} / {game.handicap_mode}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase text-muted">{game.status}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-muted">
                    {result?.result_label || latestGameHole?.result_label || "In progress"}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No game formats yet" description="Stroke play, Stableford, matchplay and side games will appear here." />
        )}
      </Card>
    </div>
  );
}

function FeedTab({
  comments,
  reactions,
  media,
  commentBody,
  mediaCaption,
  mediaUrl,
  saving,
  onCommentChange,
  onMediaCaptionChange,
  onMediaUrlChange,
  onSendComment,
  onSendReaction,
  onAddMedia,
}: {
  comments: RoundComment[];
  reactions: RoundReaction[];
  media: RoundMedia[];
  commentBody: string;
  mediaCaption: string;
  mediaUrl: string;
  saving: boolean;
  onCommentChange: (value: string) => void;
  onMediaCaptionChange: (value: string) => void;
  onMediaUrlChange: (value: string) => void;
  onSendComment: (event?: FormEvent) => void;
  onSendReaction: (reaction: ReactionType) => void;
  onAddMedia: (event?: FormEvent) => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <RoundAvatar name="You" />
          <form onSubmit={onSendComment} className="flex flex-1 items-center gap-2 rounded-full bg-panel px-4 py-2">
            <input
              value={commentBody}
              onChange={(event) => onCommentChange(event.target.value)}
              placeholder="Create a post"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
            />
            <button type="submit" disabled={saving || !commentBody.trim()} className="text-golf disabled:opacity-40">
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>

        <div className="flex flex-wrap gap-2">
          {reactionOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSendReaction(option.id)}
              className="inline-flex items-center gap-2 rounded-full bg-panel px-4 py-2 text-sm font-black text-dark transition hover:bg-golf/10 hover:text-golf"
            >
              <option.icon className="h-4 w-4" />
              {option.label}
              <span className="text-muted">{reactions.filter((reaction) => reaction.reaction === option.id).length}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-black">
          <Camera className="h-5 w-5 text-golf" />
          Photos
        </h2>
        <form onSubmit={onAddMedia} className="grid gap-2">
          <input
            value={mediaUrl}
            onChange={(event) => onMediaUrlChange(event.target.value)}
            placeholder="Paste image URL"
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-golf"
          />
          <input
            value={mediaCaption}
            onChange={(event) => onMediaCaptionChange(event.target.value)}
            placeholder="Caption optional"
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-golf"
          />
          <Button type="submit" variant="secondary" disabled={saving || !mediaUrl.trim()}>
            Add photo
          </Button>
        </form>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {media.map((item) => (
            <figure key={item.id} className="overflow-hidden rounded-3xl border border-line bg-panel">
              <img src={item.url} alt={item.caption || "Round media"} className="aspect-video w-full object-cover" />
              {item.caption && <figcaption className="px-4 py-3 text-sm font-semibold text-muted">{item.caption}</figcaption>}
            </figure>
          ))}
        </div>
        {!media.length && <p className="mt-3 text-sm font-semibold text-muted">No photos yet.</p>}
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-2xl font-black">Comments</h2>
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-2xl bg-panel px-4 py-3">
              <p className="text-sm font-semibold text-dark">{comment.body}</p>
              <p className="mt-1 text-xs font-semibold text-muted">{new Date(comment.created_at).toLocaleString()}</p>
            </div>
          ))}
          {!comments.length && (
            <EmptyState
              title="No posts yet"
              description="Share pictures, notes and comments from the round so friends can follow along."
            />
          )}
        </div>
      </Card>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl bg-panel px-2 py-3">
      <p className="text-lg font-black">{value}</p>
      <p className="truncate text-[0.65rem] font-black uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl bg-panel px-3 py-3">
      <p className="truncate text-lg font-black text-golf">{value}</p>
      <p className="text-[0.65rem] font-black uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}

function InfoButton({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-panel p-4">
      <p className="font-black text-dark">{label}</p>
      <p className="mt-1 text-sm font-semibold text-muted">{value}</p>
    </div>
  );
}

function RoundAvatar({ src, name }: { src?: string | null; name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "A";
  return (
    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-golf/15 bg-golf/10 text-sm font-black text-golf">
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initial}
    </span>
  );
}

function formatStatus(status?: string | null) {
  if (!status || status === "not_started") return "Saved";
  if (status === "finished") return "Final";
  return status.replaceAll("_", " ");
}

function formatToPar(value: number | null) {
  if (value === null) return "-";
  if (value === 0) return "E";
  return value > 0 ? `+${value}` : String(value);
}

function formatGame(game: string) {
  return game.replaceAll("_", " ");
}

function sumCells(holes: RoundPlayerHole[], holeNumbers: number[], field: "gross_score" | "net_score" | "stableford_points") {
  const values = holeNumbers
    .map((holeNumber) => holes.find((hole) => hole.hole_number === holeNumber)?.[field])
    .filter((value): value is number => typeof value === "number");

  if (!values.length) return "-";
  return String(values.reduce((sum, value) => sum + value, 0));
}

function sumNumericCells(holes: RoundPlayerHole[], holeNumbers: number[], field: "gross_score" | "net_score") {
  const values = holeNumbers
    .map((holeNumber) => holes.find((hole) => hole.hole_number === holeNumber)?.[field])
    .filter((value): value is number => typeof value === "number");

  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0);
}

function getHolePar(holes: RoundHole[], holeNumber: number) {
  return holes.find((hole) => hole.hole_number === holeNumber)?.par ?? null;
}

function sumPar(holes: RoundHole[], holeNumbers: number[]) {
  const values = holeNumbers
    .map((holeNumber) => getHolePar(holes, holeNumber))
    .filter((value): value is number => typeof value === "number");

  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0);
}
