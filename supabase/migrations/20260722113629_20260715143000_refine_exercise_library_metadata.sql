alter table public.exercise_library
  add column if not exists movement_pattern text,
  add column if not exists split_tags text[] not null default '{}',
  add column if not exists equipment_options text[] not null default '{}',
  add column if not exists coaching_cues text[] not null default '{}',
  add column if not exists youtube_search_url text;

create index if not exists exercise_library_primary_muscles_gin_idx
  on public.exercise_library using gin (primary_muscles);

create index if not exists exercise_library_secondary_muscles_gin_idx
  on public.exercise_library using gin (secondary_muscles);

create index if not exists exercise_library_split_tags_gin_idx
  on public.exercise_library using gin (split_tags);

create index if not exists exercise_library_movement_pattern_idx
  on public.exercise_library (movement_pattern);

create index if not exists exercise_library_difficulty_idx
  on public.exercise_library (difficulty);

update public.exercise_library
set
  movement_pattern = coalesce(
    movement_pattern,
    case
      when name ~* '(bench|push up|chest press|fly)' then 'horizontal_push'
      when name ~* '(shoulder press|arnold|landmine press)' then 'vertical_push'
      when name ~* '(pulldown|pull up)' then 'vertical_pull'
      when name ~* '(row)' then 'horizontal_pull'
      when name ~* '(squat|leg press|hack squat|lunge|step up)' then 'squat'
      when name ~* '(deadlift|rdl|hip thrust|hamstring|hinge|swing|back extension)' then 'hinge'
      when name ~* '(carry|suitcase|farmer)' then 'carry'
      when movement_type = 'anti-rotation' then 'anti_rotation'
      when movement_type = 'rotation' then 'rotation'
      else movement_type
    end
  ),
  split_tags = case
    when cardinality(split_tags) > 0 then split_tags
    else array_remove(array[
      case when movement_type = 'push' then 'push' end,
      case when movement_type = 'pull' then 'pull' end,
      case when movement_type in ('squat', 'hinge') then 'legs' end,
      case when movement_type in ('squat', 'hinge') then 'lower' end,
      case when movement_type in ('push', 'pull') then 'upper' end,
      case when movement_type in ('core', 'anti-rotation') then 'core' end,
      case when movement_type = 'cardio' then 'conditioning' end,
      case when movement_type = 'mobility' then 'mobility' end,
      case when movement_type in ('rotation', 'anti-rotation') then 'golf_rotation' end,
      case when movement_type in ('carry', 'anti-rotation') then 'golf_stability' end,
      case when golf_relevant and movement_type in ('rotation', 'hinge', 'carry') then 'golf_power' end,
      case when category = 'Chest' then 'chest' end,
      case when category in ('Back', 'Posterior Chain') then 'back' end,
      case when category = 'Shoulders' then 'shoulders' end,
      case when category = 'Arms' then 'arms' end,
      case when category in ('Chest', 'Back') then 'chest_back' end,
      case when category in ('Shoulders', 'Arms') then 'shoulders_arms' end,
      case when category in ('Legs', 'Posterior Chain', 'Core', 'Rotation', 'Anti-Rotation', 'Golf-Specific') then 'full_body' end
    ], null)
  end,
  equipment_options = case
    when cardinality(equipment_options) > 0 then equipment_options
    else array_remove(array[
      equipment,
      case when equipment in ('Barbell', 'Trap Bar', 'Smith Machine', 'Machine', 'Cable', 'Cardio Machine', 'Landmine') then 'Full gym' end,
      case when equipment in ('Dumbbells', 'Kettlebell', 'Medicine Ball') then 'Home weights' end,
      case when equipment = 'Band' then 'Bands / dumbbells' end,
      case when equipment = 'Bodyweight' then 'Bodyweight only' end
    ], null)
  end,
  coaching_cues = case
    when cardinality(coaching_cues) > 0 then coaching_cues
    else coalesce(form_cues, '{}')
  end,
  youtube_search_url = coalesce(
    youtube_search_url,
    'https://www.youtube.com/results?search_query=' ||
    replace(coalesce(youtube_search, name || ' proper form'), ' ', '+')
  ),
  alternatives = case
    when cardinality(coalesce(alternatives, '{}')) > 0 then alternatives
    when movement_type = 'push' then array['Dumbbell Bench Press', 'Machine Chest Press', 'Push Up']
    when movement_type = 'pull' then array['Lat Pulldown', 'Seated Cable Row', 'Chest Supported Row']
    when movement_type = 'squat' then array['Goblet Squat', 'Leg Press', 'Split Squat']
    when movement_type = 'hinge' then array['Dumbbell RDL', 'Hip Thrust', 'Back Extension']
    when movement_type = 'rotation' then array['Cable Wood Chop', 'Landmine Rotation', 'Medicine Ball Rotational Throw']
    when movement_type = 'anti-rotation' then array['Pallof Press', 'Side Plank', 'Suitcase Carry']
    when movement_type = 'mobility' then array['90/90 Hip Switch', 'Thoracic Open Book', 'Hip Flexor Stretch']
    else alternatives
  end;

