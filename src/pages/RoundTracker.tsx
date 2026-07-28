import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Flag, Flame, Handshake, MessageCircle, Save, Settings, Trophy, UserPlus, Users } from "lucide-react";
import GolfCoursePicker from "@/components/GolfCoursePicker";
import HandicapAllowanceSelector from "@/components/HandicapAllowanceSelector";
import PostRoundMatchAnalysis from "@/components/PostRoundMatchAnalysis";
import ManualCourseModal from "@/components/ManualCourseModal";
import ScoreBadge from "@/components/ScoreBadge";
import { Button, Card, PageHeader, StatCard } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { todayIso } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import {
  computeCourseHandicap,
  computePlayingHandicap,
  getDefaultAllowancePercent,
  getStrokesReceived,
  parseHandicapIndex,
  stablefordPoints,
  type GameFormat,
} from "@/lib/handicap";
import { clearRoundDraft, loadRoundDraft, saveRoundDraft } from "@/lib/roundDraft";
import type {
  FairwayResult,
  FriendConnectionProfile,
  GolfCourseDetail,
  GolfCourseTee,
  Profile,
  Round,
  RoundHole,
  RoundPlayer,
  RoundPlayerHole,
  TeeShotLocation,
} from "@/lib/types";
import { getDisplayName } from "@/lib/nameFormatting";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "setup" | "holes" | "review" | "saved";
type SetupSubStep = 1 | 2 | 3; // 1 = Course, 2 = Players, 3 = Game

type LivePlayer = {
  id: string;
  name: string;
  handicap: string; // handicap index as string
  allowancePercent: number; // WHS allowance override (0–100)
  type: "friend" | "guest";
  team: "A" | "B";
  userId?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
};

type LiveParticipant = {
  id: string;
  name: string;
  handicap: string;
  allowancePercent: number;
  type: "owner" | "friend" | "guest";
  team: "A" | "B";
  userId?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
};

type MatchDecision = { label: string; hole: number } | null;

type LiveGame = GameFormat;

type LiveSideRow = {
  round_id: string;
  name: string | null;
  side_type: "individual" | "pair" | "team";
  side_order: number;
};

type LivePlayerHoleRow = {
  round_id: string;
  round_player_id: string;
  side_id: string | null;
  hole_number: number;
  gross_score: number;
  net_score: number;
  stableford_points: number | null;
  strokes_received: number;
  picked_up: boolean;
  conceded: boolean;
  notes: string | null;
};

type LiveGameResultRow = {
  round_game_id: string;
  round_id: string;
  round_player_id: string | null;
  side_id: string | null;
  position: number | null;
  total_gross: number | null;
  total_net: number | null;
  total_points: number | null;
  holes_won: number | null;
  skins_won: number | null;
  result_label: string;
  result_payload: Record<string, unknown>;
};

type LiveGameHoleRow = {
  round_game_id: string;
  round_id: string;
  hole_number: number;
  winning_player_id: string | null;
  winning_side_id: string | null;
  result_label: string;
  carryover_count: number;
  points: Record<string, unknown>;
  match_state: Record<string, unknown>;
};

type Hole = {
  par: number;
  yardage: number | null;
  meters: number | null;
  handicap: number | null; // stroke index
  score: string;
  fairway: FairwayResult;
  teeShotLocation: "" | TeeShotLocation;
  gir: boolean;
  putts: string;
  penaltyShots: string;
  chipShots: string;
  greensideBunkerShots: string;
  recoveryShotType: "" | "chip" | "sand";
};

// ─── Constants ────────────────────────────────────────────────────────────────

const liveGameOptions: Array<{ id: LiveGame; label: string; detail: string }> = [
  { id: "stroke_play", label: "Stroke play", detail: "Gross total" },
  { id: "medal", label: "Medal", detail: "Strict net scoring" },
  { id: "stableford", label: "Stableford", detail: "Handicap points" },
  { id: "match_play", label: "Match play", detail: "Hole-by-hole match" },
  { id: "skins", label: "Skins", detail: "Hole prize carries" },
  { id: "four_ball_stroke", label: "4BBB Stroke", detail: "Best ball total" },
  { id: "four_ball_match", label: "4BBB Match", detail: "Best ball match" },
  { id: "foursomes", label: "Foursomes", detail: "Alternate shot" },
];

