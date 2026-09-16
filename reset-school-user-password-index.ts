import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service)
      throw new Error("Supabase server environment is not configured.");

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer "))
      return Response.json({ error: "Administrator must be signed in." }, { status: 401, headers: corsHeaders });

    const token = authHeader.slice(7);
    const callerClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: { user: caller }, error: authError } =
      await callerClient.auth.getUser(token);
    if (authError || !caller)
      return Response.json({ error: "Administrator session could not be verified. Sign out and sign in again." },
        { status: 401, headers: corsHeaders });

    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: callerProfile, error: callerProfileError } =
      await admin.from("profiles").select("role").eq("id", caller.id).single();

    if (callerProfileError || callerProfile?.role !== "admin")
      return Response.json({ error: "Administrator access required." },
        { status: 403, headers: corsHeaders });

    const body = await req.json();
    const targetId = String(body.user_id || "").trim();
    const password = String(body.new_password || "");

    if (!targetId)
      return Response.json({ error: "Select a Student or Teacher." }, { status: 400, headers: corsHeaders });
    if (password.length < 8)
      return Response.json({ error: "Password must be at least 8 characters." }, { status: 400, headers: corsHeaders });

    const { data: target, error: targetError } =
      await admin.from("profiles")
        .select("id,display_name,role,school_id")
        .eq("id", targetId).single();

    if (targetError || !target)
      return Response.json({ error: "Selected user profile was not found." }, { status: 404, headers: corsHeaders });

    if (!["student","teacher"].includes(target.role))
      return Response.json({ error: "Only Student and Teacher passwords can be reset here." },
        { status: 403, headers: corsHeaders });

    const { data: updated, error: updateError } =
      await admin.auth.admin.updateUserById(target.id, { password });

    if (updateError || !updated.user)
      return Response.json({ error: updateError?.message || "Supabase Auth password update failed." },
        { status: 400, headers: corsHeaders });

    return Response.json({
      ok: true,
      message: `Password successfully reset for ${target.display_name}.`
    }, { status: 200, headers: corsHeaders });

  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Unexpected password reset error." },
      { status: 500, headers: corsHeaders });
  }
});
