import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- CORS headers ---
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, cache-control, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

// --- Helper: resolve subscription status from DB row ---
function resolveStatus(sub: {
  status: string;
  plan: string;
}): { status: string; plan: string } {
  if (sub.status === "active") {
    return { status: "active", plan: sub.plan || "pro" };
  }

  // Trial is no longer supported — treat as expired
  if (sub.status === "trialing") {
    return { status: "expired", plan: "free" };
  }

  if (sub.status === "canceled" || sub.status === "past_due") {
    return { status: sub.status, plan: "free" };
  }

  return { status: "expired", plan: "free" };
}

// --- Helper: JSON response with short cache ---
function respond(data: { status: string; plan: string }) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=15",
    },
  });
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// --- Main handler ---
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("[check-subscription] CORS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("[check-subscription] Missing/invalid auth header");
      return errorResponse("Unauthorized", 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[check-subscription] Missing required env vars");
      return errorResponse("Server configuration error", 500);
    }

    // 1. Validate JWT
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.log("[check-subscription] Invalid token:", claimsError?.message);
      return errorResponse("Invalid token", 401);
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string | undefined;
    console.log("[check-subscription] userId:", userId, "email:", userEmail);

    // 2. Single source of truth: subscriptions table only
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Busca por user_id primeiro
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

    // Se não encontrou por user_id, tentar reconciliar pelo email
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
        // Vincular ao user_id real se ainda estiver com placeholder
        const PLACEHOLDER_UUID = "00000000-0000-0000-0000-000000000000";
        if (subByEmail.user_id === PLACEHOLDER_UUID) {
          await adminClient
            .from("subscriptions")
            .update({ user_id: userId, updated_at: new Date().toISOString() })
            .eq("id", subByEmail.id);
          console.log("[check-subscription] Linked subscription to user_id");
        }
        return respond(resolveStatus(subByEmail));
      }
    }

    // Fallback: verificar status "ativo" em profiles (legacy)
    const { data: profile } = await adminClient
      .from("profiles")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

    if (profile?.status === "ativo") {
      console.log("[check-subscription] Found active via profiles legacy");
      return respond({ status: "active", plan: "pro" });
    }

    // Nada encontrado — expirado
    console.log("[check-subscription] No subscription found → expired");
    return respond({ status: "expired", plan: "free" });
  } catch (error) {
    console.error("[check-subscription] error:", error instanceof Error ? error.message : "Unknown");
    return errorResponse("Internal server error", 500);
  }
});
