CREATE TABLE IF NOT EXISTS public.exercise_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category text NOT NULL,
  primary_muscles text[] NOT NULL DEFAULT '{}',
  secondary_muscles text[] DEFAULT '{}',
  equipment text NOT NULL,
  difficulty text NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  movement_type text NOT NULL CHECK (movement_type IN ('push', 'pull', 'squat', 'hinge', 'carry', 'rotation', 'anti-rotation', 'cardio', 'core', 'mobility')),
  instructions text,
  form_cues text[] DEFAULT '{}',
  common_mistakes text[] DEFAULT '{}',
  safety_notes text,
  golf_relevant boolean NOT NULL DEFAULT false,
  golf_benefit text,
  alternatives text[] DEFAULT '{}',
  youtube_search text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read exercise library" ON public.exercise_library;
CREATE POLICY "Authenticated users can read exercise library"
ON public.exercise_library
FOR SELECT
TO authenticated
USING (true);

WITH generated_exercises AS (
  SELECT *
  FROM (
    VALUES
      ('Chest', ARRAY['Chest'], ARRAY['Shoulders','Triceps'], 'push', true, 'Pressing strength supports upper-body force and trunk bracing.'),
      ('Back', ARRAY['Back'], ARRAY['Biceps','Rear Delts'], 'pull', true, 'Back strength helps posture, control and speed transfer.'),
      ('Legs', ARRAY['Quads','Glutes'], ARRAY['Hamstrings','Core'], 'squat', true, 'Lower-body strength improves ground force and stability.'),
      ('Posterior Chain', ARRAY['Hamstrings','Glutes'], ARRAY['Back','Core'], 'hinge', true, 'Hip hinge strength supports rotation, speed and lower-back resilience.'),
      ('Shoulders', ARRAY['Shoulders'], ARRAY['Upper Back','Triceps'], 'push', true, 'Shoulder capacity helps handle golf and gym volume.'),
      ('Arms', ARRAY['Arms'], ARRAY['Forearms'], 'pull', false, 'Arm work supports balanced training and grip capacity.'),
      ('Core', ARRAY['Core'], ARRAY['Glutes','Shoulders'], 'core', true, 'Trunk control helps transfer force through the swing.'),
      ('Rotation', ARRAY['Obliques','Core'], ARRAY['Hips','Shoulders'], 'rotation', true, 'Rotational power and control carry directly into golf speed.'),
      ('Anti-Rotation', ARRAY['Core','Obliques'], ARRAY['Glutes','Shoulders'], 'anti-rotation', true, 'Anti-rotation work builds control and protects positions.'),
      ('Cardio', ARRAY['Cardiovascular System'], ARRAY['Legs'], 'cardio', true, 'Aerobic fitness supports walking rounds and recovery.'),
      ('Mobility', ARRAY['Mobility'], ARRAY['Hips','T-Spine','Shoulders'], 'mobility', true, 'Mobility work supports cleaner swing positions and recovery.'),
      ('Golf-Specific', ARRAY['Core','Hips'], ARRAY['Glutes','Shoulders'], 'rotation', true, 'Golf-specific drills connect gym qualities to swing movement.')
  ) AS category_seed(category, primary_muscles, secondary_muscles, default_movement, golf_relevant, golf_benefit)
),
movement_templates AS (
  SELECT *
  FROM (
    VALUES
      ('Chest', 'Bench Press', 'Barbell', 'intermediate', 'push'),
      ('Chest', 'Dumbbell Bench Press', 'Dumbbells', 'beginner', 'push'),
      ('Chest', 'Incline Dumbbell Press', 'Dumbbells', 'beginner', 'push'),
      ('Chest', 'Machine Chest Press', 'Machine', 'beginner', 'push'),
      ('Chest', 'Cable Fly', 'Cable', 'beginner', 'push'),
      ('Chest', 'Push Up', 'Bodyweight', 'beginner', 'push'),
      ('Chest', 'Landmine Press', 'Landmine', 'beginner', 'push'),
      ('Back', 'Lat Pulldown', 'Cable', 'beginner', 'pull'),
      ('Back', 'Seated Cable Row', 'Cable', 'beginner', 'pull'),
      ('Back', 'Chest Supported Row', 'Machine', 'beginner', 'pull'),
      ('Back', 'Single Arm Dumbbell Row', 'Dumbbells', 'beginner', 'pull'),
      ('Back', 'Pull Up', 'Bodyweight', 'intermediate', 'pull'),
      ('Back', 'Assisted Pull Up', 'Machine', 'beginner', 'pull'),
      ('Back', 'Face Pull', 'Cable', 'beginner', 'pull'),
      ('Legs', 'Back Squat', 'Barbell', 'intermediate', 'squat'),
      ('Legs', 'Front Squat', 'Barbell', 'advanced', 'squat'),
      ('Legs', 'Goblet Squat', 'Kettlebell', 'beginner', 'squat'),
      ('Legs', 'Leg Press', 'Machine', 'beginner', 'squat'),
      ('Legs', 'Hack Squat', 'Machine', 'intermediate', 'squat'),
      ('Legs', 'Walking Lunge', 'Dumbbells', 'beginner', 'squat'),
      ('Legs', 'Bulgarian Split Squat', 'Dumbbells', 'intermediate', 'squat'),
      ('Legs', 'Leg Extension', 'Machine', 'beginner', 'squat'),
      ('Posterior Chain', 'Romanian Deadlift', 'Barbell', 'intermediate', 'hinge'),
      ('Posterior Chain', 'Dumbbell RDL', 'Dumbbells', 'beginner', 'hinge'),
      ('Posterior Chain', 'Trap Bar Deadlift', 'Trap Bar', 'intermediate', 'hinge'),
      ('Posterior Chain', 'Hip Thrust', 'Barbell', 'beginner', 'hinge'),
      ('Posterior Chain', 'Hamstring Curl', 'Machine', 'beginner', 'hinge'),
      ('Posterior Chain', 'Kettlebell Swing', 'Kettlebell', 'intermediate', 'hinge'),
      ('Shoulders', 'Shoulder Press', 'Dumbbells', 'beginner', 'push'),
      ('Shoulders', 'Machine Shoulder Press', 'Machine', 'beginner', 'push'),
      ('Shoulders', 'Lateral Raise', 'Dumbbells', 'beginner', 'push'),
      ('Shoulders', 'Cable Lateral Raise', 'Cable', 'beginner', 'push'),
      ('Shoulders', 'Rear Delt Fly', 'Dumbbells', 'beginner', 'pull'),
      ('Shoulders', 'Arnold Press', 'Dumbbells', 'intermediate', 'push'),
      ('Arms', 'Biceps Curl', 'Dumbbells', 'beginner', 'pull'),
      ('Arms', 'Hammer Curl', 'Dumbbells', 'beginner', 'pull'),
      ('Arms', 'Cable Curl', 'Cable', 'beginner', 'pull'),
      ('Arms', 'Tricep Pushdown', 'Cable', 'beginner', 'push'),
      ('Arms', 'Overhead Tricep Extension', 'Dumbbells', 'beginner', 'push'),
      ('Arms', 'Close Grip Bench Press', 'Barbell', 'intermediate', 'push'),
      ('Core', 'Plank', 'Bodyweight', 'beginner', 'core'),
      ('Core', 'Side Plank', 'Bodyweight', 'beginner', 'core'),
      ('Core', 'Dead Bug', 'Bodyweight', 'beginner', 'core'),
      ('Core', 'Bird Dog', 'Bodyweight', 'beginner', 'core'),
      ('Core', 'Hanging Knee Raise', 'Bodyweight', 'intermediate', 'core'),
      ('Core', 'Cable Crunch', 'Cable', 'beginner', 'core'),
      ('Rotation', 'Cable Wood Chop', 'Cable', 'beginner', 'rotation'),
      ('Rotation', 'Medicine Ball Rotational Throw', 'Medicine Ball', 'intermediate', 'rotation'),
      ('Rotation', 'Landmine Rotation', 'Landmine', 'intermediate', 'rotation'),
      ('Rotation', 'Russian Twist', 'Medicine Ball', 'beginner', 'rotation'),
      ('Anti-Rotation', 'Pallof Press', 'Cable', 'beginner', 'anti-rotation'),
      ('Anti-Rotation', 'Band Pallof Press', 'Band', 'beginner', 'anti-rotation'),
      ('Anti-Rotation', 'Suitcase Carry', 'Dumbbells', 'beginner', 'carry'),
      ('Anti-Rotation', 'Farmer Carry', 'Dumbbells', 'beginner', 'carry'),
      ('Cardio', 'Treadmill Run', 'Cardio Machine', 'beginner', 'cardio'),
      ('Cardio', 'Incline Treadmill Walk', 'Cardio Machine', 'beginner', 'cardio'),
      ('Cardio', 'Bike Intervals', 'Cardio Machine', 'beginner', 'cardio'),
      ('Cardio', 'Rowing Machine', 'Cardio Machine', 'beginner', 'cardio'),
      ('Cardio', 'Stair Climber', 'Cardio Machine', 'beginner', 'cardio'),
      ('Mobility', 'Hip Flexor Stretch', 'Bodyweight', 'beginner', 'mobility'),
      ('Mobility', '90/90 Hip Switch', 'Bodyweight', 'beginner', 'mobility'),
      ('Mobility', 'Thoracic Open Book', 'Bodyweight', 'beginner', 'mobility'),
      ('Mobility', 'Shoulder CARs', 'Bodyweight', 'beginner', 'mobility'),
      ('Mobility', 'Ankle Rocks', 'Bodyweight', 'beginner', 'mobility'),
      ('Golf-Specific', 'Medicine Ball Scoop Toss', 'Medicine Ball', 'intermediate', 'rotation'),
      ('Golf-Specific', 'Split Stance Cable Rotation', 'Cable', 'intermediate', 'rotation'),
      ('Golf-Specific', 'Step And Rotate', 'Bodyweight', 'beginner', 'rotation'),
      ('Golf-Specific', 'Single Leg Balance Reach', 'Bodyweight', 'beginner', 'mobility'),
      ('Golf-Specific', 'Band Hip Turn Drill', 'Band', 'beginner', 'rotation')
  ) AS curated(category, name, equipment, difficulty, movement_type)
),
generated_templates AS (
  SELECT *
  FROM (
    VALUES
      ('Chest', 'Press', ARRAY['Dumbbell','Cable','Machine','Band','Smith Machine'], 'push'),
      ('Chest', 'Fly', ARRAY['Dumbbell','Cable','Machine','Band'], 'push'),
      ('Back', 'Row', ARRAY['Dumbbell','Cable','Machine','Band','Barbell','Landmine'], 'pull'),
      ('Back', 'Pulldown', ARRAY['Cable','Band','Machine'], 'pull'),
      ('Legs', 'Squat', ARRAY['Dumbbell','Barbell','Kettlebell','Smith Machine','Machine'], 'squat'),
      ('Legs', 'Lunge', ARRAY['Bodyweight','Dumbbell','Kettlebell','Barbell'], 'squat'),
      ('Legs', 'Step Up', ARRAY['Bodyweight','Dumbbell','Kettlebell'], 'squat'),
      ('Posterior Chain', 'Deadlift', ARRAY['Dumbbell','Barbell','Kettlebell','Trap Bar'], 'hinge'),
      ('Posterior Chain', 'Hip Hinge', ARRAY['Dumbbell','Barbell','Band','Cable'], 'hinge'),
      ('Shoulders', 'Press', ARRAY['Dumbbell','Barbell','Machine','Landmine','Kettlebell'], 'push'),
      ('Shoulders', 'Raise', ARRAY['Dumbbell','Cable','Band','Machine'], 'push'),
      ('Arms', 'Curl', ARRAY['Dumbbell','Cable','Band','Barbell','Machine'], 'pull'),
      ('Arms', 'Tricep Extension', ARRAY['Dumbbell','Cable','Band','Machine'], 'push'),
      ('Core', 'Hold', ARRAY['Bodyweight','Cable','Band','Medicine Ball'], 'core'),
      ('Rotation', 'Rotational Throw', ARRAY['Medicine Ball','Cable','Band','Landmine'], 'rotation'),
      ('Anti-Rotation', 'Anti Rotation Press', ARRAY['Cable','Band','Medicine Ball'], 'anti-rotation'),
      ('Cardio', 'Intervals', ARRAY['Treadmill','Bike','Rower','SkiErg','Stair Climber'], 'cardio'),
      ('Mobility', 'Mobility Flow', ARRAY['Bodyweight','Band','Foam Roller'], 'mobility'),
      ('Golf-Specific', 'Golf Rotation Drill', ARRAY['Cable','Band','Medicine Ball','Bodyweight','Landmine'], 'rotation')
  ) AS template(category, movement_name, equipment_options, movement_type)
),
generated_variants AS (
  SELECT
    concat(equipment, ' ', category, ' ', movement_name) AS name,
    category,
    equipment,
    'beginner'::text AS difficulty,
    movement_type
  FROM generated_templates
  CROSS JOIN LATERAL unnest(equipment_options) AS equipment
  UNION ALL
  SELECT
    concat('Single Arm ', equipment, ' ', category, ' ', movement_name),
    category,
    equipment,
    'intermediate',
    movement_type
  FROM generated_templates
  CROSS JOIN LATERAL unnest(equipment_options) AS equipment
  WHERE movement_type IN ('push', 'pull', 'rotation', 'anti-rotation')
  UNION ALL
  SELECT
    concat('Single Leg ', equipment, ' ', category, ' ', movement_name),
    category,
    equipment,
    'intermediate',
    movement_type
  FROM generated_templates
  CROSS JOIN LATERAL unnest(equipment_options) AS equipment
  WHERE category IN ('Legs', 'Posterior Chain', 'Golf-Specific')
),
all_seed AS (
  SELECT name, category, equipment, difficulty, movement_type FROM movement_templates
  UNION
  SELECT name, category, equipment, difficulty, movement_type FROM generated_variants
),
deduped AS (
  SELECT DISTINCT ON (lower(name)) all_seed.*
  FROM all_seed
  ORDER BY lower(name), name
)
INSERT INTO public.exercise_library (
  name,
  slug,
  category,
  primary_muscles,
  secondary_muscles,
  equipment,
  difficulty,
  movement_type,
  instructions,
  form_cues,
  common_mistakes,
  safety_notes,
  golf_relevant,
  golf_benefit,
  alternatives,
  youtube_search
)
SELECT
  d.name,
  regexp_replace(regexp_replace(lower(d.name), '&', 'and', 'g'), '[^a-z0-9]+', '-', 'g') AS slug,
  d.category,
  c.primary_muscles,
  c.secondary_muscles,
  d.equipment,
  d.difficulty,
  d.movement_type,
  'Set up with control, move through a comfortable range, and keep the target muscles doing the work.',
  ARRAY[
    'Brace before each rep.',
    'Move with a controlled tempo.',
    'Stop the set when form breaks down.'
  ],
  ARRAY[
    'Using momentum instead of control.',
    'Chasing load before clean movement.',
    'Ignoring pain or unstable positions.'
  ],
  'Warm up first, choose a load you can control, and stop if pain changes the movement.',
  c.golf_relevant,
  c.golf_benefit,
  ARRAY[]::text[],
  concat(d.name, ' proper form')
FROM deduped d
JOIN generated_exercises c ON c.category = d.category
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  equipment = EXCLUDED.equipment,
  difficulty = EXCLUDED.difficulty,
  movement_type = EXCLUDED.movement_type,
  instructions = EXCLUDED.instructions,
  form_cues = EXCLUDED.form_cues,
  common_mistakes = EXCLUDED.common_mistakes,
  safety_notes = EXCLUDED.safety_notes,
  golf_relevant = EXCLUDED.golf_relevant,
  golf_benefit = EXCLUDED.golf_benefit,
  youtube_search = EXCLUDED.youtube_search,
  updated_at = now();