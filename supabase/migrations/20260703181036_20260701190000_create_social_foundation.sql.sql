CREATE TABLE IF NOT EXISTS public.friend_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid DEFAULT auth.uid(),
  receiver_id uuid NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (requester_id, receiver_id)
);

ALTER TABLE public.friend_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_friend_connections" ON public.friend_connections;
CREATE POLICY "select_own_friend_connections"
  ON public.friend_connections
  FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "insert_own_friend_connections" ON public.friend_connections;
CREATE POLICY "insert_own_friend_connections"
  ON public.friend_connections
  FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "update_own_friend_connections" ON public.friend_connections;
CREATE POLICY "update_own_friend_connections"
  ON public.friend_connections
  FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "delete_own_friend_connections" ON public.friend_connections;
CREATE POLICY "delete_own_friend_connections"
  ON public.friend_connections
  FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE INDEX IF NOT EXISTS friend_connections_requester_idx
  ON public.friend_connections (requester_id, status);

CREATE INDEX IF NOT EXISTS friend_connections_receiver_idx
  ON public.friend_connections (receiver_id, status);

CREATE TABLE IF NOT EXISTS public.live_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  activity_type text NOT NULL,
  location_name text,
  detail text,
  visibility text DEFAULT 'friends',
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.live_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_live_activities" ON public.live_activities;
CREATE POLICY "select_own_live_activities"
  ON public.live_activities
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_live_activities" ON public.live_activities;
CREATE POLICY "insert_own_live_activities"
  ON public.live_activities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_live_activities" ON public.live_activities;
CREATE POLICY "update_own_live_activities"
  ON public.live_activities
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_live_activities" ON public.live_activities;
CREATE POLICY "delete_own_live_activities"
  ON public.live_activities
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS live_activities_user_active_idx
  ON public.live_activities (user_id, ended_at, expires_at);