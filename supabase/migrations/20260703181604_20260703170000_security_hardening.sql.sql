-- Security hardening: stable search_path, revoke anon/public execution,
-- restrict direct client access to strava_connections token rows.
-- Additive only — does not alter function bodies or switch SECURITY DEFINER.

ALTER FUNCTION public.normalise_username(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.search_profiles_for_friend(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_friend_connections_with_profiles() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_strava_connection_status() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_admins_of_feedback() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_friends_of_live_activity() SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.normalise_username(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.search_profiles_for_friend(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_friend_connections_with_profiles() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_strava_connection_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admins_of_feedback() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_friends_of_live_activity() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.search_profiles_for_friend(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_connections_with_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_strava_connection_status() TO authenticated;

DROP POLICY IF EXISTS deny_direct_client_strava_connections ON public.strava_connections;
CREATE POLICY deny_direct_client_strava_connections
  ON public.strava_connections
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);