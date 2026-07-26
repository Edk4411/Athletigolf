import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user, admin } = await getAuthenticatedClients(request);
    const { action, queueId, roundId } = await request.json();

    if (action === "fetch") {
      const { data, error } = await admin
        .from("strava_activity_queue")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .eq("classification", "golf");
      if (error) throw error;
      return json(data);
    }

    if (action === "link" && queueId && roundId) {
      // 1. Get activity
      const { data: activity } = await admin
        .from("strava_activity_queue")
        .select("external_id")
        .eq("id", queueId)
        .eq("user_id", user.id)
        .single();
      if (!activity) throw new Error("Activity not found.");

      // 2. Link to round
      await admin
        .from("rounds")
        .update({ strava_external_id: activity.external_id })
        .eq("id", roundId)
        .eq("user_id", user.id);

      // 3. Mark as processed
      await admin
        .from("strava_activity_queue")
        .update({ status: "processed" })
        .eq("id", queueId);

      return json({ success: true });
    }

    if (action === "ignore" && queueId) {
      await admin
        .from("strava_activity_queue")
        .update({ status: "ignored" })
        .eq("id", queueId)
        .eq("user_id", user.id);
      return json({ success: true });
    }

    return json({ error: "Invalid action." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Process failed." }, 500);
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
