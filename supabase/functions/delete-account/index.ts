import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ error: "Missing Supabase Edge Function environment variables." }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: "Not authenticated." }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const userId = userData.user.id;
  const { data: stravaConnection } = await admin
    .from("strava_connections")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();

  if (stravaConnection?.refresh_token) {
    await revokeStravaToken(stravaConnection.refresh_token);
  }

  await Promise.all([
    admin.from("notifications").delete().or(`recipient_user_id.eq.${userId},actor_user_id.eq.${userId}`),
    admin.from("friend_connections").delete().or(`requester_id.eq.${userId},receiver_id.eq.${userId}`),
    admin.from("strava_connections").delete().eq("user_id", userId),
    admin.from("live_activities").delete().eq("user_id", userId),
    admin.from("cardio_sessions").delete().eq("user_id", userId),
    admin.from("nutrition_entries").delete().eq("user_id", userId),
    admin.from("saved_foods").delete().eq("user_id", userId),
    admin.from("daily_wellness_logs").delete().eq("user_id", userId),
    admin.from("workouts").delete().eq("user_id", userId),
    admin.from("practice_sessions").delete().eq("user_id", userId),
    admin.from("competitions").delete().eq("user_id", userId),
    admin.from("rounds").delete().eq("user_id", userId),
    admin.from("profiles").delete().eq("id", userId),
  ]);

  await admin.from("feedback_reports").update({ user_id: null }).eq("user_id", userId);

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return json({ error: deleteError.message }, 500);
  }

  return json({ ok: true });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

async function revokeStravaToken(token: string) {
  const clientId = Deno.env.get("STRAVA_CLIENT_ID");
  const clientSecret = Deno.env.get("STRAVA_CLIENT_SECRET");
  if (!clientId || !clientSecret) return;

  await fetch("https://www.strava.com/oauth/revoke", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ token, token_type_hint: "refresh_token" }),
  });
}
