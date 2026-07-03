DROP POLICY IF EXISTS "select_own_live_activities" ON public.live_activities;

CREATE POLICY "select_own_and_friend_live_activities"
  ON public.live_activities
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR (
      visibility = 'friends'
      AND ended_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
      AND EXISTS (
        SELECT 1
        FROM public.friend_connections fc
        WHERE fc.status = 'accepted'
          AND (
            (fc.requester_id = auth.uid() AND fc.receiver_id = live_activities.user_id)
            OR (fc.receiver_id = auth.uid() AND fc.requester_id = live_activities.user_id)
          )
      )
    )
  );