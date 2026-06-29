export type Profile = {
  id: string;
  full_name: string | null;
  age: number | null;
  height: string | null;
  weight: string | null;
  golf_handicap: number | null;
  created_at: string;
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
  created_at: string;
};
