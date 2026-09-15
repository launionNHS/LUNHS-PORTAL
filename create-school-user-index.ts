import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const publishable = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")!)["default"];
    const secret = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!)["default"];

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(url, publishable, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("You must be signed in.");

    const { data: caller } = await userClient.from("profiles").select("role").eq("id", user.id).single();
    if (caller?.role !== "admin") return Response.json({ error: "Administrator access required." }, { status: 403, headers: cors });

    const body = await req.json();
    if (!["student","teacher"].includes(body.role)) throw new Error("Only student or teacher accounts can be created here.");
    if (!body.email || !body.password || !body.display_name || !body.school_id) throw new Error("Complete all required fields.");

    const admin = createClient(url, secret);
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true
    });
    if (createError) throw createError;

    const { error: profileError } = await admin.from("profiles").insert({
      id: created.user.id,
      role: body.role,
      display_name: body.display_name,
      school_id: body.school_id,
      grade_level: body.grade_level || null,
      section: body.section || null
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw profileError;
    }
    return Response.json({ ok: true, user_id: created.user.id }, { headers: cors });
  } catch (e) {
    return Response.json({ error: e?.message || "Request failed." }, { status: 400, headers: cors });
  }
});
