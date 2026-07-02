ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS username_search text,
  ADD COLUMN IF NOT EXISTS show_display_name_in_search boolean DEFAULT false;

UPDATE public.profiles
SET
  username = COALESCE(username, 'athlete_' || left(id::text, 8)),
  username_search = COALESCE(username_search, 'athlete_' || left(id::text, 8)),
  show_display_name_in_search = COALESCE(show_display_name_in_search, false)
WHERE username_search IS NULL
   OR username IS NULL
   OR show_display_name_in_search IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_username_search_format'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_search_format
      CHECK (username_search IS NULL OR username_search ~ '^[a-z0-9_]{3,24}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_search_key
  ON public.profiles (username_search)
  WHERE username_search IS NOT NULL;

CREATE OR REPLACE FUNCTION public.normalise_username(input_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT left(
    regexp_replace(
      regexp_replace(lower(trim(coalesce(input_value, ''))), '\s+', '_', 'g'),
      '[^a-z0-9_]',
      '',
      'g'
    ),
    24
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_username text := public.normalise_username(NEW.raw_user_meta_data->>'username');
  chosen_username text;
BEGIN
  chosen_username := CASE
    WHEN raw_username ~ '^[a-z0-9_]{3,24}$' THEN raw_username
    ELSE 'athlete_' || left(NEW.id::text, 8)
  END;

  INSERT INTO public.profiles (id, full_name, username, username_search, show_display_name_in_search)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NEW.raw_user_meta_data->>'username'),
    chosen_username,
    chosen_username,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    username = COALESCE(public.profiles.username, EXCLUDED.username),
    username_search = COALESCE(public.profiles.username_search, EXCLUDED.username_search),
    show_display_name_in_search = COALESCE(public.profiles.show_display_name_in_search, false);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_profiles_for_friend(search_query text)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  relationship_status text,
  relationship_direction text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lookup text := public.normalise_username(search_query);
BEGIN
  IF auth.uid() IS NULL OR length(lookup) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id AS user_id,
    p.username,
    CASE WHEN p.show_display_name_in_search THEN p.full_name ELSE NULL END AS display_name,
    fc.status,
    CASE
      WHEN fc.id IS NULL THEN 'none'
      WHEN fc.status = 'accepted' THEN 'accepted'
      WHEN fc.requester_id = auth.uid() THEN 'outgoing'
      WHEN fc.receiver_id = auth.uid() THEN 'incoming'
      ELSE 'none'
    END AS relationship_direction
  FROM public.profiles p
  LEFT JOIN public.friend_connections fc
    ON (
      (fc.requester_id = auth.uid() AND fc.receiver_id = p.id)
      OR (fc.receiver_id = auth.uid() AND fc.requester_id = p.id)
    )
  WHERE p.id <> auth.uid()
    AND p.username_search ILIKE lookup || '%'
  ORDER BY
    CASE WHEN p.username_search = lookup THEN 0 ELSE 1 END,
    p.username_search
  LIMIT 12;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_friend_connections_with_profiles()
RETURNS TABLE (
  id uuid,
  requester_id uuid,
  receiver_id uuid,
  requester_label text,
  receiver_label text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  other_user_id uuid,
  other_username text,
  other_display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    fc.id,
    fc.requester_id,
    fc.receiver_id,
    fc.requester_label,
    fc.receiver_label,
    fc.status,
    fc.created_at,
    fc.updated_at,
    p.id AS other_user_id,
    p.username AS other_username,
    CASE WHEN p.show_display_name_in_search THEN p.full_name ELSE NULL END AS other_display_name
  FROM public.friend_connections fc
  JOIN public.profiles p
    ON p.id = CASE
      WHEN fc.requester_id = auth.uid() THEN fc.receiver_id
      ELSE fc.requester_id
    END
  WHERE fc.requester_id = auth.uid()
     OR fc.receiver_id = auth.uid()
  ORDER BY fc.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_profiles_for_friend(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_connections_with_profiles() TO authenticated;