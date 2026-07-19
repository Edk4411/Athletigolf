export type Profile = {
  id: string;
  full_name: string | null;
  username?: string | null;
  username_search?: string | null;
  show_display_name_in_search?: boolean | null;
  age: number | null;
  height: string | null;
  weight: string | null;
  golf_handicap: number | null;
  avatar_url?: string | null;
  bio?: string | null;
  home_course?: string | null;
  main_goal?: string | null;
  onboarding_completed?: boolean | null;
  onboarding_completed_at?: string | null;
  onboarding_data?: OnboardingData | null;
  created_at: string;
};

export type OnboardingData = {
  mainSport?: "golf" | "training" | "both" | "other";
  fullName: string;
  mainGoal: string;
  wellness?: {
    goal: string;
    age: string;
    heightCm: string;
    weightKg: string;
    sex: string;
    activityLevel: string;
    targetBodyweight: string;
    tracking?: WellnessTrackingPreferences;
    targets?: {
      calories: number;
      proteinGrams: number;
      waterLitres: number;
      sleepHours: number;
    };
  };
  privacy?: {
    defaultLiveVisibility: "friends" | "private";
    notificationsEnabled?: boolean;
  };
  social?: {
    username?: string;
    showDisplayNameInSearch?: boolean;
  };
  golf: {
    homeCourse: string;
    handicap: string;
    scoringGoal: string;
    biggestWeakness: string;
    practiceAvailability: string;
    upcomingCompetition: string;
  };
  training: {
    experience: string;
    daysAvailable: string;
    sessionLength: string;
    equipment: string;
    goal: string;
    injuries: string;
    restDays: string[];
  };
};

export type Round = {
  id: string;
  user_id: string;
  status?: "draft" | "unfinished" | "completed";
  visibility?: "private" | "friends" | "team" | "public";
  live_status?: "not_started" | "live" | "paused" | "finished";
  target_holes?: number | null;
  round_name?: string | null;
  golf_course_id?: string | null;
  golf_course_external_id?: number | null;
  golf_course_tee_id?: string | null;
  course: string | null;
  date: string | null;
  score: number | null;
  fairways_hit: number | null;
  fairways_possible?: number | null;
  greens_in_regulation: number | null;
  putts: number | null;
  penalty_shots?: number | null;
  chip_shots?: number | null;
  greenside_bunker_shots?: number | null;
  holes_played?: number | null;
  tee_colour?: string | null;
  tee_name?: string | null;
  course_rating?: number | null;
  slope_rating?: number | null;
  total_yards?: number | null;
  total_meters?: number | null;
  par_total?: number | null;
  average_driving_distance?: number | null;
  longest_drive?: number | null;
  tee_shot_quality?: string | null;
  playing_partners?: string | null;
  scramble_percentage: number | null;
  is_competition: boolean;
  notes: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  share_token?: string | null;
  completed_at?: string | null;
  created_at: string;
};

export type RoundSide = {
  id: string;
  round_id: string;
  name: string | null;
  side_type: "individual" | "pair" | "team";
  side_order: number;
  created_at: string;
};

export type RoundPlayer = {
  id: string;
  round_id: string;
  side_id: string | null;
  user_id: string | null;
  invited_by: string | null;
  player_type: "owner" | "friend" | "guest";
  display_name: string;
  username?: string | null;
  avatar_url?: string | null;
  handicap: number | null;
  course_handicap: number | null;
  playing_handicap: number | null;
  tee_name: string | null;
  tee_colour: string | null;
  player_order: number;
  is_owner: boolean;
  can_edit_scores: boolean;
  created_at: string;
};