const SETUP_STEPS = [
  { num: 1 as SetupSubStep, label: "Course" },
  { num: 2 as SetupSubStep, label: "Players" },
  { num: 3 as SetupSubStep, label: "Game" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createHoles = (count: number): Hole[] =>
  Array.from({ length: count }, () => ({
    par: 4,
    yardage: null,
    meters: null,
    handicap: null,
    score: "",
    fairway: "na",
    teeShotLocation: "",
    gir: false,
    putts: "",
    penaltyShots: "",
    chipShots: "",
    greensideBunkerShots: "",
    recoveryShotType: "",
  }));

const parseStat = (value: string) => Number(value || 0);
const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
};
const needsRecoveryChoice = (hole: Hole) =>
  parseStat(hole.chipShots) > 0 &&
  parseStat(hole.greensideBunkerShots) > 0 &&
  hole.putts.trim() !== "" &&
  hole.recoveryShotType === "";

function toDraftHoles(count: 9 | 18, rows: RoundHole[]): Hole[] {
  const holes = createHoles(count);
  rows.forEach((row) => {
    const index = row.hole_number - 1;
    if (index < 0 || index >= holes.length) return;
    holes[index] = {
      par: row.par || 4,
      yardage: row.yardage ?? null,
      meters: row.meters ?? null,
      handicap: row.handicap ?? null,
      score: row.score == null ? "" : row.score.toString(),
      fairway: row.fairway_result || "na",
      teeShotLocation: row.tee_shot_location || "",
      gir: row.gir,
      putts: row.putts == null ? "" : row.putts.toString(),
      penaltyShots: row.penalty_shots == null ? "" : row.penalty_shots.toString(),
      chipShots: row.chip_shots == null ? "" : row.chip_shots.toString(),
      greensideBunkerShots:
        row.greenside_bunker_shots == null ? "" : row.greenside_bunker_shots.toString(),
      recoveryShotType: row.recovery_shot_type || "",
    };
  });
  return holes;
}

function formatOption(option: string) {
  if (option === "na") return "N/A";
  return option.replaceAll("_", " ");
}
function formatToParValue(score: number) {
  if (score === 0) return "E";
  return score > 0 ? `+${score}` : `${score}`;
}

// ─── WHS per-participant ──────────────────────────────────────────────────────

function getParticipantPlayingHandicap(
  participant: LiveParticipant,
  selectedTee: GolfCourseTee | null,
  holesPlayed: 9 | 18
): number {
  const index = parseHandicapIndex(participant.handicap);
  if (!index) return 0;
  if (selectedTee?.slopeRating && selectedTee.courseRating && selectedTee.parTotal) {
    const ch = computeCourseHandicap(
      index,
      selectedTee.slopeRating,
      selectedTee.courseRating,
      selectedTee.parTotal
    );
    return computePlayingHandicap(ch, participant.allowancePercent);
  }
  // Fallback: use raw index × allowance
  return Math.round(index * (participant.allowancePercent / 100));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RoundTracker() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // ── Step & setup sub-step ──
  const [step, setStep] = useState<Step>("setup");
  const [setupSubStep, setSetupSubStep] = useState<SetupSubStep>(1);

  // ── Strava queue link ──
  const [linkedQueueId, setLinkedQueueId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queueId = params.get("queueId");
    if (queueId) {
      setLinkedQueueId(queueId);
      fetchStravaActivity(queueId);
    }
  }, []);

  async function fetchStravaActivity(queueId: string) {
    const { data, error } = await supabase
      .from("strava_activity_queue")
      .select("*")
      .eq("id", queueId)
      .single();
    if (!error && data) setDate(data.activity_date);
  }

  // ── Round state ──
  const [existingRoundId, setExistingRoundId] = useState<string | null>(null);
  const [savedStatus, setSavedStatus] = useState<"completed" | "unfinished">("completed");
  const [holesPlayed, setHolesPlayed] = useState<9 | 18>(18);
  /** front = holes 1-9, back = holes 10-18, all = 18. */
  const [nineSelection, setNineSelection] = useState<"front" | "back" | "all">("all");
  const [showManualCourseModal, setShowManualCourseModal] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [roundName, setRoundName] = useState("");
  const [visibility, setVisibility] = useState<"private" | "friends">("friends");
  const [ownHandicap, setOwnHandicap] = useState("");
  const [ownAllowancePercent, setOwnAllowancePercent] = useState(95);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<FriendConnectionProfile[]>([]);
  const [livePlayers, setLivePlayers] = useState<LivePlayer[]>([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerHandicap, setNewPlayerHandicap] = useState("");
  const [newPlayerAllowance, setNewPlayerAllowance] = useState<string>("");
  const [selectedGames, setSelectedGames] = useState<LiveGame[]>(["stroke_play"]);
  const [roundIntent, setRoundIntent] = useState<"casual" | "competition">("casual");
  const [matchDecision, setMatchDecision] = useState<MatchDecision>(null);
  const [matchContinuedAfterCloseout, setMatchContinuedAfterCloseout] = useState(false);
  const [playerHoleScores, setPlayerHoleScores] = useState<Record<string, string[]>>({});
  const [course, setCourse] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<GolfCourseDetail | null>(null);
  const [selectedTee, setSelectedTee] = useState<GolfCourseTee | null>(null);
  const [competition, setCompetition] = useState(false);
  const [teeColour, setTeeColour] = useState("");
  const [playingPartners, setPlayingPartners] = useState("");
  const [averageDrivingDistance, setAverageDrivingDistance] = useState("");
  const [longestDrive, setLongestDrive] = useState("");
  const [teeShotQuality, setTeeShotQuality] = useState("");
  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [holes, setHoles] = useState<Hole[]>(createHoles(18));
  const [currentHoleIndex, setCurrentHoleIndex] = useState(0);
  const [recoveryPromptIndex, setRecoveryPromptIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [handicapAllowancePercent, setHandicapAllowancePercent] = useState(100);
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // ── Refs for background flush ──
  const stateRef = useRef({
    holes,
    playerHoleScores,
    existingRoundId,
    user,
    step,
    holesPlayed,
    nineSelection,
    roundName,
    course,
    selectedCourse,
    selectedTee,
    teeColour,
    date,
    notes,
    visibility,
    competition,
    ownHandicap,
    ownAllowancePercent,
    selectedGames,
    livePlayers,
    playingPartners,
    averageDrivingDistance,
    longestDrive,
    teeShotQuality,
    setupSubStep,
  });
  useEffect(() => {
    stateRef.current = {
      holes,
      playerHoleScores,
      existingRoundId,
      user,
      step,
      holesPlayed,
      nineSelection,
      roundName,
      course,
      selectedCourse,
      selectedTee,
      teeColour,
      date,
      notes,
      visibility,
      competition,
      ownHandicap,
      ownAllowancePercent,
      selectedGames,
      livePlayers,
      playingPartners,
      averageDrivingDistance,
      longestDrive,
      teeShotQuality,
      setupSubStep,
    };
  });

  // ── Load profile & friends ──
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      const [{ data: profileData }, { data: friendData }] = await Promise.all([
        supabase.from("profiles").select("*").maybeSingle(),
        supabase.rpc("get_friend_connections_with_profiles"),
      ]);
      if (cancelled) return;
      const p = profileData as Profile | null;
      setProfile(p);
      setFriends(((friendData as FriendConnectionProfile[]) || []).filter((f) => f.status === "accepted"));
      setOwnHandicap((cur) =>
        cur || !p?.golf_handicap ? cur : String(p.golf_handicap)
      );
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  // ── Restore local draft on mount if no resume URL and no server draft ──
  const restoredLocalRef = useRef(false);
  useEffect(() => {
    if (!user || restoredLocalRef.current) return;
    const hasResume = !!new URLSearchParams(window.location.search).get("resume");
    if (hasResume) return;
    const draft = loadRoundDraft(user.id);
    if (!draft || draft.step === "saved") return;
    restoredLocalRef.current = true;

    setExistingRoundId(draft.existingRoundId);
    setStep(draft.step);
    setSetupSubStep(draft.setupSubStep);
    setHolesPlayed(draft.holesPlayed);
    setNineSelection(draft.nineSelection);
    setRoundName(draft.roundName);
    setCourse(draft.course);
    setTeeColour(draft.teeColour);
    setDate(draft.date);
    setNotes(draft.notes);
    setVisibility(draft.visibility);
    setCompetition(draft.competition);
    setOwnHandicap(draft.ownHandicap);
    setOwnAllowancePercent(draft.ownAllowancePercent);
    setSelectedGames(draft.selectedGames as LiveGame[]);
    setRoundIntent(draft.roundIntent);
    setLivePlayers(
      draft.livePlayers.map((p) => ({
        id: p.id, name: p.name, handicap: p.handicap,
        allowancePercent: p.allowancePercent, type: p.type, team: p.team,
        userId: p.userId ?? null, username: p.username ?? null,
        avatarUrl: p.avatarUrl ?? null,
      }))
    );
    setPlayerHoleScores(draft.playerHoleScores);
    setHoles(draft.holes as Hole[]);
    setCurrentHoleIndex(draft.currentHoleIndex);
    setAverageDrivingDistance(draft.averageDrivingDistance);
    setLongestDrive(draft.longestDrive);
    setTeeShotQuality(draft.teeShotQuality);
    setPlayingPartners(draft.playingPartners);

    if (draft.selectedCourse) {
      setSelectedCourse({
        id: draft.selectedCourse.externalId ?? -1,
        cachedCourseId: draft.selectedCourse.cachedCourseId,
        clubName: draft.selectedCourse.clubName,
        courseName: draft.selectedCourse.courseName,
        location: null, city: null, state: null, country: null, tees: [],
      });
    }
    if (draft.selectedTee) {
      setSelectedTee({
        id: draft.selectedTee.id || "restored-tee",
        gender: "unknown",
        teeName: draft.selectedTee.teeName,
        courseRating: draft.selectedTee.courseRating,
        slopeRating: draft.selectedTee.slopeRating,
        bogeyRating: null,
        totalYards: draft.selectedTee.totalYards,
        totalMeters: draft.selectedTee.totalMeters,
        numberOfHoles: draft.holesPlayed,
        parTotal: draft.selectedTee.parTotal,
        holes: [],
      });
    }
  }, [user]);

  // ── Resume from URL ──
  useEffect(() => {
    if (!user) return;
    const resumeId = new URLSearchParams(window.location.search).get("resume");
    if (!resumeId) return;

    let cancelled = false;
    async function loadDraft() {
      setSaveError("");
      const [
        { data: round },
        { data: holeRows },
        { data: playerRows },
        { data: playerHoleRows },
      ] = await Promise.all([
        supabase.from("rounds").select("*").eq("id", resumeId).maybeSingle(),
        supabase.from("round_holes").select("*").eq("round_id", resumeId).order("hole_number"),
        supabase.from("round_players").select("*").eq("round_id", resumeId).order("player_order"),
        supabase.from("round_player_holes").select("*").eq("round_id", resumeId),
      ]);

      if (cancelled || !round) return;

      const loadedRound = round as Round;
      const targetHoles = loadedRound.target_holes === 9 ? 9 : 18;

      // Infer front/back nine from stored hole numbers
      const rawHoleRows = (holeRows as RoundHole[]) || [];
      const minHole = rawHoleRows.length
        ? Math.min(...rawHoleRows.map((h) => h.hole_number))
        : 1;
      const inferredNine: "front" | "back" | "all" =
        targetHoles === 18 ? "all" : minHole >= 10 ? "back" : "front";
      const offset = inferredNine === "back" ? 9 : 0;
      // Normalise hole numbers into 1..N index space for the local state
      const normalisedHoleRows: RoundHole[] = rawHoleRows.map((h) => ({
        ...h,
        hole_number: h.hole_number - offset,
      }));

      setExistingRoundId(loadedRound.id);
      setSavedStatus(loadedRound.status === "completed" ? "completed" : "unfinished");
      setHolesPlayed(targetHoles);
      setNineSelection(inferredNine);
      setRoundName(loadedRound.round_name || "");
      setCourse(loadedRound.course || "");
      setSelectedCourse(
        loadedRound.golf_course_external_id
          ? {
              id: loadedRound.golf_course_external_id,
              cachedCourseId: loadedRound.golf_course_id || null,
              clubName: loadedRound.course || "Saved course",
              courseName: loadedRound.course || "Saved course",
              location: null, city: null, state: null, country: null, tees: [],
            }
          : null
      );
      setSelectedTee(
        loadedRound.golf_course_tee_id || loadedRound.tee_name
          ? {
              id: loadedRound.golf_course_tee_id || "saved-tee",
              gender: "unknown",
              teeName: loadedRound.tee_name || loadedRound.tee_colour || "Saved tee",
              courseRating: loadedRound.course_rating ?? null,
              slopeRating: loadedRound.slope_rating ?? null,
              bogeyRating: null,
              totalYards: loadedRound.total_yards ?? null,
              totalMeters: loadedRound.total_meters ?? null,
              numberOfHoles: loadedRound.target_holes || null,
              parTotal: loadedRound.par_total ?? null,
              holes: [],
            }
          : null
      );
      setCompetition(loadedRound.is_competition);
      setTeeColour(loadedRound.tee_name || loadedRound.tee_colour || "");
      setPlayingPartners(loadedRound.playing_partners || "");
      setDate(loadedRound.date || todayIso());
      setNotes(loadedRound.notes || "");
      setHoles(toDraftHoles(targetHoles, normalisedHoleRows));
      setCurrentHoleIndex(0);

      // ── Restore multiplayer scores from round_player_holes ──
      const players = (playerRows as RoundPlayer[]) || [];
      const phRows = (playerHoleRows as RoundPlayerHole[]) || [];
      if (players.length > 1) {
        const guestPlayers: LivePlayer[] = players
          .filter((p) => p.player_type !== "owner")
          .map((p) => ({
            id: `friend-${p.id}`,
            name: p.display_name,
            handicap: p.handicap?.toString() || "",
            allowancePercent: 95,
            type: (p.player_type === "friend" ? "friend" : "guest") as "friend" | "guest",
            team: "B",
            userId: p.user_id || null,
            username: p.username || null,
          }));
        setLivePlayers(guestPlayers);

        const scores: Record<string, string[]> = {};
        guestPlayers.forEach((gp) => {
          const dbPlayerId = gp.id.replace("friend-", "");
          const playerPhRows = phRows.filter((ph) => ph.round_player_id === dbPlayerId);
          const arr = Array.from({ length: targetHoles }, () => "");
          playerPhRows.forEach((ph) => {
            const idx = ph.hole_number - 1 - offset;
            if (idx >= 0 && idx < targetHoles && ph.gross_score != null) {
              arr[idx] = ph.gross_score.toString();
            }
          });
          scores[gp.id] = arr;
        });
        setPlayerHoleScores(scores);
      }

      setStep("holes");
    }
    loadDraft();
    return () => { cancelled = true; };
  }, [user]);

  // ── LocalStorage autosave (fires on every meaningful state change) ──
  const saveLocalDraft = useCallback(() => {
    if (!user) return;
    // Only save while the round is being actively set up or played, not
    // after it has been saved.
    if (step === "saved") return;
    saveRoundDraft(user.id, {
      existingRoundId,
      step,
      setupSubStep,
      scoreTab: "scorecard",
      holesPlayed,
      nineSelection,
      roundName,
      course,
      selectedCourse: selectedCourse
        ? {
            externalId: selectedCourse.id ?? null,
            cachedCourseId: selectedCourse.cachedCourseId ?? null,
            clubName: selectedCourse.clubName,
            courseName: selectedCourse.courseName,
            isManual: (selectedCourse.id ?? 0) < 0,
          }
        : null,
      selectedTee: selectedTee
        ? {
            id: selectedTee.id ?? null,
            teeName: selectedTee.teeName,
            courseRating: selectedTee.courseRating ?? null,
            slopeRating: selectedTee.slopeRating ?? null,
            totalYards: selectedTee.totalYards ?? null,
            totalMeters: selectedTee.totalMeters ?? null,
            parTotal: selectedTee.parTotal ?? null,
          }
        : null,
      teeColour,
      date,
      notes,
      visibility,
      competition,
      ownHandicap,
      ownAllowancePercent,
      selectedGames,
      roundIntent,
      livePlayers: livePlayers.map((p) => ({
        id: p.id, name: p.name, handicap: p.handicap,
        allowancePercent: p.allowancePercent, type: p.type, team: p.team,
        userId: p.userId, username: p.username, avatarUrl: p.avatarUrl,
      })),
      playerHoleScores,
      holes,
      currentHoleIndex,
      averageDrivingDistance,
      longestDrive,
      teeShotQuality,
      playingPartners,
    });
  }, [
    user, step, setupSubStep, existingRoundId, holesPlayed, nineSelection,
    roundName, course, selectedCourse, selectedTee, teeColour, date, notes,
    visibility, competition, ownHandicap, ownAllowancePercent, selectedGames,
    roundIntent, livePlayers, playerHoleScores, holes, currentHoleIndex,
    averageDrivingDistance, longestDrive, teeShotQuality, playingPartners,
  ]);

    const roundPayload = {
        user_id: user.id,
        status,
        target_holes: holesPlayed,
        completed_at: status === "completed" ? new Date().toISOString() : null,
        visibility,
        live_status: status === "completed" ? "finished" : stats.holesCompleted > 0 ? "paused" : "not_started",
        started_at: stats.holesCompleted > 0 ? new Date().toISOString() : null,
        finished_at: status === "completed" ? new Date().toISOString() : null,
        round_name: roundName || null,
        golf_course_id: selectedCourse?.cachedCourseId || null,
        golf_course_external_id: selectedCourse?.id || null,
        golf_course_tee_id: selectedTee?.id?.startsWith("saved-") || selectedTee?.id?.startsWith("api-") ? null : selectedTee?.id || null,
        course: course || null,
        date: date || todayIso(),
        score: stats.totalScore || null,
        fairways_hit: stats.fairwaysHit,
        fairways_possible: stats.fairwaysPossible,
        greens_in_regulation: stats.girs,
        putts: stats.totalPutts,
        penalty_shots: stats.penaltyShots,
        chip_shots: stats.chipShots,
        greenside_bunker_shots: stats.greensideBunkerShots,
        holes_played: stats.holesCompleted,
        tee_colour: teeColour || null,
        tee_name: selectedTee?.teeName || teeColour || null,
        course_rating: selectedTee?.courseRating ?? null,
        slope_rating: selectedTee?.slopeRating ?? null,
        total_yards: selectedTee?.totalYards ?? null,
        total_meters: selectedTee?.totalMeters ?? null,
        par_total: selectedTee?.parTotal ?? stats.totalPar ?? null,
        average_driving_distance: parseOptionalNumber(averageDrivingDistance),
        longest_drive: parseOptionalNumber(longestDrive),
        tee_shot_quality: teeShotQuality || null,
        playing_partners: playingPartners || livePlayers.map((player) => player.name).join(", ") || null,
        scramble_percentage: stats.scramblePercent,
        is_competition: competition,
        notes: [notes, liveRoundSummary].filter(Boolean).join("\n\n") || null,
        // Reliability + calculation-integrity fields:
        primary_game_type: selectedGames[0] || "stroke_play",
        handicap_allowance_percent: handicapAllowancePercent,
        gross_score: stats.totalScore || null,
        net_score: (stats.totalScore != null && ownHandicap)
          ? stats.totalScore - computePlayingHandicap(parseFloat(ownHandicap) || 0, handicapAllowancePercent)
          : null,
        auto_saved_at: new Date().toISOString(),
        client_draft_key: user?.id ? `athletigolf:round-draft:${user.id}` : null,
        match_result: buildMatchResultSnapshot(livePlayers, playerHoleScores, matchState, selectedGames) || null,
        tee_name_snapshot: selectedTee?.teeName || teeColour || null,
        tee_colour_snapshot: teeColour || null,
    };

  // Fire local autosave on every meaningful state change.
  useEffect(() => {
    saveLocalDraft();
  }, [saveLocalDraft]);

  // ── Backend flush (used by interval, background, and manual save) ──
  const flushToBackend = useCallback(async () => {
    const s = stateRef.current;
    if (!s.user || !s.existingRoundId) return;

    // Save round metadata (setup fields, notes, tee, etc.)
    const holeStartOffset = s.nineSelection === "back" ? 9 : 0;
    await supabase
      .from("rounds")
      .update({
        status: "unfinished",
        live_status: "live",
        auto_saved_at: new Date().toISOString(),
        round_name: s.roundName || null,
        course: s.course || null,
        date: s.date || todayIso(),
        target_holes: s.holesPlayed,
        golf_course_id: s.selectedCourse?.cachedCourseId || null,
        golf_course_external_id:
          s.selectedCourse && s.selectedCourse.id >= 0 ? s.selectedCourse.id : null,
        golf_course_tee_id:
          s.selectedTee?.id?.startsWith("saved-") ||
          s.selectedTee?.id?.startsWith("api-") ||
          s.selectedTee?.id?.startsWith("manual-")
            ? null
            : s.selectedTee?.id || null,
        tee_colour: s.teeColour || null,
        tee_name: s.selectedTee?.teeName || s.teeColour || null,
        course_rating: s.selectedTee?.courseRating ?? null,
        slope_rating: s.selectedTee?.slopeRating ?? null,
        total_yards: s.selectedTee?.totalYards ?? null,
        total_meters: s.selectedTee?.totalMeters ?? null,
        par_total: s.selectedTee?.parTotal ?? null,
        is_competition: s.competition,
        visibility: s.visibility,
        playing_partners:
          s.playingPartners || s.livePlayers.map((p) => p.name).join(", ") || null,
        notes: s.notes || null,
      })
      .eq("id", s.existingRoundId);

    // Upsert scored holes to round_holes
    const holeRows = s.holes
      .map((hole, index) => ({
        round_id: s.existingRoundId!,
        user_id: s.user!.id,
        hole_number: index + 1 + holeStartOffset,
        par: hole.par,
        score: hole.score === "" ? null : Number(hole.score),
        fairway_result: hole.par === 3 ? "na" : hole.fairway,
        tee_shot_location: hole.par === 3 ? null : hole.teeShotLocation || null,
        gir: hole.gir,
        putts: parseStat(hole.putts),
        yardage: hole.yardage,
        meters: hole.meters,
        handicap: hole.handicap,
        stroke_index: hole.handicap ?? null,
        tee_yardage: hole.yardage ?? null,
        tee_meters: hole.meters ?? null,
        penalty_shots: parseStat(hole.penaltyShots),
        chip_shots: parseStat(hole.chipShots),
        greenside_bunker_shots: parseStat(hole.greensideBunkerShots),
        recovery_shot_type: hole.recoveryShotType || null,
      }))
      .filter((row) => row.score !== null);

    if (holeRows.length > 0) {
      await supabase
        .from("round_holes")
        .upsert(holeRows, { onConflict: "round_id,hole_number" });
    }

    setLastSyncedAt(new Date());
  }, []);

  // ── Debounced backend autosave when score-changing state moves ──
  useEffect(() => {
    if (step !== "holes" || !existingRoundId) return;
    const timer = window.setTimeout(() => {
      void flushToBackend();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [holes, playerHoleScores, currentHoleIndex, step, existingRoundId, flushToBackend]);

  // ── Interval autosave (belt & braces every 8s while playing) ──
  useEffect(() => {
    if (step !== "holes" || !existingRoundId) return;
    const id = window.setInterval(() => { void flushToBackend(); }, 8000);
    return () => window.clearInterval(id);
  }, [step, existingRoundId, flushToBackend]);

  // ── Backend flush on backgrounding, page-hide, before unload ──
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") void flushToBackend();
    }
    function onPageHide() { void flushToBackend(); }
    function onBeforeUnload() { void flushToBackend(); }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [flushToBackend]);

  // ── Derived: match game flags ──
  const hasTeamGame = selectedGames.some((g) =>
    ["four_ball_stroke", "four_ball_match", "foursomes"].includes(g)
  );
  const hasMatchGame = selectedGames.some((g) =>
    ["match_play", "four_ball_match", "foursomes"].includes(g)
  );

  // ── Derived: participants ──
  const ownerDisplayName =
    getDisplayName(profile as any) ||
    (profile?.username ? `@${profile.username}` : "You");

  const liveParticipants = useMemo<LiveParticipant[]>(
    () => [
      {
        id: "owner",
        name: ownerDisplayName,
        handicap: ownHandicap,
        allowancePercent: ownAllowancePercent,
        type: "owner",
        team: "A",
        userId: user?.id || null,
        username: profile?.username || null,
        avatarUrl: profile?.avatar_url || null,
      },
      ...livePlayers,
    ],
    [livePlayers, ownHandicap, ownAllowancePercent, ownerDisplayName, profile, user?.id]
  );

  const teamCounts = useMemo(
    () =>
      liveParticipants.reduce(
        (acc, p) => { acc[p.team] += 1; return acc; },
        { A: 0, B: 0 }
      ),
    [liveParticipants]
  );

  // ── Stats ──
  const stats = useMemo(() => {
    const completed = holes.filter((h) => h.score !== "");
    const totalScore = completed.reduce((sum, h) => sum + Number(h.score), 0);
    const totalPar = completed.reduce((sum, h) => sum + h.par, 0);
    const totalPutts = completed.reduce((sum, h) => sum + parseStat(h.putts), 0);
    const fairwayHoles = completed.filter((h) => h.par !== 3);
    const fairwaysHit = fairwayHoles.filter((h) => h.fairway === "hit").length;
    const girs = completed.filter((h) => h.gir).length;
    const scrambleChances = completed.filter((h) => !h.gir);
    const successfulScrambles = scrambleChances.filter((h) => Number(h.score) <= h.par).length;
    const penaltyShots = completed.reduce((sum, h) => sum + parseStat(h.penaltyShots), 0);
    const chipShots = completed.reduce((sum, h) => sum + parseStat(h.chipShots), 0);
    const greensideBunkerShots = completed.reduce((sum, h) => sum + parseStat(h.greensideBunkerShots), 0);
    return {
      holesCompleted: completed.length,
      totalPar, totalScore,
      scoreToPar: totalScore - totalPar,
      totalPutts, fairwaysHit,
      fairwaysPossible: fairwayHoles.length,
      girs, penaltyShots, chipShots, greensideBunkerShots,
      scrambleChances: scrambleChances.length,
      successfulScrambles,
      fairwayPercent: fairwayHoles.length ? Math.round((fairwaysHit / fairwayHoles.length) * 100) : 0,
      girPercent: completed.length ? Math.round((girs / completed.length) * 100) : 0,
      scramblePercent: scrambleChances.length ? Math.round((successfulScrambles / scrambleChances.length) * 100) : null,
    };
  }, [holes]);

  const formatToPar = (score: number) => {
    if (!stats.holesCompleted) return "-";
    if (score === 0) return "E";
    return score > 0 ? `+${score}` : `${score}`;
  };

  // ── Leaderboard ──
  const liveLeaderboard = useMemo(() => {
    const ownerCompleted = holes.filter((h) => h.score !== "");
    const rows = [
      {
        id: "owner",
        name: ownerDisplayName,
        avatarUrl: profile?.avatar_url || null,
        team: "A" as "A" | "B",
        score: ownerCompleted.length ? ownerCompleted.reduce((s, h) => s + Number(h.score), 0) : null,
        toPar: ownerCompleted.length
          ? ownerCompleted.reduce((s, h) => s + Number(h.score), 0) -
            ownerCompleted.reduce((s, h) => s + h.par, 0)
          : null,
        holes: ownerCompleted.length,
      },
      ...livePlayers.map((p) => {
        const scores = playerHoleScores[p.id] || [];
        const completedScores = scores
          .map((sc, idx) => ({ score: sc === "" ? null : Number(sc), par: holes[idx]?.par ?? 4 }))
          .filter((item) => item.score !== null);
        const total = completedScores.reduce((s, item) => s + (item.score ?? 0), 0);
        const par = completedScores.reduce((s, item) => s + item.par, 0);
        return {
          id: p.id,
          name: p.name,
          avatarUrl: p.avatarUrl || null,
          team: p.team,
          score: completedScores.length ? total : null,
          toPar: completedScores.length ? total - par : null,
          holes: completedScores.length,
        };
      }),
    ];
    return rows.sort((a, b) => {
      if (a.score === null && b.score === null) return 0;
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return a.score - b.score;
    });
  }, [holes, livePlayers, ownerDisplayName, playerHoleScores, profile]);

  // ── Match state ──
  const matchState = useMemo(
    () => calculateMatchState(holes, liveParticipants, playerHoleScores, holesPlayed),
    [holes, liveParticipants, playerHoleScores, holesPlayed]
  );

  const selectedGameLabels = selectedGames
    .map((g) => liveGameOptions.find((o) => o.id === g)?.label || g)
    .join(", ");

  useEffect(() => {
    if (!hasMatchGame || !matchState.closeout || matchContinuedAfterCloseout || step !== "holes") return;
    setMatchDecision({ label: matchState.closeout, hole: matchState.holesPlayed });
  }, [hasMatchGame, matchContinuedAfterCloseout, matchState.closeout, matchState.holesPlayed, step]);

  // ── Allowance: sync default when games change ──
  useEffect(() => {
    const defaultAllowance = getDefaultAllowancePercent(selectedGames as GameFormat[]);
    setOwnAllowancePercent(defaultAllowance);
    setLivePlayers((prev) => prev.map((p) => ({ ...p, allowancePercent: defaultAllowance })));
  }, [selectedGames.join(",")]);

  // ── Hole mutations ──
  const updateHole = <K extends keyof Hole>(index: number, field: K, value: Hole[K]) => {
    const updatedHole = { ...holes[index], [field]: value };
    if (field === "par" && value === 3) {
      updatedHole.fairway = "na";
      updatedHole.teeShotLocation = "";
    }
    if (field === "fairway" && (value === "hit" || value === "na")) {
      updatedHole.teeShotLocation = "";
    }
    setHoles((prev) => prev.map((h, i) => (i === index ? updatedHole : h)));
    if (needsRecoveryChoice(updatedHole)) setRecoveryPromptIndex(index);
  };

  const applyTeeToHoles = (tee: GolfCourseTee | null, nextHoles = holesPlayed) => {
    if (!tee?.holes?.length) return;
    setHoles((prev) => {
      const base = prev.length === nextHoles ? prev : createHoles(nextHoles);
      return base.map((hole, idx) => {
        const ch = tee.holes.find((item) => item.holeNumber === idx + 1);
        if (!ch) return hole;
        return {
          ...hole,
          par: ch.par || hole.par,
          yardage: ch.yardage,
          meters: ch.meters,
          handicap: ch.handicap,
          fairway: (ch.par || hole.par) === 3 ? "na" : hole.fairway,
          teeShotLocation: (ch.par || hole.par) === 3 ? "" : hole.teeShotLocation,
        };
      });
    });
  };

  const handleCourseSelected = (courseDetail: GolfCourseDetail, tee: GolfCourseTee | null) => {
    setSelectedCourse(courseDetail);
    setCourse(courseDetail.courseName || courseDetail.clubName);
    setSelectedTee(tee);
    if (tee) { setTeeColour(tee.teeName); applyTeeToHoles(tee); }
  };

  const handleTeeSelected = (tee: GolfCourseTee | null) => {
    setSelectedTee(tee);
    if (tee) { setTeeColour(tee.teeName); applyTeeToHoles(tee); }
  };

  // ── Player management ──
  const addLivePlayer = () => {
    const name = newPlayerName.trim();
    if (!name) return;
    const defaultAllowance = getDefaultAllowancePercent(selectedGames as GameFormat[]);
    const player: LivePlayer = {
      id: `guest-${Date.now()}`,
      name,
      handicap: newPlayerHandicap.trim(),
      allowancePercent: newPlayerAllowance ? Number(newPlayerAllowance) : defaultAllowance,
      type: "guest",
      team: livePlayers.length % 2 === 0 ? "B" : "A",
      userId: null, username: null,
    };
    setLivePlayers((prev) => [...prev, player]);
    setPlayerHoleScores((prev) => ({
      ...prev,
      [player.id]: Array.from({ length: holesPlayed }, () => ""),
    }));
    setPlayingPartners((prev) => {
      const names = prev.split(",").map((s) => s.trim()).filter(Boolean);
      return [...new Set([...names, name])].join(", ");
    });
    setNewPlayerName(""); setNewPlayerHandicap(""); setNewPlayerAllowance("");
  };

  const addFriendPlayer = (friend: FriendConnectionProfile) => {
    if (livePlayers.some((p) => p.userId === friend.other_user_id)) return;
    const name =
      getDisplayName(friend as any) ||
      (friend.other_username ? `@${friend.other_username}` : `Friend ${friend.other_user_id.slice(0, 8)}`);
    const defaultAllowance = getDefaultAllowancePercent(selectedGames as GameFormat[]);
    const player: LivePlayer = {
      id: `friend-${friend.other_user_id}`,
      name,
      handicap: friend.other_golf_handicap == null ? "" : String(friend.other_golf_handicap),
      allowancePercent: defaultAllowance,
      type: "friend",
      team: livePlayers.length % 2 === 0 ? "B" : "A",
      userId: friend.other_user_id,
      username: friend.other_username,
      avatarUrl: friend.other_avatar_url,
    };
    setLivePlayers((prev) => [...prev, player]);
    setPlayerHoleScores((prev) => ({
      ...prev,
      [player.id]: Array.from({ length: holesPlayed }, () => ""),
    }));
    setPlayingPartners((prev) => {
      const names = prev.split(",").map((s) => s.trim()).filter(Boolean);
      return [...new Set([...names, name])].join(", ");
    });
  };

  const removeLivePlayer = (playerId: string) => {
    setLivePlayers((prev) => prev.filter((p) => p.id !== playerId));
    setPlayerHoleScores((prev) => { const next = { ...prev }; delete next[playerId]; return next; });
  };

  const updatePlayerTeam = (playerId: string, team: "A" | "B") =>
    setLivePlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, team } : p)));

  const updatePlayerAllowance = (playerId: string, pct: number) =>
    setLivePlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, allowancePercent: pct } : p)));

  const toggleGame = (game: LiveGame) => {
    setSelectedGames((prev) => {
      if (prev.includes(game)) {
        const next = prev.filter((g) => g !== game);
        return next.length ? next : ["stroke_play"];
      }
      return [...prev, game];
    });
  };

  const updatePlayerHoleScore = (playerId: string, holeIndex: number, score: string) => {
    setPlayerHoleScores((prev) => {
      const current = prev[playerId] || Array.from({ length: holesPlayed }, () => "");
      return { ...prev, [playerId]: current.map((v, i) => (i === holeIndex ? score : v)) };
    });
  };

  // ── Start round (creates draft in DB immediately) ──
  const startRound = async () => {
    if (hasMatchGame && liveParticipants.length < 2) {
      setSaveError("Add at least one opponent before starting match play.");
      return;
    }
    if (hasMatchGame && (!teamCounts.A || !teamCounts.B)) {
      setSaveError("Match games need players on both Team A and Team B.");
      return;
    }
    if (hasTeamGame && (teamCounts.A !== 2 || teamCounts.B !== 2)) {
      setSaveError("4BBB and foursomes need two players on each team.");
      return;
    }

    setSaving(true);
    setSaveError("");

    // Create a draft round immediately for server-side autosave
    if (!existingRoundId && user) {
      const { data: newRound, error: createError } = await supabase
        .from("rounds")
        .insert({
          user_id: user.id,
          status: "draft",
          target_holes: holesPlayed,
          visibility,
          live_status: "not_started",
          round_name: roundName || null,
          course: course || null,
          date: date || todayIso(),
          golf_course_id: selectedCourse?.cachedCourseId || null,
          golf_course_external_id: selectedCourse?.id || null,
          golf_course_tee_id: selectedTee?.id?.startsWith("saved-") ? null : selectedTee?.id || null,
          tee_colour: teeColour || null,
          tee_name: selectedTee?.teeName || teeColour || null,
          course_rating: selectedTee?.courseRating ?? null,
          slope_rating: selectedTee?.slopeRating ?? null,
          total_yards: selectedTee?.totalYards ?? null,
          total_meters: selectedTee?.totalMeters ?? null,
          par_total: selectedTee?.parTotal ?? null,
          is_competition: competition,
        })
        .select("id")
        .single();

      if (!createError && newRound) {
        setExistingRoundId(newRound.id);
      }
    }

    setSaving(false);

    // Apply tee hole data to holes state
    const nextHoles = createHoles(holesPlayed);
    setPlayerHoleScores(
      livePlayers.reduce<Record<string, string[]>>((acc, p) => {
        acc[p.id] = Array.from({ length: holesPlayed }, () => "");
        return acc;
      }, {})
    );
    if (selectedTee?.holes?.length) {
      setHoles(nextHoles.map((hole, idx) => {
        const ch = selectedTee.holes.find((item) => item.holeNumber === idx + 1);
        if (!ch) return hole;
        return {
          ...hole,
          par: ch.par || hole.par,
          yardage: ch.yardage,
          meters: ch.meters,
          handicap: ch.handicap,
          fairway: (ch.par || hole.par) === 3 ? "na" : hole.fairway,
        };
      }));
    } else {
      setHoles(nextHoles);
    }
    setCurrentHoleIndex(0);
    setSaveError("");
    setMatchDecision(null);
    setMatchContinuedAfterCloseout(false);
    setStep("holes");
  };

  // ── Manual save mid-round ──
  const saveNow = async () => {
    if (!user || !existingRoundId) return;
    setAutoSaving(true);
    setSaveError("");
    try {
      await flushToBackend();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save round.");
    } finally {
      setAutoSaving(false);
    }
  };

  // ── Finish round ──
  const finishRound = async (status: "completed" | "unfinished" = "completed") => {
    if (!user) return;
    if (!stats.holesCompleted) {
      setSaveError("Enter at least one hole before saving.");
      return;
    }
    if (status === "completed" && stats.holesCompleted !== holesPlayed) {
      setSaveError("Complete every hole before saving as finished, or save as unfinished.");
      return;
    }
    const unresolvedIdx = holes.findIndex(needsRecoveryChoice);
    if (unresolvedIdx >= 0) {
      setRecoveryPromptIndex(unresolvedIdx);
      setSaveError(`Choose whether hole ${unresolvedIdx + 1}'s one-putt came after a chip or bunker shot.`);
      return;
    }

    setSaving(true);
    setSaveError("");

    const liveRoundSummary = buildLiveRoundSummary({
      visibility, ownHandicap, games: selectedGameLabels,
      players: livePlayers, playerScores: playerHoleScores, holes, matchState, roundIntent,
    });

    const roundPayload = {
      user_id: user.id,
      status,
      target_holes: holesPlayed,
      completed_at: status === "completed" ? new Date().toISOString() : null,
      visibility,
      live_status: status === "completed" ? "finished" : "paused",
      started_at: new Date().toISOString(),
      finished_at: status === "completed" ? new Date().toISOString() : null,
      auto_saved_at: new Date().toISOString(),
      round_name: roundName || null,
      golf_course_id: selectedCourse?.cachedCourseId || null,
      golf_course_external_id: selectedCourse?.id || null,
      golf_course_tee_id:
        selectedTee?.id?.startsWith("saved-") || selectedTee?.id?.startsWith("api-")
          ? null
          : selectedTee?.id || null,
      course: course || null,
      date: date || todayIso(),
      score: stats.totalScore || null,
      fairways_hit: stats.fairwaysHit,
      fairways_possible: stats.fairwaysPossible,
      greens_in_regulation: stats.girs,
      putts: stats.totalPutts,
      penalty_shots: stats.penaltyShots,
      chip_shots: stats.chipShots,
      greenside_bunker_shots: stats.greensideBunkerShots,
      holes_played: stats.holesCompleted,
      tee_colour: teeColour || null,
      tee_name: selectedTee?.teeName || teeColour || null,
      course_rating: selectedTee?.courseRating ?? null,
      slope_rating: selectedTee?.slopeRating ?? null,
      total_yards: selectedTee?.totalYards ?? null,
      total_meters: selectedTee?.totalMeters ?? null,
      par_total: selectedTee?.parTotal ?? stats.totalPar ?? null,
      average_driving_distance: parseOptionalNumber(averageDrivingDistance),
      longest_drive: parseOptionalNumber(longestDrive),
      tee_shot_quality: teeShotQuality || null,
      playing_partners: playingPartners || livePlayers.map((p) => p.name).join(", ") || null,
      scramble_percentage: stats.scramblePercent,
      is_competition: competition,
      notes: [notes, liveRoundSummary].filter(Boolean).join("\n\n") || null,
    };

    const roundResult = existingRoundId
      ? await supabase.from("rounds").update(roundPayload).eq("id", existingRoundId).select("id").single()
      : await supabase.from("rounds").insert(roundPayload).select("id").single();
    const { data: round, error: roundError } = roundResult;

    if (roundError || !round) {
      setSaving(false);
      setSaveError(roundError?.message || "Could not save round.");
      return;
    }

    if (linkedQueueId && round.id) {
      await supabase.functions.invoke("strava-process-golf", {
        body: { action: "link", queueId: linkedQueueId, roundId: round.id },
      });
    }

    const holeRows = holes
      .map((hole, idx) => ({
        round_id: round.id,
        user_id: user.id,
        hole_number: idx + 1 + holeStartOffset,
        par: hole.par,
        score: hole.score === "" ? null : Number(hole.score),
        fairway_result: hole.par === 3 ? "na" : hole.fairway,
        tee_shot_location: hole.par === 3 ? null : hole.teeShotLocation || null,
        gir: hole.gir,
        putts: parseStat(hole.putts),
        yardage: hole.yardage,
        meters: hole.meters,
        handicap: hole.handicap,
        penalty_shots: parseStat(hole.penaltyShots),
        chip_shots: parseStat(hole.chipShots),
        greenside_bunker_shots: parseStat(hole.greensideBunkerShots),
        recovery_shot_type: hole.recoveryShotType || null,
      }))
      .filter((row) => row.score !== null);

    if (existingRoundId) {
      await supabase.from("round_holes").delete().eq("round_id", existingRoundId);
    }
    const { error: holesError } = await supabase.from("round_holes").insert(holeRows);
    if (holesError) { setSaving(false); setSaveError(holesError.message); return; }

    const liveError = await saveLiveRoundData({
      roundId: round.id, userId: user.id, status,
      holes, holesPlayed, liveParticipants, playerHoleScores,
      selectedGames, roundIntent, selectedTee,
      teeName: selectedTee?.teeName || teeColour || null, matchState,
      holeStartOffset,
    });

    setSaving(false);
    if (liveError) { setSaveError(liveError); return; }

    // Clear local draft
    clearRoundDraft(user.id);
    setSavedStatus(status);
    if (status === "completed") {
      clearRoundDraft(user?.id);
    }
    setAutoSavedAt(new Date());
    setStep("saved");
  };

  const reviewRound = () => {
    if (!stats.holesCompleted) { setSaveError("Enter at least one hole before finishing."); return; }
    setSaveError(""); setStep("review");
  };

  // Local-storage autosave: fires on every state change while playing.
  useEffect(() => {
    if (step !== "holes" || !user) return;
    saveRoundDraft(user.id, {
      version: 1,
      round_id: existingRoundId,
      updated_at: new Date().toISOString(),
      step,
      holes_played: holesPlayed,
      round_name: roundName,
      course,
      tee_name: selectedTee?.teeName || teeColour || "",
      tee_colour: teeColour,
      handicap_allowance_percent: handicapAllowancePercent,
      primary_game_type: selectedGames[0] || "stroke_play",
      players: livePlayers,
      holes,
      match_state: matchState,
      current_hole_index: currentHoleIndex,
      notes,
    });
    setAutoSavedAt(new Date());
  }, [step, user, existingRoundId, holes, currentHoleIndex, matchState, holesPlayed, roundName, course, teeColour, selectedTee, handicapAllowancePercent, selectedGames, livePlayers, notes]);

  // Background / tab-hide: flush to Supabase as unfinished so a device switch still recovers the round.
  useEffect(() => {
    if (step !== "holes") return;
    const flushToServer = () => {
      // Fire and forget - errors are tolerated because local snapshot is safe.
      if (existingRoundId) {
        supabase.from("rounds").update({ auto_saved_at: new Date().toISOString(), status: "unfinished" }).eq("id", existingRoundId).then(() => {});
      }
    };
    const onHide = () => { if (document.visibilityState === "hidden") flushToServer(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushToServer);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flushToServer);
    };
  }, [step, existingRoundId]);

  const resetRound = () => {
    setRoundName(""); setVisibility("friends"); setOwnHandicap(""); setOwnAllowancePercent(95);
    setLivePlayers([]); setNewPlayerName(""); setNewPlayerHandicap(""); setNewPlayerAllowance("");
    setSelectedGames(["stroke_play"]); setRoundIntent("casual");
    setMatchDecision(null); setMatchContinuedAfterCloseout(false);
    setPlayerHoleScores({}); setCourse(""); setSelectedCourse(null); setSelectedTee(null);
    setCompetition(false); setTeeColour(""); setPlayingPartners("");
    setAverageDrivingDistance(""); setLongestDrive(""); setTeeShotQuality("");
    setExistingRoundId(null); setSavedStatus("completed");
    setDate(todayIso()); setNotes(""); setHolesPlayed(18); setNineSelection("all");
    setHoles(createHoles(18));
    setCurrentHoleIndex(0); setSaveError(""); setSetupSubStep(1); setStep("setup");
    if (user) clearRoundDraft(user.id);
    navigate("/golf/submit");
  };

  // ── Current hole ──
  const holeStartOffset = nineSelection === "back" ? 9 : 0;
  const currentHole = holes[currentHoleIndex];
  const currentHoleScore =
    currentHole && currentHole.score !== "" ? Number(currentHole.score) - currentHole.par : null;

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Saved
  // ─────────────────────────────────────────────────────────────────────────────
  if (step === "saved") {
    const isMatchGame = selectedGames.some((g) => g === "match_play" || g === "four_ball_match");
    return (
      <div className="min-h-screen bg-cream p-6 text-dark">
        <Card className="mx-auto max-w-4xl p-8 text-center">
          <CheckCircle2 className="mx-auto mb-5 h-12 w-12 text-golf" />
          <h1 className="mb-3 text-4xl font-semibold">
            {savedStatus === "unfinished" ? "Round Saved As Unfinished" : "Round Saved"}
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-black/60">
            {savedStatus === "unfinished"
              ? "Saved in Round History. Resume it any time."
              : "Your round and hole-by-hole stats have been logged."}
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={resetRound} variant="golf">Start New Round</Button>
            <Link
              href="/golf"
              className="inline-flex items-center justify-center rounded-lg border border-line bg-white px-5 py-3 font-semibold text-dark transition hover:bg-steel/5"
            >
              View Round History
            </Link>
          </div>
        </Card>
        {isMatchGame && existingRoundId && (
          <div className="mx-auto mt-6 max-w-4xl">
            <PostRoundMatchAnalysis roundId={existingRoundId} />
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Setup
  // ─────────────────────────────────────────────────────────────────────────────

  const primaryGame = selectedGames[0] ?? "stroke_play";
  const defaultAllowance = getDefaultAllowancePercent(selectedGames as GameFormat[]);

  if (step === "setup") {
    return (
      <div className="min-h-screen bg-cream px-4 py-5 text-dark md:p-10">
        <div className="mx-auto max-w-3xl">
          <PageHeader
            eyebrow="Golf Form"
            title="Start Round"
            description="Set up in three steps, then score hole by hole."
            tone="text-golf"
          />

          {/* Step progress */}
          <div className="mb-8 flex items-center gap-3">
            {SETUP_STEPS.map((st, i) => (
              <div key={st.num} className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setupSubStep > st.num && setSetupSubStep(st.num)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition ${
                    setupSubStep === st.num
                      ? "bg-golf text-white"
                      : setupSubStep > st.num
                      ? "bg-golf/20 text-golf hover:bg-golf/30 cursor-pointer"
                      : "bg-steel/10 text-muted"
                  }`}
                >
                  {st.num}
                </button>
                <span className={`text-sm font-semibold ${setupSubStep === st.num ? "text-dark" : "text-muted"}`}>
                  {st.label}
                </span>
                {i < SETUP_STEPS.length - 1 && <div className="h-px w-8 bg-line" />}
              </div>
            ))}
          </div>

          {/* ── Step 1: Course ── */}
          {setupSubStep === 1 && (
            <Card className="p-6 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-golf/10 text-golf">
                  <Flag className="h-5 w-5" />
                </span>
                <h2 className="text-xl font-semibold">Course & Tees</h2>
              </div>

              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                <button
                  onClick={() => { setHolesPlayed(9); setNineSelection("front"); }}
                  data-testid="setup-front-nine"
                  className={`rounded-xl border p-5 text-left transition ${
                    holesPlayed === 9 && nineSelection === "front"
                      ? "border-golf bg-golf text-white"
                      : "border-line bg-steel/5 text-dark hover:border-golf/30"
                  }`}
                >
                  <p className="text-sm opacity-70">Round length</p>
                  <h2 className="mt-1 text-2xl font-semibold">Front 9</h2>
                  <p className="mt-1 text-xs opacity-70">Holes 1–9</p>
                </button>
                <button
                  onClick={() => { setHolesPlayed(9); setNineSelection("back"); }}
                  data-testid="setup-back-nine"
                  className={`rounded-xl border p-5 text-left transition ${
                    holesPlayed === 9 && nineSelection === "back"
                      ? "border-golf bg-golf text-white"
                      : "border-line bg-steel/5 text-dark hover:border-golf/30"
                  }`}
                >
                  <p className="text-sm opacity-70">Round length</p>
                  <h2 className="mt-1 text-2xl font-semibold">Back 9</h2>
                  <p className="mt-1 text-xs opacity-70">Holes 10–18</p>
                </button>
                <button
                  onClick={() => { setHolesPlayed(18); setNineSelection("all"); }}
                  data-testid="setup-eighteen"
                  className={`rounded-xl border p-5 text-left transition ${
                    holesPlayed === 18
                      ? "border-golf bg-golf text-white"
                      : "border-line bg-steel/5 text-dark hover:border-golf/30"
                  }`}
                >
                  <p className="text-sm opacity-70">Round length</p>
                  <h2 className="mt-1 text-2xl font-semibold">18 Holes</h2>
                  <p className="mt-1 text-xs opacity-70">Full round</p>
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <GolfCoursePicker
                    selectedCourse={selectedCourse}
                    selectedTee={selectedTee}
                    onCourseSelected={handleCourseSelected}
                    onTeeSelected={handleTeeSelected}
                  />
                  <div className="mt-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted">
                      Can't find the course, or the API is down? Enter par, stroke index and yardage by hand.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowManualCourseModal(true)}
                      className="rounded-full border border-golf/40 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-golf transition hover:bg-golf/5"
                      data-testid="open-manual-course"
                    >
                      Enter course manually
                    </button>
                  </div>
                </div>
                <Field label="Course name" value={course} onChange={(v) => { setCourse(v); if (selectedCourse && v !== selectedCourse.courseName) { setSelectedCourse(null); setSelectedTee(null); } }} />
                <Field label="Tees played" value={teeColour} onChange={setTeeColour} placeholder="White, Yellow, Red…" />
                {selectedTee && (
                  <>
                    <Field label="Course rating" value={selectedTee.courseRating?.toString() || ""} onChange={() => {}} />
                    <Field label="Slope rating" value={selectedTee.slopeRating?.toString() || ""} onChange={() => {}} />
                  </>
                )}
                <Field label="Round name" value={roundName} onChange={setRoundName} placeholder="Saturday medal, evening 9…" />
                <Field label="Date" value={date} onChange={setDate} type="date" />
                <SelectField label="Visibility" value={visibility} onChange={(v) => setVisibility(v as "private" | "friends")} options={["friends", "private"]} />
                <label className="flex items-center gap-3 rounded-lg border border-line px-5 py-4">
                  <input type="checkbox" checked={competition} onChange={(e) => setCompetition(e.target.checked)} />
                  <span className="font-medium">Competition round</span>
                </label>
              </div>

              <div className="mt-4 md:col-span-2">
                <label className="mb-2 block text-sm text-muted">Round notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-line px-4 py-3 outline-none focus:border-golf" />
              </div>

              <div className="mt-8 flex justify-end">
                <Button variant="golf" onClick={() => setSetupSubStep(2)}>
                  Next: Players
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* ── Step 2: Players ── */}
          {setupSubStep === 2 && (
            <Card className="p-6 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-golf/10 text-golf">
                  <Users className="h-5 w-5" />
                </span>
                <h2 className="text-xl font-semibold">Players</h2>
              </div>

              {/* Owner */}
              <div className="mb-5 rounded-2xl border border-golf/20 bg-golf/5 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-golf">You</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Handicap index" value={ownHandicap} onChange={setOwnHandicap} type="number" placeholder="e.g. 12.4" />
                  <div>
                    <label className="mb-2 block text-sm text-muted">Allowance %</label>
                    <input
                      type="number" min={0} max={100}
                      value={ownAllowancePercent}
                      onChange={(e) => setOwnAllowancePercent(Number(e.target.value))}
                      className="w-full rounded-lg border border-line px-4 py-3 outline-none focus:border-golf"
                    />
                  </div>
                  {selectedTee?.slopeRating && selectedTee.courseRating && selectedTee.parTotal && ownHandicap && (
                    <div className="flex flex-col justify-end">
                      <p className="text-xs text-muted">Course HCP</p>
                      <p className="text-2xl font-semibold text-golf">
                        {computeCourseHandicap(
                          parseHandicapIndex(ownHandicap),
                          selectedTee.slopeRating,
                          selectedTee.courseRating,
                          selectedTee.parTotal
                        )}
                      </p>
                      <p className="text-xs text-muted">
                        Playing HCP: {computePlayingHandicap(
                          computeCourseHandicap(
                            parseHandicapIndex(ownHandicap),
                            selectedTee.slopeRating,
                            selectedTee.courseRating,
                            selectedTee.parTotal
                          ),
                          ownAllowancePercent
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Friends */}
              {friends.length > 0 && (
                <div className="mb-5">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted">Add friends</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {friends.slice(0, 6).map((friend) => {
                      const alreadyAdded = livePlayers.some((p) => p.userId === friend.other_user_id);
                      const friendName = getDisplayName(friend as any) || (friend.other_username ? `@${friend.other_username}` : `Friend ${friend.other_user_id.slice(0, 8)}`);
                      return (
                        <button
                          key={friend.other_user_id}
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => addFriendPlayer(friend)}
                          className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white/70 p-3 text-left transition hover:border-golf/40 disabled:opacity-55"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <PlayerAvatar src={friend.other_avatar_url} name={friendName} />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-dark">{friendName}</span>
                              <span className="block text-xs text-muted">
                                {friend.other_golf_handicap == null ? "No handicap" : `HCP ${friend.other_golf_handicap}`}
                              </span>
                            </span>
                          </span>
                          <span className="shrink-0 rounded-full bg-golf/10 px-2.5 py-1 text-xs font-bold text-golf">
                            {alreadyAdded ? "Added" : "Add"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add guest */}
              <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_100px_100px_auto]">
                <Field label="Guest name" value={newPlayerName} onChange={setNewPlayerName} placeholder="Sam, Jack…" />
                <Field label="HCP index" value={newPlayerHandicap} onChange={setNewPlayerHandicap} type="number" placeholder="14.0" />
                <Field label="Allowance %" value={newPlayerAllowance} onChange={setNewPlayerAllowance} type="number" placeholder={String(defaultAllowance)} />
                <Button type="button" variant="golf" className="self-end" onClick={addLivePlayer}>
                  <UserPlus className="h-4 w-4" />
                  Add
                </Button>
              </div>

              {/* Current player list */}
              {livePlayers.length > 0 && (
                <div className="mb-4 space-y-2">
                  {livePlayers.map((player) => (
                    <div key={player.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white/70 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-dark">{player.name}</p>
                        <p className="text-xs text-muted">
                          {player.handicap ? `HCP ${player.handicap}` : "No HCP"} · Allowance {player.allowancePercent}%
                        </p>
                      </div>
                      <button type="button" onClick={() => removeLivePlayer(player.id)} className="text-xs font-semibold text-muted hover:text-danger">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 flex justify-between">
                <Button variant="secondary" onClick={() => setSetupSubStep(1)}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button variant="golf" onClick={() => setSetupSubStep(3)}>
                  Next: Game
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* ── Step 3: Game ── */}
          {setupSubStep === 3 && (
            <Card className="p-6 md:p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-golf/10 text-golf">
                  <Trophy className="h-5 w-5" />
                </span>
                <h2 className="text-xl font-semibold">Game Format</h2>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {liveGameOptions.map((game) => {
                  const active = selectedGames.includes(game.id);
                  return (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => toggleGame(game.id)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-golf bg-golf text-white"
                          : "border-line bg-panel text-dark hover:border-golf/35"
                      }`}
                    >
                      <span className="block text-sm font-semibold">{game.label}</span>
                      <span className={`mt-1 block text-xs ${active ? "text-white/70" : "text-muted"}`}>{game.detail}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-xl border border-golf/20 bg-golf/5 px-4 py-3 text-sm text-muted">
                Default allowance for <strong>{liveGameOptions.find((o) => o.id === primaryGame)?.label}</strong>: <strong>{defaultAllowance}%</strong>.
                Individual overrides set in step 2.
              </div>

              {/* Match setup */}
              {hasMatchGame && (
                <div className="mt-5 rounded-2xl border border-gold/25 bg-gold/10 p-4">
                  <div className="mb-4 flex items-start gap-3">
                    <Handshake className="mt-1 h-5 w-5 shrink-0 text-gold" />
                    <div>
                      <h3 className="font-semibold text-dark">Match setup</h3>
                      <p className="mt-1 text-sm text-muted">Assign teams and choose casual or competition.</p>
                    </div>
                  </div>
                  <div className="mb-4 grid gap-2 sm:grid-cols-2">
                    {(["casual", "competition"] as const).map((intent) => (
                      <button
                        key={intent}
                        type="button"
                        onClick={() => { setRoundIntent(intent); setCompetition(intent === "competition"); }}
                        className={`rounded-xl border px-4 py-3 text-left font-semibold capitalize transition ${
                          roundIntent === intent
                            ? "border-gold bg-gold text-dark"
                            : "border-line bg-panel text-dark hover:border-gold/40"
                        }`}
                      >
                        {intent} matchplay
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {liveParticipants.map((player) => (
                      <div key={player.id} className="grid gap-2 rounded-xl bg-panel p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                        <div>
                          <p className="font-semibold text-dark">{player.name}</p>
                          <p className="text-xs text-muted">
                            {player.type === "owner" ? "You" : player.type} {player.handicap ? `· HCP ${player.handicap}` : ""}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {(["A", "B"] as const).map((team) => (
                            <button
                              key={team}
                              type="button"
                              disabled={player.id === "owner" && team === "B"}
                              onClick={() => updatePlayerTeam(player.id, team)}
                              className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                                player.team === team
                                  ? team === "A"
                                    ? "bg-blue-500 text-white"
                                    : "bg-red-500 text-white"
                                  : "bg-steel/10 text-muted hover:bg-steel/15 disabled:opacity-40"
                              }`}
                            >
                              {team === "A" ? "🔵 A" : "🔴 B"}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs font-semibold text-muted">
                    Team A: {teamCounts.A} · Team B: {teamCounts.B}
                    {hasTeamGame ? " — 4BBB and foursomes need 2 vs 2." : ""}
                  </p>
                </div>
              )}

              {saveError && (
                <div className="mt-4 rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
                  {saveError}
                </div>
              )}

              <div className="mt-8 flex justify-between">
                <Button variant="secondary" onClick={() => setSetupSubStep(2)}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button variant="golf" onClick={startRound} disabled={saving}>
                  <Flag className="h-4 w-4" />
                  {saving ? "Creating round…" : "Start Hole Entry"}
                </Button>
              </div>
            </Card>
          )}
        </div>
        <ManualCourseModal
          open={showManualCourseModal}
          holesTotal={holesPlayed}
          initialName={course}
          onClose={() => setShowManualCourseModal(false)}
          onSaved={(courseDetail, tee) => {
            handleCourseSelected(courseDetail, tee);
            setShowManualCourseModal(false);
          }}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Holes + Review
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-cream text-dark">
      {/* ── Sticky scoring banner ── */}
      <div className="sticky top-0 z-30 border-b border-line bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Score</p>
              <p className="text-xl font-semibold leading-none text-dark">
                {stats.holesCompleted
                  ? `${stats.totalScore} (${formatToPar(stats.scoreToPar)})`
                  : "–"}
              </p>
            </div>
            <div className="h-6 w-px bg-line" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Holes</p>
              <p className="text-xl font-semibold leading-none text-dark">{stats.holesCompleted}/{holesPlayed}</p>
            </div>
            <div className="hidden h-6 w-px bg-line sm:block" />
            <p className="hidden truncate text-sm font-semibold text-muted sm:block">{selectedGameLabels}</p>
          </div>
          <div className="flex items-center gap-2">
            {lastSyncedAt && (
              <span
                className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-golf/70 sm:inline"
                data-testid="autosave-indicator"
              >
                Saved · {lastSyncedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <Button
              variant="secondary"
              className="px-3 py-2 text-xs"
              onClick={saveNow}
              disabled={autoSaving || !existingRoundId}
              title="Save round now"
              data-testid="save-round-button"
            >
              <Save className="h-4 w-4" />
              {autoSaving ? "Saving…" : "Save Round"}
            </Button>
            <Button
              variant="secondary"
              className="px-3 py-2 text-xs"
              onClick={() => setShowSettingsPanel((v) => !v)}
              data-testid="settings-toggle"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Settings drawer */}
      {showSettingsPanel && (
        <div className="border-b border-line bg-white px-4 py-4">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Avg driving distance" value={averageDrivingDistance} onChange={setAverageDrivingDistance} type="number" />
              <Field label="Longest drive" value={longestDrive} onChange={setLongestDrive} type="number" />
              <SelectField label="Tee shot quality" value={teeShotQuality} onChange={setTeeShotQuality} options={["", "excellent", "good", "mixed", "poor"]} />
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-5 md:p-8">
        {/* ── Stats strip ── */}
        <section className="mb-5 grid grid-cols-4 gap-3 md:grid-cols-8">
          <StatCard label="Score" value={<ScoreBadge score={stats.holesCompleted ? stats.totalScore : null} scoreToPar={stats.holesCompleted ? stats.scoreToPar : null} size="lg" />} tone="bg-white" />
          <StatCard label="To Par" value={<ScoreBadge score={formatToParValue(stats.scoreToPar)} scoreToPar={stats.holesCompleted ? stats.scoreToPar : null} size="lg" />} tone="bg-white" />
          <StatCard label="Holes" value={`${stats.holesCompleted}/${holesPlayed}`} tone="bg-white" />
          <StatCard label="Putts" value={stats.totalPutts || "–"} tone="bg-white" />
          <StatCard label="FIR" value={`${stats.fairwayPercent}%`} tone="bg-white" />
          <StatCard label="GIR" value={`${stats.girPercent}%`} tone="bg-white" />
          <StatCard label="Scramble" value={stats.scramblePercent === null ? "–" : `${stats.scramblePercent}%`} tone="bg-white" />
          <StatCard label="Penalties" value={stats.penaltyShots} tone="bg-white" />
        </section>

        {/* ── Hole entry ── */}
        {step === "holes" && currentHole && (
          <Card className="p-5 md:p-7">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-golf">
                  Hole {currentHoleIndex + 1 + holeStartOffset} of {nineSelection === "back" ? "18" : holesPlayed}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <ScoreBadge score={currentHole.score || null} par={currentHole.par} size="lg" />
                  <h2 className="text-4xl font-semibold">
                    {currentHole.score ? formatToParValue(currentHoleScore ?? 0) : "Not scored"}
                  </h2>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {(currentHole.yardage || currentHole.handicap) && (
                    <>
                      {currentHole.yardage ? `${currentHole.yardage} yd` : ""}
                      {currentHole.yardage && currentHole.handicap ? " / " : ""}
                      {currentHole.handicap ? `SI ${currentHole.handicap}` : ""}
                    </>
                  )}
                </p>
              </div>

             {/* Hole nav dots */}
<div className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible">
  {holes.map((hole, index) => (
    <button
      key={index}
      onClick={() => setCurrentHoleIndex(index)}
      className={`h-10 w-10 rounded-lg border text-sm font-semibold transition ${
        index === currentHoleIndex
          ? "border-golf bg-golf text-white"
          : hole.score
            ? "border-golf/30 bg-golf/10 text-golf"
            : "border-line bg-white text-muted hover:border-golf/40"
      }`}
      aria-label={`Hole ${index + 1 + holeStartOffset}`}
    >
      {index + 1 + holeStartOffset}
    </button>
  ))}
</div>

<div className="mt-5">
  <HandicapAllowanceSelector
    format={(selectedGames[0] as GameFormat) || "stroke_play"}
    value={handicapAllowancePercent}
    onChange={setHandicapAllowancePercent}
    numPlayersOnSide={Math.max(1, Math.round(livePlayers.length / 2))}
  />
</div>

{currentHoleIndex === 8 && holesPlayed === 18 && (
  <div className="mb-5 rounded-lg border border-gold/30 bg-gold/10 px-4 py-3 text-sm font-medium text-dark">
    Turn after this hole.
  </div>
)}

{/* Leaderboard */}
<div className="mb-6 rounded-2xl border border-line bg-panel p-4">
  <div className="mb-3 flex items-center gap-2">
    <Trophy className="h-5 w-5 text-golf" />
    <h3 className="font-semibold text-dark">
      Live leaderboard
    </h3>
  </div>

  <div className="space-y-2">
    {liveLeaderboard.map((player, idx) => {
      const teamColour =
        hasMatchGame
          ? player.team === "A"
            ? "border-l-4 border-blue-500"
            : "border-l-4 border-red-500"
          : "";

      return (
        <div
          key={player.id}
          className={`flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 ${teamColour}`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <PlayerAvatar
              src={player.avatarUrl}
              name={player.name}
            />

            <div className="min-w-0">
              <p className="truncate font-semibold text-dark">
                {idx + 1}. {player.name}
              </p>

              <p className="text-xs text-muted">
                {player.holes}/{holesPlayed}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="flex justify-end">
              <ScoreBadge
                score={player.score}
                scoreToPar={player.toPar}
              />
            </p>

            <p className="mt-1 flex justify-end">
              <ScoreBadge
                score={
                  player.toPar === null
                    ? null
                    : formatToParValue(player.toPar)
                }
                scoreToPar={player.toPar}
                size="sm"
              />
            </p>
          </div>
        </div>
      );
    })}
  </div>
</div>

                  <div className="rounded-2xl border border-golf/20 bg-golf/5 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-golf" />
                      <h3 className="font-semibold text-dark">Live round feed</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-muted">
                      V1 keeps this round friends-only and now saves the live player/game data so friends can follow the card.
                    </p>
                    {hasMatchGame && (
                      <div className="mt-4 rounded-xl border border-golf/20 bg-panel p-3">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-golf">Match status</p>
                        <h4 className="mt-2 text-2xl font-semibold text-dark">{matchState.label}</h4>
                        <p className="mt-1 text-xs text-muted">
                          {matchState.holesPlayed} holes counted / {matchState.holesRemaining} to play
                        </p>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                          <span className="rounded-lg bg-golf/10 px-2 py-2 font-bold text-golf">{matchState.teamAWins} Team A</span>
                          <span className="rounded-lg bg-steel/10 px-2 py-2 font-bold text-muted">{matchState.halved} Halved</span>
                          <span className="rounded-lg bg-pulse/10 px-2 py-2 font-bold text-pulse">{matchState.teamBWins} Team B</span>
                        </div>
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedGames.map((game) => (
                        <span key={game} className="rounded-full bg-dark px-3 py-1 text-xs font-bold text-white">
                          {liveGameOptions.find((option) => option.id === game)?.label || game}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                  <SelectField
                    label="Par"
                    value={currentHole.par.toString()}
                    onChange={(value) => {
                      const nextPar = Number(value);
                      updateHole(currentHoleIndex, "par", nextPar);
                    }}
                    options={["3", "4", "5"]}
                  />

                  <Field
                    label="Score"
                    type="number"
                    value={currentHole.score}
                    onChange={(value) =>
                      updateHole(currentHoleIndex, "score", value)
                    }
                  />

                  <SelectField
                    label="Fairway"
                    value={currentHole.fairway}
                    disabled={currentHole.par === 3}
                    onChange={(value) =>
                      updateHole(
                        currentHoleIndex,
                        "fairway",
                        value as FairwayResult
                      )
                    }
                    options={["na", "hit", "left", "right", "miss"]}
                  />

                  {currentHole.par !== 3 &&
                    currentHole.fairway !== "hit" &&
                    currentHole.fairway !== "na" && (
                      <SelectField
                        label="Where did it finish?"
                        value={currentHole.teeShotLocation || ""}
                        onChange={(value) =>
                          updateHole(
                            currentHoleIndex,
                            "teeShotLocation",
                            value as "" | TeeShotLocation
                          )
                        }
                        options={[
                          "",
                          "rough",
                          "fairway_bunker",
                          "woods",
                          "water",
                          "out_of_bounds",
                          "other_fairway",
                          "other",
                        ]}
                      />
                    )}

                  <label className="flex items-center gap-3 rounded-lg border border-line px-4 py-3">
                    <input
                      type="checkbox"
                      checked={currentHole.gir}
                      onChange={(event) =>
                        updateHole(
                          currentHoleIndex,
                          "gir",
                          event.target.checked
                        )
                      }
                    />
                    <span className="text-sm font-medium">GIR</span>
                  </label>
                  <Field
                    label="Putts"
                    type="number"
                    value={currentHole.putts}
                    onChange={(value) => updateHole(currentHoleIndex, "putts", value)}
                  />
                  {livePlayers.map((player) => (
                    <Field
                      key={player.id}
                      label={`${player.name} score`}
                      type="number"
                      value={playerHoleScores[player.id]?.[currentHoleIndex] || ""}
                      onChange={(value) => updatePlayerHoleScore(player.id, currentHoleIndex, value)}
                    />
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-gold/25 bg-gold/10 p-4">
                  <div className="mb-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Post-round detail</p>
                    <p className="mt-1 text-sm text-muted">
                      Optional while you play. These are easier to tidy during review when the round is done.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                  <Field
                    label="Penalties"
                    type="number"
                    value={currentHole.penaltyShots}
                    onChange={(value) =>
                      updateHole(currentHoleIndex, "penaltyShots", value)
                    }
                  />
                  <Field
                    label="Chips"
                    type="number"
                    value={currentHole.chipShots}
                    onChange={(value) => updateHole(currentHoleIndex, "chipShots", value)}
                  />
                  <Field
                    label="Bunkers"
                    type="number"
                    value={currentHole.greensideBunkerShots}
                    onChange={(value) =>
                      updateHole(currentHoleIndex, "greensideBunkerShots", value)
                    }
                  />
                  </div>
                </div>

                <div className="mt-8 rounded-xl border border-line bg-panel p-3 lg:flex lg:items-center lg:justify-between">
                  <Button
                    variant="secondary"
                    onClick={goToPreviousHole}
                    disabled={currentHoleIndex === 0}
                    className="w-full lg:w-auto"
                  >
                    Previous
                  </Button>
                  <div className="mt-3 flex flex-col gap-3 sm:grid sm:grid-cols-3 lg:mt-0 lg:flex lg:flex-row">
                    <Button
                      variant="secondary"
                      onClick={goToNextHole}
                      disabled={currentHoleIndex === holesPlayed - 1}
                      className="w-full"
                    >
                      Skip Hole
                    </Button>
                    {currentHoleIndex < holesPlayed - 1 ? (
                      <Button variant="golf" onClick={goToNextHole} className="w-full">
                        Next Hole
                      </Button>
                    ) : (
                      <Button variant="golf" onClick={reviewRound} className="w-full">
                        Finish
                      </Button>
                    )}
                    {currentHoleIndex < holesPlayed - 1 && (
                      <Button variant="golf" onClick={reviewRound} className="w-full">
                        Finish
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {step === "review" && (
              <Card className="mb-6 border-golf/20 bg-golf/5">
                <h2 className="mb-2 text-2xl font-semibold text-golf">
                  Review Before Saving
                </h2>
                <p className="text-black/60">
                  Check the summary and hole details below. Skipped holes will stay out
                  of the saved stats.
                </p>
              </Card>
            )}

            {step === "review" && (
              <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-steel/10 text-muted">
                      <tr>
                        <th className="p-4">Hole</th>
                        <th className="p-4">Par</th>
                        <th className="p-4">Yards</th>
                        <th className="p-4">SI</th>
                        <th className="p-4">Score</th>
                        <th className="p-4">Fairway</th>
                        <th className="p-4">Tee lie</th>
                        <th className="p-4">GIR</th>
                        <th className="p-4">Putts</th>
                        <th className="p-4">Pen</th>
                        <th className="p-4">Short game</th>
                        <th className="p-4">Edit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holes.map((hole, index) => (
                        <tr key={index} className="border-t border-line">
                          <td className="p-4 font-semibold">{index + 1}</td>
                          <td className="p-4">{hole.par}</td>
                          <td className="p-4">{hole.yardage || "-"}</td>
                          <td className="p-4">{hole.handicap || "-"}</td>
                          <td className="p-4">
                            {hole.score ? (
                              <ScoreBadge score={hole.score} par={hole.par} size="sm" />
                            ) : (
                              <span className="rounded-full bg-steel/10 px-3 py-1 text-xs font-semibold text-muted">
                                Skipped
                              </span>
                            )}
                          </td>
                          <td className="p-4 capitalize">{formatOption(hole.fairway)}</td>
                          <td className="p-4 capitalize">
                            {hole.teeShotLocation ? formatOption(hole.teeShotLocation) : "-"}
                          </td>
                          <td className="p-4">{hole.gir ? "Yes" : "No"}</td>
                          <td className="p-4">{hole.putts || "-"}</td>
                          <td className="p-4">{hole.penaltyShots || "0"}</td>
                          <td className="p-4">
                            {parseStat(hole.chipShots) + parseStat(hole.greensideBunkerShots)}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => {
                                setCurrentHoleIndex(index);
                                setStep("holes");
                              }}
                              className="font-semibold text-golf"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {recoveryPromptIndex !== null && holes[recoveryPromptIndex] && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                <button
                  className="absolute inset-0 bg-black/45"
                  onClick={() => setRecoveryPromptIndex(null)}
                  aria-label="Close recovery choice"
                />
                <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-golf">
                    Hole {recoveryPromptIndex + 1}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-dark">
                    What recovery shot came before putting?
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    This hole has both a greenside bunker shot and a chip shot. Choose the recovery shot that led into putting so it counts as either an up-and-down chance or a sand-save chance, not both.
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <Button
                      variant="golf"
                      onClick={() => {
                        updateHole(recoveryPromptIndex, "recoveryShotType", "chip");
                        setRecoveryPromptIndex(null);
                      }}
                    >
                      Chip shot
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        updateHole(recoveryPromptIndex, "recoveryShotType", "sand");
                        setRecoveryPromptIndex(null);
                      }}
                    >
                      Bunker shot
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {matchDecision && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                <button
                  className="absolute inset-0 bg-black/45"
                  onClick={() => {
                    setMatchContinuedAfterCloseout(true);
                    setMatchDecision(null);
                  }}
                  aria-label="Keep scoring after match closeout"
                />
                <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                  <div className="mb-4 flex items-start gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold text-dark">
                      <AlertTriangle className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Match closed</p>
                      <h2 className="mt-2 text-2xl font-semibold text-dark">{matchDecision.label}</h2>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-muted">
                    The match result is decided on hole {matchDecision.hole}. You can stop the match here, or keep entering the remaining holes for normal round stats.
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setMatchContinuedAfterCloseout(true);
                        setMatchDecision(null);
                      }}
                    >
                      Keep Playing
                    </Button>
                    <Button
                      variant="golf"
                      onClick={() => {
                        setMatchDecision(null);
                        setStep("review");
                      }}
                    >
                      Finish Match Now
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {saveError && (
  <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
    {saveError}
  </div>
)}

{step === "review" && (
  <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
    <Button
      variant="secondary"
      onClick={() => setStep("holes")}
    >
      <ArrowLeft className="h-4 w-4" />
      Back To Hole Entry
    </Button>

    <div className="flex flex-col gap-3 sm:flex-row">
      <Button
        onClick={() => finishRound("unfinished")}
        disabled={saving}
        variant="secondary"
      >
        <Save className="h-4 w-4" />
        {saving ? "Saving..." : "Save Unfinished"}
      </Button>

      <Button
        onClick={() => finishRound("completed")}
        disabled={saving}
        variant="golf"
      >
        <Save className="h-4 w-4" />
        {saving ? "Saving..." : "Save Finished Round"}
      </Button>
    </div>
  </div>
)}

            {/* Short game detail */}
            <div className="mt-5 rounded-2xl border border-gold/25 bg-gold/10 p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-gold">Short game detail</p>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Penalties" type="number" value={currentHole.penaltyShots} onChange={(v) => updateHole(currentHoleIndex, "penaltyShots", v)} />
                <Field label="Chips" type="number" value={currentHole.chipShots} onChange={(v) => updateHole(currentHoleIndex, "chipShots", v)} />
                <Field label="Bunkers" type="number" value={currentHole.greensideBunkerShots} onChange={(v) => updateHole(currentHoleIndex, "greensideBunkerShots", v)} />
              </div>
            </div>

          {/* Navigation */}
<div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
  <Button
    variant="secondary"
    onClick={() =>
      setCurrentHoleIndex((i) => Math.max(i - 1, 0))
    }
    disabled={currentHoleIndex === 0}
  >
    <ChevronLeft className="h-4 w-4" />
    Previous
  </Button>

  <div className="flex gap-3">
    {currentHoleIndex < holesPlayed - 1 && (
      <>
        <Button
          variant="secondary"
          onClick={() =>
            setCurrentHoleIndex((i) =>
              Math.min(i + 1, holesPlayed - 1)
            )
          }
        >
          Skip
        </Button>

        <Button
          variant="golf"
          onClick={() =>
            setCurrentHoleIndex((i) =>
              Math.min(i + 1, holesPlayed - 1)
            )
          }
        >
          Next Hole
          <ChevronRight className="h-4 w-4" />
        </Button>
      </>
    )}

    <Button
      variant="golf"
      onClick={reviewRound}
    >
      Finish
    </Button>
  </div>
</div>                               
        {/* ── Match decision overlay ── */}
        {matchDecision && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <button className="absolute inset-0 bg-black/45" onClick={() => { setMatchContinuedAfterCloseout(true); setMatchDecision(null); }} aria-label="Keep playing" />
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold text-dark">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Match decided</p>
                  <h2 className="mt-2 text-2xl font-semibold text-dark">{matchDecision.label}</h2>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-muted">
                Match result decided on hole {matchDecision.hole}. Stop here or keep scoring for round stats.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Button variant="secondary" onClick={() => { setMatchContinuedAfterCloseout(true); setMatchDecision(null); }}>Keep Playing</Button>
                <Button variant="golf" onClick={() => { setMatchDecision(null); setStep("review"); }}>Finish Match</Button>
              </div>
            </div>
          </div>
        )}

        {saveError && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {saveError}
          </div>
        )}

        {/* ── Bottom actions ── */}
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button variant="secondary" onClick={() => step === "holes" ? setStep("setup") : setStep("holes")}>
            <ArrowLeft className="h-4 w-4" />
            {step === "holes" ? "Back To Setup" : "Back To Holes"}
          </Button>
          {step === "review" && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => finishRound("unfinished")} disabled={saving} variant="secondary">
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save Unfinished"}
              </Button>
              <Button onClick={() => finishRound("completed")} disabled={saving} variant="golf">
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save Finished Round"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlayerAvatar({ src, name }: { src?: string | null; name: string }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-dark text-sm font-bold text-white">
      {src ? <img src={src} alt={`${name} avatar`} className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
    </span>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-muted">{label}</label>
      <input
        type={type}
        min={type === "number" ? 0 : undefined}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line px-4 py-3 outline-none focus:border-golf disabled:bg-steel/5 disabled:text-muted"
      />
    </div>
  );
}

function SelectField({
  label, value, onChange, options, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-muted">{label}</label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-white px-4 py-3 capitalize outline-none focus:border-golf disabled:bg-steel/5 disabled:text-muted"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{formatOption(opt)}</option>
        ))}
      </select>
    </div>
  );
}

// ─── WHS per-participant (used in saveLiveRoundData) ──────────────────────────

function resolveStrokesReceived(
  participant: LiveParticipant,
  holeHandicap: number | null,
  holesPlayed: 9 | 18,
  selectedTee: GolfCourseTee | null
): number {
  const ph = getParticipantPlayingHandicap(participant, selectedTee, holesPlayed);
  return getStrokesReceived(ph, holeHandicap, holesPlayed);
}


// ─── Match state ──────────────────────────────────────────────────────────────

function calculateMatchState(
  holes: Hole[],
  players: LiveParticipant[],
  playerScores: Record<string, string[]>,
  holesPlayed: number
) {
  let teamAWins = 0, teamBWins = 0, halved = 0;
  const holeResults: Array<{
    hole: number; label: string; leader: "A" | "B" | "AS";
    teamAScore: number | null; teamBScore: number | null; matchLabel: string;
  }> = [];

  holes.forEach((hole, index) => {
    const teamAScore = getTeamHoleScore("A", index, holes, players, playerScores);
    const teamBScore = getTeamHoleScore("B", index, holes, players, playerScores);
    if (teamAScore === null || teamBScore === null) return;
    let leader: "A" | "B" | "AS" = "AS";
    let label = "Halved";
    if (teamAScore < teamBScore) { teamAWins++; leader = "A"; label = "Team A wins"; }
    else if (teamBScore < teamAScore) { teamBWins++; leader = "B"; label = "Team B wins"; }
    else halved++;
    const lead = teamAWins - teamBWins;
    holeResults.push({ hole: index + 1, label, leader, teamAScore, teamBScore, matchLabel: formatMatchLabel(lead) });
  });

  const lead = teamAWins - teamBWins;
  const countedHoles = holeResults.length;
  const holesRemaining = Math.max(holesPlayed - countedHoles, 0);
  const leaderName = lead > 0 ? "Team A" : lead < 0 ? "Team B" : "";
  const closeout = Math.abs(lead) > holesRemaining && countedHoles > 0
    ? `${leaderName} wins ${Math.abs(lead)}&${holesRemaining}`
    : null;

  return {
    label: closeout || formatMatchLabel(lead),
    closeout, teamAWins, teamBWins, halved,
    holesPlayed: countedHoles, holesRemaining, holeResults,
  };
}

function getTeamHoleScore(
  team: "A" | "B", holeIndex: number, holes: Hole[],
  players: LiveParticipant[], playerScores: Record<string, string[]>
) {
  const scores = players
    .filter((p) => p.team === team)
    .map((p) => getParticipantScore(p.id, holeIndex, holes, playerScores))
    .filter((s): s is number => s !== null);
  return scores.length ? Math.min(...scores) : null;
}

function getParticipantScore(
  playerId: string, holeIndex: number, holes: Hole[], playerScores: Record<string, string[]>
) {
  const raw = playerId === "owner" ? holes[holeIndex]?.score : playerScores[playerId]?.[holeIndex];
  if (raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function formatMatchLabel(lead: number) {
  if (lead === 0) return "All square";
  return `${lead > 0 ? "Team A" : "Team B"} ${Math.abs(lead)} Up`;
}

// ─── Skins ────────────────────────────────────────────────────────────────────

function calculateSkinsState(
  holes: Hole[], players: LiveParticipant[],
  playerScores: Record<string, string[]>, holesPlayed: 9 | 18,
  selectedTee: GolfCourseTee | null
) {
  let carryover = 0;
  const playerSkins = new Map<string, number>();
  const holeResults: Array<{
    hole: number; label: string; winningPlayerId: string | null;
    skinsAwarded: number; carryover: number;
  }> = [];

  holes.slice(0, holesPlayed).forEach((hole, index) => {
    const scoredPlayers = players
      .map((p) => ({ player: p, score: getParticipantScore(p.id, index, holes, playerScores) }))
      .filter((item): item is { player: LiveParticipant; score: number } => item.score !== null);
    if (!scoredPlayers.length) return;
    const best = Math.min(...scoredPlayers.map((i) => i.score));
    const winners = scoredPlayers.filter((i) => i.score === best);
    if (winners.length === 1) {
      const skinsAwarded = carryover + 1;
      const winner = winners[0].player;
      playerSkins.set(winner.id, (playerSkins.get(winner.id) || 0) + skinsAwarded);
      holeResults.push({ hole: index + 1, label: `${winner.name} wins ${skinsAwarded} skin${skinsAwarded === 1 ? "" : "s"}`, winningPlayerId: winner.id, skinsAwarded, carryover });
      carryover = 0;
    } else {
      carryover++;
      holeResults.push({ hole: index + 1, label: `Carryover (${carryover})`, winningPlayerId: null, skinsAwarded: 0, carryover });
    }
  });

  return { playerSkins, holeResults, carryover };
}

// ─── Participant totals ───────────────────────────────────────────────────────

function getParticipantTotals(
  player: LiveParticipant, holes: Hole[],
  playerScores: Record<string, string[]>, holesPlayed: 9 | 18,
  selectedTee: GolfCourseTee | null
) {
  let gross = 0, net = 0, points = 0, completed = 0;
  holes.forEach((hole, index) => {
    const score = getParticipantScore(player.id, index, holes, playerScores);
    if (score === null) return;
    const sr = resolveStrokesReceived(player, hole.handicap, holesPlayed, selectedTee);
    gross += score;
    net += score - sr;
    points += stablefordPoints(score, hole.par, sr);
    completed++;
  });
  return { gross, net, points, completed };
}

// ─── Summary ──────────────────────────────────────────────────────────────────

function buildLiveRoundSummary({
  visibility, ownHandicap, games, players, playerScores, holes, matchState, roundIntent,
}: {
  visibility: "private" | "friends"; ownHandicap: string; games: string;
  players: LivePlayer[]; playerScores: Record<string, string[]>;
  holes: Hole[]; matchState: ReturnType<typeof calculateMatchState>; roundIntent: string;
}) {
  const lines = [
    "Live round setup",
    `Visibility: ${visibility}`,
    `Games: ${games || "Stroke play"}`,
    `Match type: ${roundIntent}`,
    ownHandicap ? `Your handicap index: ${ownHandicap}` : "",
    matchState.holesPlayed ? `Match result: ${matchState.label}` : "",
  ].filter(Boolean);
  if (players.length) {
    lines.push("Playing partners:");
    players.forEach((p) => {
      const scores = (playerScores[p.id] || []).map((sc, idx) => {
        if (!sc) return null;
        const hole = holes[idx];
        return `H${idx + 1}: ${sc}${hole ? ` (par ${hole.par})` : ""}`;
      }).filter(Boolean).join(", ");
      lines.push(`- ${p.name}${p.handicap ? `, HCP ${p.handicap}` : ""}, Team ${p.team}${scores ? ` / ${scores}` : ""}`);
    });
  }
  return lines.join("\n");
}

// ─── Save live round data ─────────────────────────────────────────────────────

async function saveLiveRoundData({
  roundId, userId, status, holes, holesPlayed, liveParticipants,
  playerHoleScores, selectedGames, roundIntent, selectedTee, teeName, matchState,
  holeStartOffset,
}: {
  roundId: string; userId: string; status: "completed" | "unfinished";
  holes: Hole[]; holesPlayed: 9 | 18; liveParticipants: LiveParticipant[];
  playerHoleScores: Record<string, string[]>; selectedGames: LiveGame[];
  roundIntent: "casual" | "competition"; selectedTee: GolfCourseTee | null;
  teeName: string | null; matchState: ReturnType<typeof calculateMatchState>;
  holeStartOffset: number;
}) {
  // Clean up previous live data
  const cleanupTables = ["round_game_results", "round_game_holes", "round_games", "round_player_holes", "round_players", "round_sides"];
  for (const table of cleanupTables) {
    const { error } = await supabase.from(table).delete().eq("round_id", roundId);
    if (error) return error.message;
  }

  const hasTeamFormat = selectedGames.some((g) => ["four_ball_stroke", "four_ball_match", "foursomes"].includes(g));
  const sideRows: LiveSideRow[] =
    hasTeamFormat || selectedGames.includes("match_play")
      ? [
          { round_id: roundId, name: "Team A", side_type: hasTeamFormat ? "pair" : "team", side_order: 1 },
          { round_id: roundId, name: "Team B", side_type: hasTeamFormat ? "pair" : "team", side_order: 2 },
        ]
      : liveParticipants.map((p, i) => ({
          round_id: roundId, name: p.name, side_type: "individual", side_order: i + 1,
        }));

  const { data: sides, error: sideError } = await supabase.from("round_sides").insert(sideRows).select("id,name,side_order");
  if (sideError || !sides) return sideError?.message || "Could not save sides.";

  const sideIdByParticipant = new Map<string, string>();
  liveParticipants.forEach((p, i) => {
    const side = hasTeamFormat || selectedGames.includes("match_play")
      ? sides.find((s) => s.name === `Team ${p.team}`)
      : sides[i];
    if (side?.id) sideIdByParticipant.set(p.id, side.id);
  });

  const playerRows = liveParticipants.map((p, i) => {
    const ph = getParticipantPlayingHandicap(p, selectedTee, holesPlayed);
    const ch = selectedTee?.slopeRating && selectedTee.courseRating && selectedTee.parTotal
      ? computeCourseHandicap(parseHandicapIndex(p.handicap), selectedTee.slopeRating, selectedTee.courseRating, selectedTee.parTotal)
      : parseHandicapIndex(p.handicap);
    return {
      round_id: roundId,
      side_id: sideIdByParticipant.get(p.id) || null,
      user_id: p.type === "owner" ? userId : p.userId || null,
      invited_by: p.type === "owner" ? null : userId,
      player_type: p.type,
      display_name: p.name,
      username: p.username || null,
      handicap: parseHandicapIndex(p.handicap) || null,
      course_handicap: ch || null,
      playing_handicap: ph || null,
      handicap_allowance_percent: p.allowancePercent,
      tee_name: teeName,
      tee_colour: teeName,
      player_order: i + 1,
      is_owner: p.type === "owner",
      can_edit_scores: p.type === "owner",
    };
  });

  const { data: savedPlayers, error: playerError } = await supabase.from("round_players").insert(playerRows).select("id,display_name,player_order");
  if (playerError || !savedPlayers) return playerError?.message || "Could not save players.";

  const playerIdByLocalId = new Map<string, string>();
  liveParticipants.forEach((p, i) => {
    const saved = savedPlayers.find((r) => r.player_order === i + 1);
    if (saved?.id) playerIdByLocalId.set(p.id, saved.id);
  });

  const playerHoleRows: LivePlayerHoleRow[] = liveParticipants.flatMap((p) =>
    holes.map((hole, index): LivePlayerHoleRow | null => {
      const score = getParticipantScore(p.id, index, holes, playerHoleScores);
      const savedPlayerId = playerIdByLocalId.get(p.id);
      if (score === null || !savedPlayerId) return null;
      const sr = resolveStrokesReceived(p, hole.handicap, holesPlayed, selectedTee);
      return {
        round_id: roundId,
        round_player_id: savedPlayerId,
        side_id: sideIdByParticipant.get(p.id) || null,
        hole_number: index + 1 + holeStartOffset,
        gross_score: score,
        net_score: score - sr,
        stableford_points: stablefordPoints(score, hole.par, sr),
        strokes_received: sr,
        picked_up: false, conceded: false, notes: null,
      };
    }).filter((r): r is LivePlayerHoleRow => r !== null)
  );

  if (playerHoleRows.length) {
    const { error } = await supabase.from("round_player_holes").insert(playerHoleRows);
    if (error) return error.message;
  }

  const gameRows = selectedGames.map((game) => ({
    round_id: roundId,
    created_by: userId,
    game_type: game,
    scoring_basis: game === "stableford" ? "points" : game.includes("match") || game === "foursomes" ? "holes" : game === "skins" ? "skins" : "gross",
    handicap_mode: liveParticipants.some((p) => p.handicap.trim()) ? "allowance" : "none",
    name: liveGameOptions.find((o) => o.id === game)?.label || game,
    settings: { roundIntent, teams: liveParticipants.map((p) => ({ name: p.name, team: p.team, type: p.type })), holesPlayed },
    status: status === "completed" ? "finished" : "active",
  }));

  const { data: savedGames, error: gameError } = await supabase.from("round_games").insert(gameRows).select("id,game_type");
  if (gameError || !savedGames) return gameError?.message || "Could not save games.";

  const sideAId = sides.find((s) => s.name === "Team A")?.id || null;
  const sideBId = sides.find((s) => s.name === "Team B")?.id || null;
  const skinsState = calculateSkinsState(holes, liveParticipants, playerHoleScores, holesPlayed, selectedTee);

  const gameHoleRows: LiveGameHoleRow[] = savedGames.flatMap((game) => {
    if (game.game_type === "skins") {
      return skinsState.holeResults.map<LiveGameHoleRow>((r) => ({
        round_game_id: game.id, round_id: roundId, hole_number: r.hole + holeStartOffset,
        winning_player_id: r.winningPlayerId ? playerIdByLocalId.get(r.winningPlayerId) || null : null,
        winning_side_id: null, result_label: r.label, carryover_count: r.carryover,
        points: { skinsAwarded: r.skinsAwarded }, match_state: { carryover: r.carryover },
      }));
    }
    if (!["match_play", "four_ball_match", "foursomes"].includes(game.game_type)) return [];
    return matchState.holeResults.map<LiveGameHoleRow>((r) => ({
      round_game_id: game.id, round_id: roundId, hole_number: r.hole + holeStartOffset,
      winning_player_id: null,
      winning_side_id: r.leader === "A" ? sideAId : r.leader === "B" ? sideBId : null,
      result_label: r.label, carryover_count: 0,
      points: { teamAScore: r.teamAScore, teamBScore: r.teamBScore },
      match_state: { label: r.matchLabel, leader: r.leader },
    }));
  });

  if (gameHoleRows.length) {
    const { error } = await supabase.from("round_game_holes").insert(gameHoleRows);
    if (error) return error.message;
  }

  const resultRows: LiveGameResultRow[] = [];
  savedGames.forEach((game) => {
    if (["match_play", "four_ball_match", "foursomes"].includes(game.game_type)) {
      resultRows.push(
        {
          round_game_id: game.id, round_id: roundId, round_player_id: null, side_id: sideAId,
          position: matchState.teamAWins >= matchState.teamBWins ? 1 : 2,
          total_gross: null, total_net: null, total_points: null,
          holes_won: matchState.teamAWins, skins_won: null,
          result_label: matchState.label,
          result_payload: { team: "A", roundIntent, closeout: matchState.closeout },
        },
        {
          round_game_id: game.id, round_id: roundId, round_player_id: null, side_id: sideBId,
          position: matchState.teamBWins > matchState.teamAWins ? 1 : 2,
          total_gross: null, total_net: null, total_points: null,
          holes_won: matchState.teamBWins, skins_won: null,
          result_label: matchState.label,
          result_payload: { team: "B", roundIntent, closeout: matchState.closeout },
        }
      );
      return;
    }
    const totals = liveParticipants
      .map((p) => ({ player: p, totals: getParticipantTotals(p, holes, playerHoleScores, holesPlayed, selectedTee) }))
      .filter((r) => r.totals.completed > 0)
      .sort((a, b) => {
        if (game.game_type === "stableford") return b.totals.points - a.totals.points;
        if (game.game_type === "medal") return a.totals.net - b.totals.net;
        if (game.game_type === "skins") return (skinsState.playerSkins.get(b.player.id) || 0) - (skinsState.playerSkins.get(a.player.id) || 0);
        return a.totals.gross - b.totals.gross;
      });

    totals.forEach((row, i) => {
      const skinsWon = game.game_type === "skins" ? skinsState.playerSkins.get(row.player.id) || 0 : null;
      resultRows.push({
        round_game_id: game.id, round_id: roundId,
        round_player_id: playerIdByLocalId.get(row.player.id) || null,
        side_id: sideIdByParticipant.get(row.player.id) || null,
        position: i + 1,
        total_gross: row.totals.gross || null,
        total_net: row.totals.net || null,
        total_points: game.game_type === "stableford" ? row.totals.points : null,
        holes_won: null, skins_won: skinsWon,
        result_label: game.game_type === "stableford" ? `${row.totals.points} pts`
          : game.game_type === "skins" ? `${skinsWon || 0} skin${skinsWon === 1 ? "" : "s"}`
          : game.game_type === "medal" ? `Net ${row.totals.net}`
          : `Gross ${row.totals.gross}`,
        result_payload: { roundIntent, playerName: row.player.name, holesCompleted: row.totals.completed },
      });
    });
  });

  const { error: resultError } = await supabase.from("round_game_results").insert(resultRows);
  return resultError?.message || null;
}

function timeAgoLabel(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.round(min / 60)}h ago`;
}

type MatchResultSnapshot = {
  primary_game_type: string;
  sides: Array<{ id: string; name: string; team_colour: "blue" | "red" | null; won: number; lost: number; halved: number }>;
  result_label: string;
  finish_hole: number | null;
} | null;

function buildMatchResultSnapshot(
  livePlayers: LivePlayer[],
  playerHoleScores: Record<string, string[]>,
  matchState: ReturnType<typeof calculateMatchState>,
  selectedGames: LiveGame[]
): MatchResultSnapshot {
  const isMatch = selectedGames.some((g) => g === "match_play" || g === "four_ball_match");
  if (!isMatch) return null;

  const teamA = livePlayers.filter((p) => p.team === "A");
  const teamB = livePlayers.filter((p) => p.team === "B");
  if (!teamA.length || !teamB.length) return null;

  // Count won/lost/halved by comparing best team score per hole.
  const totalHoles = Math.max(0, ...Object.values(playerHoleScores).map((arr) => arr.length));
  let won = 0, lost = 0, halved = 0;
  for (let i = 0; i < totalHoles; i++) {
    const a = teamBestScore(teamA, playerHoleScores, i);
    const b = teamBestScore(teamB, playerHoleScores, i);
    if (a == null || b == null) continue;
    if (a < b) won++;
    else if (a > b) lost++;
    else halved++;
  }

  return {
    primary_game_type: selectedGames[0] || "match_play",
    sides: [
      { id: "team-a", name: "Blue Team", team_colour: "blue", won, lost, halved },
      { id: "team-b", name: "Red Team",  team_colour: "red",  won: lost, lost: won, halved },
    ],
    result_label: matchState?.status || (won === lost ? "AS" : won > lost ? `${won - lost} UP` : `${lost - won} DOWN`),
    finish_hole: matchState?.closeout ? (matchState?.holesPlayed || null) : null,
  };
}

function teamBestScore(team: LivePlayer[], scores: Record<string, string[]>, holeIndex: number): number | null {
  let best: number | null = null;
  for (const p of team) {
    const raw = scores[p.id]?.[holeIndex];
    const val = raw ? Number(raw) : null;
    if (val != null && !Number.isNaN(val)) {
      best = best == null ? val : Math.min(best, val);
    }
  }
  return best;
}
