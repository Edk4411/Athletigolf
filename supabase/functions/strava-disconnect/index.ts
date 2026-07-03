import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user, admin } = await getAuthenticatedClients(request);
    const { data: connection } = await admin
      .from("strava_connections")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (connection?.refresh_token) await revokeStravaToken(connection.refresh_token);

    await admin.from("strava_connections").delete().eq("user_id", user.id);
    return json({ disconnected: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not disconnect Strava." }, 500);
  }
});

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
