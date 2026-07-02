export type Profile = {
  id: string;
  full_name: string | null;
  age: number | null;
  height: string | null;
  weight: string | null;
  golf_handicap: number | null;
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
    targets?: {
      calories: number;
      proteinGrams: number;
      waterLitres: number;
      sleepHours: number;
    };
  };
  privacy?: {
    defaultLiveVisibility: "friends" | "private";
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
  average_driving_distance?: number | null;
  longest_drive?: number | null;
  tee_shot_quality?: string | null;
  scramble_percentage: number | null;
  is_competition: boolean;
  notes: string | null;
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
  created_at: string;
  updated_at?: string | null;
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