insert into public.exercise_library (
  name, slug, category, primary_muscles, secondary_muscles, equipment, difficulty, movement_type,
  movement_pattern, split_tags, equipment_options, instructions, form_cues, coaching_cues,
  common_mistakes, safety_notes, golf_relevant, golf_benefit, alternatives, youtube_search, youtube_search_url
)
values
  (
    'Back Extension', 'back-extension', 'Posterior Chain',
    array['Glutes', 'Hamstrings'], array['Lower Back', 'Core'], 'Machine', 'beginner', 'hinge',
    'hinge', array['legs', 'lower', 'back', 'full_body', 'golf_power'], array['Full gym'],
    'Set the pad below the hips, hinge down under control, then extend through the hips without over-arching.',
    array['Brace before moving.', 'Move from the hips.', 'Stop when your body is straight.'],
    array['Brace before moving.', 'Move from the hips.', 'Stop when your body is straight.'],
    array['Hyperextending the lower back.', 'Rushing the bottom.', 'Turning it into a back swing.'],
    'Keep the range controlled and stop if your lower back feels pinchy.',
    true, 'Posterior-chain strength can support speed work and reduce noisy lower-back loading.',
    array['Dumbbell RDL', 'Hip Thrust', 'Glute Bridge'],
    'back extension proper form', 'https://www.youtube.com/results?search_query=back+extension+proper+form'
  ),
  (
    'Reverse Pec Deck', 'reverse-pec-deck', 'Shoulders',
    array['Rear Delts'], array['Upper Back', 'Rotator Cuff'], 'Machine', 'beginner', 'pull',
    'horizontal_pull', array['pull', 'upper', 'shoulders', 'back', 'shoulders_arms'], array['Full gym'],
    'Set the handles around shoulder height, keep the chest against the pad, and sweep the arms back with control.',
    array['Keep shoulders down.', 'Lead with elbows.', 'Pause briefly at the back.'],
    array['Keep shoulders down.', 'Lead with elbows.', 'Pause briefly at the back.'],
    array['Shrugging every rep.', 'Swinging the handles.', 'Letting the chest leave the pad.'],
    'Use light loading and keep the shoulder joint comfortable.',
    false, null,
    array['Rear Delt Fly', 'Face Pull', 'Band Pull Apart'],
    'reverse pec deck proper form', 'https://www.youtube.com/results?search_query=reverse+pec+deck+proper+form'
  ),
  (
    'Cable Press', 'cable-press', 'Chest',
    array['Chest'], array['Shoulders', 'Triceps', 'Core'], 'Cable', 'beginner', 'push',
    'horizontal_push', array['push', 'upper', 'chest', 'chest_back'], array['Full gym'],
    'Stand or sit with cables set around chest height, brace, and press forward without letting the ribs flare.',
    array['Brace the ribs down.', 'Press through the chest.', 'Control the return.'],
    array['Brace the ribs down.', 'Press through the chest.', 'Control the return.'],
    array['Leaning too far forward.', 'Letting wrists bend back.', 'Rushing the eccentric.'],
    'Choose a stance that lets you control the cables without shoulder discomfort.',
    false, null,
    array['Machine Chest Press', 'Dumbbell Bench Press', 'Push Up'],
    'cable chest press proper form', 'https://www.youtube.com/results?search_query=cable+chest+press+proper+form'
  ),
  (
    'Cable Lateral Raise', 'cable-lateral-raise', 'Shoulders',
    array['Side Delts'], array['Upper Back'], 'Cable', 'beginner', 'push',
    'isolation', array['push', 'upper', 'shoulders', 'shoulders_arms'], array['Full gym'],
    'Set the cable low, raise the arm slightly forward of the body, and control the return.',
    array['Use light load.', 'Lead with the elbow.', 'Keep the neck relaxed.'],
    array['Use light load.', 'Lead with the elbow.', 'Keep the neck relaxed.'],
    array['Swinging.', 'Shrugging.', 'Going too heavy.'],
    'Keep the movement pain-free and avoid forcing range.',
    false, null,
    array['Lateral Raise', 'Machine Lateral Raise', 'Lean-Away Lateral Raise'],
    'cable lateral raise proper form', 'https://www.youtube.com/results?search_query=cable+lateral+raise+proper+form'
  ),
  (
    'Seated Hamstring Curl', 'seated-hamstring-curl', 'Posterior Chain',
    array['Hamstrings'], array['Calves'], 'Machine', 'beginner', 'hinge',
    'knee_flexion', array['legs', 'lower', 'full_body'], array['Full gym'],
    'Set the machine so the knee lines up with the pivot, curl smoothly, and control the return.',
    array['Keep hips down.', 'Curl through full control.', 'Do not bounce the stack.'],
    array['Keep hips down.', 'Curl through full control.', 'Do not bounce the stack.'],
    array['Lifting the hips.', 'Using momentum.', 'Cutting the range short.'],
    'Start light and avoid cramping by controlling both directions.',
    false, null,
    array['Hamstring Curl', 'Nordic Curl', 'Dumbbell RDL'],
    'seated hamstring curl proper form', 'https://www.youtube.com/results?search_query=seated+hamstring+curl+proper+form'
  ),
  (
    'Standing Calf Raise', 'standing-calf-raise', 'Legs',
    array['Calves'], array['Ankles'], 'Machine', 'beginner', 'squat',
    'calf_raise', array['legs', 'lower'], array['Full gym'],
    'Rise onto the balls of the feet, pause, then lower under control to a comfortable stretch.',
    array['Use full control.', 'Pause at the top.', 'Keep knees softly extended.'],
    array['Use full control.', 'Pause at the top.', 'Keep knees softly extended.'],
    array['Bouncing.', 'Half reps.', 'Rolling onto the outside of the foot.'],
    'Avoid aggressive stretching if the Achilles feels irritated.',
    false, null,
    array['Seated Calf Raise', 'Leg Press Calf Raise', 'Single-Leg Calf Raise'],
    'standing calf raise proper form', 'https://www.youtube.com/results?search_query=standing+calf+raise+proper+form'
  )
on conflict (slug) do update
set
  primary_muscles = excluded.primary_muscles,
  secondary_muscles = excluded.secondary_muscles,
  movement_pattern = excluded.movement_pattern,
  split_tags = excluded.split_tags,
  equipment_options = excluded.equipment_options,
  instructions = excluded.instructions,
  form_cues = excluded.form_cues,
  coaching_cues = excluded.coaching_cues,
  common_mistakes = excluded.common_mistakes,
  safety_notes = excluded.safety_notes,
  golf_relevant = excluded.golf_relevant,
  golf_benefit = excluded.golf_benefit,
  alternatives = excluded.alternatives,
  youtube_search = excluded.youtube_search,
  youtube_search_url = excluded.youtube_search_url,
  updated_at = now();

revoke insert, update, delete on public.exercise_library from anon, authenticated;
grant select on public.exercise_library to authenticated;
