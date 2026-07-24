import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user, admin } = await getAuthenticatedClients(request);
    const { data: connection, error } = await admin
      .from("strava_connections")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) return json({ error: error.message }, 500);
    if (!connection) return json({ error: "Strava is not connected." }, 400);

    const tokens = await getFreshTokens(admin, connection);
    const after = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000).toString();
    const url = new URL("https://www.strava.com/api/v3/athlete/activities");
    url.searchParams.set("after", after);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", "1");

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const activities = await response.json();
    if (!response.ok) return json({ error: activities.message || "Could not import Strava activities." }, response.status);

    const activityList = Array.isArray(activities) ? activities : [];
    const mapped = activityList.map((activity: any) => ({
      activity,
      result: mapActivity(user.id, activity),
    }));
    
    const cardioRows = mapped
      .filter((item) => item.result?.classification === "cardio")
      .map((item) => item.result!.row);
      
    const golfRows = mapped
      .filter((item) => item.result?.classification === "golf")
      .map((item) => item.result!.row);

    const skippedUnsupported = mapped.filter((item) => !item.result).length;
    const activityTypes = [...new Set(activityList.map((activity: any) => String(activity.sport_type || activity.type || "unknown")))];

    if (cardioRows.length) {
      const { error: upsertError } = await admin
        .from("cardio_sessions")
        .upsert(cardioRows, { onConflict: "source,external_id" });
      if (upsertError) return json({ error: upsertError.message }, 500);
    }
    
    if (golfRows.length) {
      const { error: insertError } = await admin
        .from("strava_activity_queue")
        .upsert(golfRows, { onConflict: "external_id" });
      if (insertError) return json({ error: insertError.message }, 500);
    }

    await admin
      .from("strava_connections")
      .update({ last_imported_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return json({
      importedCardio: cardioRows.length,
      importedGolf: golfRows.length,
      scanned: activityList.length,
      skippedUnsupported,
      activityTypes,
      windowDays: 90,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Strava import failed." }, 500);
  }
});

async function getFreshTokens(admin: any, connection: any) {
  if (Number(connection.expires_at) > Math.floor(Date.now() / 1000) + 300) {
    return connection;
  }

  const clientId = Deno.env.get("STRAVA_CLIENT_ID");
  const clientSecret = Deno.env.get("STRAVA_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Strava is not configured.");

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || "Could not refresh Strava token.");

  await admin
    .from("strava_connections")
    .update({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      expires_at: payload.expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", connection.user_id);

  return { ...connection, ...payload };
}

function mapActivity(userId: string, activity: any) {
  const sport = String(activity.sport_type || activity.type || "").toLowerCase();
  
  // Classification Logic
  const isGolf = sport.includes("golf");
  const isCardio = sport.includes("run") || sport.includes("walk") || sport.includes("hike") || sport.includes("ride");
  
  if (!isGolf && !isCardio) return null;

  const classification = isGolf ? "golf" : "cardio";
  const sessionDate = String(activity.start_date_local || activity.start_date || "").slice(0, 10);

  if (classification === "golf") {
    return {
      classification,
      row: {
        user_id: userId,
        external_id: String(activity.id),
        activity_type: sport,
        classification: "golf",
        activity_date: sessionDate,
        distance_km: Number(activity.distance || 0) / 1000,
        duration_minutes: Math.round(Number(activity.moving_time || activity.elapsed_time || 0) / 60),
        calories: toInteger(activity.calories),
        avg_heart_rate: toInteger(activity.average_heartrate),
        status: "pending",
        activity_data: activity,
      }
    };
  }

  // Cardio mapping
  return {
    classification,
    row: {
      user_id: userId,
      activity_type: sport,
      session_date: sessionDate,
      distance_km: Number(activity.distance || 0) / 1000,
      duration_minutes: Math.round(Number(activity.moving_time || activity.elapsed_time || 0) / 60),
      avg_heart_rate: toInteger(activity.average_heartrate),
      calories: toInteger(activity.calories),
      perceived_effort: null,
      route_name: activity.name || null,
      notes: "Imported from Strava. Private to your account.",
      source: "strava",
      external_id: String(activity.id),
      updated_at: new Date().toISOString(),
    },
  };
}

function toInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
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
