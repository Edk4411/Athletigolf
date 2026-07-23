-- Security hardening for SECURITY DEFINER functions
-- All 6 functions require SECURITY DEFINER because they read from RLS-protected
-- tables and are called from within RLS policies (or need to bypass restrictive
-- policies). This migration does NOT change function logic — it only:
--   1. Revokes EXECUTE from PUBLIC and anon for all functions
--   2. Ensures search_path includes pg_temp to prevent search_path injection
--   3. Grants EXECUTE only to authenticated (and keeps service_role access)

-- ============================================================================
-- can_view_round — used in RLS policies across 10+ live-round tables
-- ============================================================================
ALTER FUNCTION public.can_view_round(uuid) SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.can_view_round(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_round(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.can_view_round(uuid) TO authenticated;

-- ============================================================================
-- owns_round — used in RLS policies across live-round tables
-- ============================================================================
ALTER FUNCTION public.owns_round(uuid) SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.owns_round(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owns_round(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.owns_round(uuid) TO authenticated;

-- ============================================================================
-- get_friend_connections_with_profiles — reads friend profiles bypassing RLS
-- ============================================================================
ALTER FUNCTION public.get_friend_connections_with_profiles() SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.get_friend_connections_with_profiles() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_friend_connections_with_profiles() FROM anon;

GRANT EXECUTE ON FUNCTION public.get_friend_connections_with_profiles() TO authenticated;

-- ============================================================================
-- get_friend_profile — reads a friend's profile bypassing RLS
-- ============================================================================
ALTER FUNCTION public.get_friend_profile(uuid) SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.get_friend_profile(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_friend_profile(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.get_friend_profile(uuid) TO authenticated;

-- ============================================================================
-- search_profiles_for_friend — searches all profiles bypassing RLS
-- ============================================================================
ALTER FUNCTION public.search_profiles_for_friend(text) SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.search_profiles_for_friend(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_profiles_for_friend(text) FROM anon;

GRANT EXECUTE ON FUNCTION public.search_profiles_for_friend(text) TO authenticated;

-- ============================================================================
-- get_strava_connection_status — reads strava_connections bypassing RESTRICTIVE policy
-- ============================================================================
ALTER FUNCTION public.get_strava_connection_status() SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.get_strava_connection_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_strava_connection_status() FROM anon;

GRANT EXECUTE ON FUNCTION public.get_strava_connection_status() TO authenticated;
