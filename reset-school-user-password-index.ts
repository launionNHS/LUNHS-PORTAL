import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    if (!authHeader.startsWith("Bearer "))
      return Response.json({ error: "Signed-in Administrator session required." }, { status: 401, headers: corsHeaders });

    const token = authHeader.slice(7);
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user)
      return Response.json({ error: "Administrator session could not be verified." }, { status: 401, headers: corsHeaders });

    const { data: caller } = await userClient.from("profiles").select("role").eq("id", user.id).single();
    if (caller?.role !== "admin")
      return Response.json({ error: "Administrator access required." }, { status: 403, headers: corsHeaders });

    const body = await req.json();
    const targetId = String(body.user_id || "").trim();
    const newPassword = String(body.new_password || "");

    if (!targetId || newPassword.length < 8)
      return Response.json({ error: "Select a user and enter a password of at least 8 characters." },
        { status: 400, headers: corsHeaders });

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: target, error: profileError } = await admin
      .from("profiles").select("id,role,display_name,school_id").eq("id", targetId).single();

    if (profileError || !target)
      return Response.json({ error: "User profile was not found." }, { status: 404, headers: corsHeaders });

    // This recovery tool is intentionally limited to Student and Teacher accounts.
    if (!["student","teacher"].includes(target.role))
      return Response.json({ error: "This recovery tool is only for Student and Teacher accounts." },
        { status: 403, headers: corsHeaders });

    const { error: updateError } = await admin.auth.admin.updateUserById(targetId, { password: newPassword });
    if (updateError)
      return Response.json({ error: updateError.message }, { status: 400, headers: corsHeaders });

    return Response.json({
      ok: true,
      message: `Password reset successfully for ${target.display_name}.`
    }, { headers: corsHeaders });

  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Unexpected error." },
      { status: 500, headers: corsHeaders });
  }
});
