import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Dynamic CORS headers ---
function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowed = Deno.env.get("ALLOWED_ORIGIN") || "";

  const isAllowed =
    origin === allowed ||
    origin.endsWith(".lovable.app") ||
    origin.startsWith("http://localhost");

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, cache-control, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

// --- Helper: resolve subscription status from DB row ---
function resolveStatus(sub: {
  status: string;
  plan: string;
}): { status: string; plan: string } {
  if (sub.status === "active") {
    return { status: "active", plan: sub.plan || "pro" };
  }

  if (sub.status === "trialing") {
    return { status: "expired", plan: "free" };
  }

  if (sub.status === "canceled" || sub.status === "past_due") {
    return { status: sub.status, plan: "free" };
  }

  return { status: "expired", plan: "free" };
}

// --- Main handler ---
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const respond = (data: { status: string; plan: string }) =>
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, max-age=15" },
    });

  const errorResponse = (message: string, status: number) =>
    new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Unauthorized", 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[check-subscription] Missing required env vars");
      return errorResponse("Server configuration error", 500);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return errorResponse("Invalid token", 401);
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string | undefined;
    console.log("[check-subscription] userId:", userId, "email:", userEmail);

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let { data: sub } = await adminClient
      .from("subscriptions")
      .select("id, status, plan, user_id")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub) {
      console.log("[check-subscription] Found by user_id:", sub.status, sub.plan);
      return respond(resolveStatus(sub));
    }

    if (userEmail) {
      const { data: subByEmail } = await adminClient
        .from("subscriptions")
        .select("id, status, plan, user_id")
        .eq("email", userEmail.toLowerCase().trim())
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subByEmail) {
        console.log("[check-subscription] Found by email:", subByEmail.status, subByEmail.plan);
        const PLACEHOLDER_UUID = "00000000-0000-0000-0000-000000000000";
        if (subByEmail.user_id === PLACEHOLDER_UUID) {
          await adminClient
            .from("subscriptions")
            .update({ user_id: userId, updated_at: new Date().toISOString() })
            .eq("id", subByEmail.id);
        }
        return respond(resolveStatus(subByEmail));
      }
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

    if (profile?.status === "ativo") {
      return respond({ status: "active", plan: "pro" });
    }

    console.log("[check-subscription] No subscription found → expired");
    return respond({ status: "expired", plan: "free" });
  } catch (error) {
    console.error("[check-subscription] error:", error instanceof Error ? error.message : "Unknown");
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
