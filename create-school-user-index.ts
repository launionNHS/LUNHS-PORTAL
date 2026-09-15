import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Required Supabase server environment variables are missing.");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "No signed-in session token was received." }, { status: 401, headers: corsHeaders });
    }

    // Verify the caller using the JWT sent by sb.functions.invoke().
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user) {
      return Response.json({ error: "Your Admin session could not be verified. Sign out, sign in again, then retry." }, { status: 401, headers: corsHeaders });
    }

    const { data: caller, error: callerError } = await userClient
      .from("profiles").select("role").eq("id", user.id).single();
    if (callerError || caller?.role !== "admin") {
      return Response.json({ error: "Administrator access required." }, { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const role = String(body.role || "").trim();
    const normalizedId = schoolId.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
    const email = `${normalizedId}@accounts.lunhs.local`;
    const password = String(body.password || "");
    const displayName = String(body.display_name || "").trim();
    const schoolId = String(body.school_id || "").trim();

    if (!["student","teacher"].includes(role))
      return Response.json({ error: "Choose Student or Teacher." }, { status: 400, headers: corsHeaders });
    if (!password || !displayName || !schoolId)
      return Response.json({ error: "Name, School ID/LRN and password are required." }, { status: 400, headers: corsHeaders });
    if (password.length < 8)
      return Response.json({ error: "Temporary password must be at least 8 characters." }, { status: 400, headers: corsHeaders });

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: existing } = await admin.from("profiles").select("id").eq("school_id", schoolId).maybeSingle();
    if (existing) return Response.json({ error: "This School ID/LRN is already registered." }, { status: 409, headers: corsHeaders });

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName, school_id: schoolId, role }
    });
    if (createError || !created.user)
      return Response.json({ error: createError?.message || "Supabase Auth did not create the account." }, { status: 400, headers: corsHeaders });

    const { data: profile, error: profileError } = await admin.from("profiles").insert({
      id: created.user.id,
      role,
      display_name: displayName,
      school_id: schoolId,
      grade_level: body.grade_level || null,
      section: body.section || null
    }).select("id,role,display_name,school_id").single();

    if (profileError || !profile) {
      await admin.auth.admin.deleteUser(created.user.id);
      return Response.json({ error: "Profile creation failed; incomplete Auth account was removed. " + (profileError?.message || "") },
        { status: 400, headers: corsHeaders });
    }

    return Response.json({
      ok: true,
      message: `${displayName} was created successfully.`,
      user: profile
    }, { status: 200, headers: corsHeaders });

  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Unexpected server error." },
      { status: 500, headers: corsHeaders });
  }
});