export type RoundPlayerHole = {
  id: string;
  round_id: string;
  round_player_id: string;
  side_id: string | null;
  hole_number: number;
  gross_score: number | null;
  net_score: number | null;
  stableford_points: number | null;
  strokes_received: number;
  picked_up: boolean;
  conceded: boolean;
  notes: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type RoundGame = {
  id: string;
  round_id: string;
  created_by: string | null;
  game_type:
    | "stroke_play"
    | "medal"
    | "stableford"
    | "match_play"
    | "skins"
    | "four_ball_stroke"
    | "four_ball_match"
    | "foursomes"
    | "scramble"
    | "greensomes"
    | "nassau"
    | "custom";
  scoring_basis: "gross" | "net" | "points" | "holes" | "skins" | "custom";
  handicap_mode: "none" | "full" | "allowance" | "course_handicap" | "manual";
  name: string | null;
  settings: Record<string, unknown>;
  status: "active" | "finished" | "cancelled";
  created_at: string;
};

export type RoundGameHole = {
  id: string;
  round_game_id: string;
  round_id: string;
  hole_number: number;
  winning_player_id: string | null;
  winning_side_id: string | null;
  result_label: string | null;
  carryover_count: number;
  points: Record<string, unknown>;
  match_state: Record<string, unknown>;
  created_at: string;
};

export type RoundGameResult = {
  id: string;
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
  result_label: string | null;
  result_payload: Record<string, unknown>;
  created_at: string;
};

export type RoundWatcher = {
  id: string;
  round_id: string;
  watcher_user_id: string;
  role: "follower" | "coach" | "team" | "admin";
  can_comment: boolean;
  invited_by: string | null;
  created_at: string;
};

export type RoundComment = {
  id: string;
  round_id: string;
  hole_number: number | null;
  author_user_id: string | null;
  comment_type: "comment" | "coach_note" | "post_round_review";
  body: string | null;
  media_url: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type RoundReaction = {
  id: string;
  round_id: string;
  author_user_id: string | null;
  target_type: "round" | "hole" | "player_hole" | "comment" | "media";
  target_id: string | null;
  hole_number: number | null;
  reaction: "like" | "fire" | "poop";
  created_at: string;
};

export type RoundMedia = {
  id: string;
  round_id: string;
  hole_number: number | null;
  uploaded_by: string | null;
  media_type: "image" | "video";
  url: string;
  caption: string | null;
  created_at: string;
};

export type FairwayResult =
  | "hit"
  | "left"
  | "right"
  | "miss"
  | "na";

export type TeeShotLocation =
  | "rough"
  | "fairway_bunker"
  | "woods"
  | "water"
  | "out_of_bounds"
  | "other_fairway"
  | "other";

export type RoundHole = {
  id: string;
  round_id: string;
  user_id: string;
  hole_number: number;
  par: number;
  score: number | null;
  fairway_result: FairwayResult | null;
  tee_shot_location?: TeeShotLocation | null;
  gir: boolean;
  putts: number | null;
  yardage?: number | null;
  meters?: number | null;
  handicap?: number | null;
  penalty_shots: number | null;
  chip_shots: number | null;
  greenside_bunker_shots: number | null;
  recovery_shot_type?: "chip" | "sand" | null;
  created_at: string;
};

export type ExerciseLog = {
  name: string;
  weight: string;
  sets: string;
  reps: string;
  notes: string;
  weight_value?: number | null;
  sets_value?: number | null;
  reps_value?: number | null;
  volume?: number | null;
  muscle_group?: string | null;
};

export type Workout = {
  id: string;
  user_id: string;
  date: string | null;
  workout_name: string | null;
  exercises: ExerciseLog[];
  notes: string | null;
  created_at: string;
};

export type CardioSession = {
  id: string;
  user_id: string;
  activity_type: "run" | "walk";
  session_date: string;
  distance_km: number | null;
  duration_minutes: number | null;
  avg_heart_rate: number | null;
  calories: number | null;
  perceived_effort: number | null;
  route_name: string | null;
  notes: string | null;
  source: "manual" | "strava";
  external_id?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type StravaConnection = {
  user_id: string;
  athlete_id: number;
  athlete_name: string | null;
  scope: string;
  expires_at: number;
  last_imported_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PracticeSession = {
  id: string;
  user_id: string;
  practice_type: string;
  duration_minutes: number;
  focus_area: string | null;
  rating: number | null;
  drills?: PracticeDrill[] | null;
  drill_name?: string | null;
  drill_attempts?: number | null;
  drill_successes?: number | null;
  drill_distance?: string | null;
  notes: string | null;
  created_at: string;
};

export type PracticeDrill = {
  name: string;
  distance?: string | null;
  attempts?: number | null;
  successes?: number | null;
};

export type SplitDay = {
  id: string;
  user_id: string;
  day_name: string;
  split_name: string;
  exercises: string[];
  archived_at?: string | null;
  created_at: string;
};

export type Competition = {
  id: string;
  user_id: string;
  name: string;
  course: string | null;
  competition_date: string;
  start_time?: string | null;
  priority: "low" | "medium" | "high";
  target_score: number | null;
  focus_area: string | null;
  notes: string | null;
  status: "upcoming" | "completed" | "cancelled";
  result_score?: number | null;
  reflection_strength?: string | null;
  reflection_weakness?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type WellnessTrackingPreferences = {
  food: boolean;
  water: boolean;
  sleep: boolean;
  body: boolean;
  heartRate: boolean;
  bloodPressure: boolean;
};

export type WellnessLog = {
  id: string;
  user_id: string;
  log_date: string;
  water_litres: number | null;
  calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fats_grams: number | null;
  bodyweight: number | null;
  sleep_hours: number | null;
  resting_heart_rate?: number | null;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  energy_rating: number | null;
  notes: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type NutritionEntry = {
  id: string;
  user_id: string;
  log_date: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  food_name: string;
  serving: string | null;
  calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fats_grams: number | null;
  saturated_fats_grams?: number | null;
  sugars_grams?: number | null;
  source?: "manual" | "open_food_facts" | "usda" | null;
  external_id?: string | null;
  brand?: string | null;
  barcode?: string | null;
  serving_grams?: number | null;
  serving_label?: string | null;
  calories_per_100g?: number | null;
  protein_per_100g?: number | null;
  carbs_per_100g?: number | null;
  fats_per_100g?: number | null;
  saturated_fats_per_100g?: number | null;
  sugars_per_100g?: number | null;
  created_at: string;
  updated_at?: string | null;
};

export type SavedFood = {
  id: string;
  user_id: string;
  food_name: string;
  serving: string | null;
  calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fats_grams: number | null;
  saturated_fats_grams?: number | null;
  sugars_grams?: number | null;
  source?: "manual" | "open_food_facts" | "usda" | null;
  external_id?: string | null;
  brand?: string | null;
  barcode?: string | null;
  serving_grams?: number | null;
  serving_label?: string | null;
  calories_per_100g?: number | null;
  protein_per_100g?: number | null;
  carbs_per_100g?: number | null;
  fats_per_100g?: number | null;
  saturated_fats_per_100g?: number | null;
  sugars_per_100g?: number | null;
  created_at: string;
  updated_at?: string | null;
};

export type FoodSearchResult = {
  id: string;
  source: "open_food_facts" | "usda";
  name: string;
  brand: string | null;
  barcode: string | null;
  servingLabel: string | null;
  servingGrams: number | null;
  caloriesPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatsPer100g: number | null;
  saturatedFatsPer100g: number | null;
  sugarsPer100g: number | null;
};

export type FriendConnection = {
  id: string;
  requester_id: string;
  receiver_id: string;
  requester_label?: string | null;
  receiver_label?: string | null;
  status: "pending" | "accepted" | "blocked";
  created_at: string;
  updated_at?: string | null;
};

export type FriendSearchResult = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url?: string | null;
  golf_handicap?: number | null;
  relationship_status: FriendConnection["status"] | null;
  relationship_direction: "none" | "incoming" | "outgoing" | "accepted";
};

export type FriendConnectionProfile = FriendConnection & {
  other_user_id: string;
  other_username: string | null;
  other_display_name: string | null;
  other_avatar_url?: string | null;
  other_golf_handicap?: number | null;
};

export type GolfCourseSearchResult = {
  id: number;
  clubName: string;
  courseName: string;
  location: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
};

export type GolfCourseHole = {
  holeNumber: number;
  par: number | null;
  yardage: number | null;
  meters: number | null;
  handicap: number | null;
};

export type GolfCourseTee = {
  id: string;
  gender: string;
  teeName: string;
  courseRating: number | null;
  slopeRating: number | null;
  bogeyRating: number | null;
  totalYards: number | null;
  totalMeters: number | null;
  numberOfHoles: number | null;
  parTotal: number | null;
  holes: GolfCourseHole[];
};

export type GolfCourseDetail = GolfCourseSearchResult & {
  cachedCourseId: string | null;
  tees: GolfCourseTee[];
};

export type FriendProfileSummary = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  home_course?: string | null;
  golf_handicap?: number | null;
  main_sport: string | null;
  main_goal: string | null;
  created_at: string;
  relationship_label: string | null;
};

export type LiveActivity = {
  id: string;
  user_id: string;
  activity_type: "gym" | "course" | "practice" | "available";
  location_name: string | null;
  detail: string | null;
  visibility: "friends" | "private";
  started_at: string;
  expires_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type FeedbackReport = {
  id: string;
  user_id: string | null;
  category: "feedback" | "bug" | "feature" | "confusing" | "other";
  title: string;
  message: string;
  page_url: string | null;
  device_context: string | null;
  status: "new" | "reviewing" | "resolved" | "closed";
  deleted_at?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type AppNotification = {
  id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  type: "alpha_feedback" | "friend_live_activity" | "system";
  title: string;
  body: string | null;
  link_path: string | null;
  read_at: string | null;
  created_at: string;
};
