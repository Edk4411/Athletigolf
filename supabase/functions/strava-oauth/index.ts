import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { code } = await request.json();
    if (!code) return json({ error: "Missing Strava authorization code." }, 400);

    const { user, admin } = await getAuthenticatedClients(request);
    const clientId = Deno.env.get("STRAVA_CLIENT_ID");
    const clientSecret = Deno.env.get("STRAVA_CLIENT_SECRET");
    if (!clientId || !clientSecret) return json({ error: "Strava is not configured." }, 500);

    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
      }),
    });

    const payload = await response.json();
    if (!response.ok) return json({ error: payload.message || "Could not connect Strava." }, response.status);

    const scope = String(payload.scope || "");
    if (!scope.split(/[,\s]+/).includes("activity:read")) {
      return json({ error: "Strava activity read permission was not granted." }, 400);
    }

    const athlete = payload.athlete || {};
    const athleteName = [athlete.firstname, athlete.lastname].filter(Boolean).join(" ").trim() || null;

    const { error } = await admin.from("strava_connections").upsert({
      user_id: user.id,
      athlete_id: athlete.id,
      athlete_name: athleteName,
      scope,
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      expires_at: payload.expires_at,
      updated_at: new Date().toISOString(),
    });

    if (error) return json({ error: error.message }, 500);

    return json({ connected: true, athleteName, scope });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Strava connection failed." }, 500);
  }
});

async function getAuthenticatedClients(request: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = request.headers.get("Authorization") || "";

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated.");

  return {
    user: data.user,
    admin: createClient(supabaseUrl, serviceRoleKey),
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
