import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- CORS: allow preview + published origins ---
const ALLOWED_ORIGINS = [
  Deno.env.get("ALLOWED_ORIGIN") || "https://escala-calculadora.lovable.app",
  "https://id-preview--663ad348-e18a-4674-a7c5-186feeae7832.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || req.headers.get("Referer") || "";
  const allowed = ALLOWED_ORIGINS.find((o) => origin.startsWith(o)) ||
    // Allow any *.lovableproject.com or *.lovable.app preview
    (/\.lovableproject\.com$|\.lovable\.app$/.test(new URL(origin || "https://x.com").hostname)
      ? origin
      : ALLOWED_ORIGINS[0]);

  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, cache-control, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

// --- Helper: resolve subscription status from DB row ---
function resolveStatus(sub: {
  status: string;
  plan: string;
  trial_end: string | null;
}): { status: string; plan: string; trialEnd: string | null } {
  if (sub.status === "active") {
    return { status: "active", plan: sub.plan || "pro", trialEnd: null };
  }

  if (sub.status === "trialing" && sub.trial_end) {
    const isValid = new Date(sub.trial_end) > new Date();
    return {
      status: isValid ? "trialing" : "expired",
      plan: isValid ? (sub.plan || "pro") : "free",
      trialEnd: sub.trial_end,
    };
  }

  if (sub.status === "canceled" || sub.status === "past_due") {
    return { status: sub.status, plan: "free", trialEnd: sub.trial_end };
  }

  return { status: "expired", plan: "free", trialEnd: sub.trial_end };
}

// --- Helper: JSON response with short cache ---
function respond(data: { status: string; plan: string; trialEnd: string | null }, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=15",
    },
  });
}

function errorResponse(message: string, status: number, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// --- Main handler ---
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Unauthorized", 401, corsHeaders);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Validate JWT
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return errorResponse("Invalid token", 401, corsHeaders);
    }

    const userId = claimsData.claims.sub as string;

    // 2. Single source of truth: subscriptions table only
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Busca por user_id primeiro
    let { data: sub } = await adminClient
      .from("subscriptions")
      .select("id, status, plan, trial_end, user_id")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Se não encontrou por user_id, tentar reconciliar pelo email (compra antes do cadastro)
    if (!sub) {
      const userEmail = claimsData.claims.email as string | undefined;
      if (userEmail) {
        const { data: subByEmail } = await adminClient
          .from("subscriptions")
          .select("id, status, plan, trial_end, user_id")
          .eq("email", userEmail.toLowerCase().trim())
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subByEmail) {
          // Vincular ao user_id real se ainda estiver com placeholder
          const PLACEHOLDER_UUID = "00000000-0000-0000-0000-000000000000";
          if (subByEmail.user_id === PLACEHOLDER_UUID) {
            await adminClient
              .from("subscriptions")
              .update({ user_id: userId, updated_at: new Date().toISOString() })
              .eq("id", subByEmail.id);
          }
          sub = subByEmail;
        }
      }
    }

    if (sub) {
      return respond(resolveStatus(sub), corsHeaders);
    }

    // Fallback: verificar trial em profiles
    const { data: profile } = await adminClient
      .from("profiles")
      .select("status, trial_fim, trial_inicio")
      .eq("user_id", userId)
      .maybeSingle();


    if (profile) {
      const agora = new Date();
      const trialFim = profile.trial_fim ? new Date(profile.trial_fim) : null;
      const trialInicio = profile.trial_inicio ? new Date(profile.trial_inicio) : null;

      const trialLegitimo = trialInicio &&
        (agora.getTime() - trialInicio.getTime()) < (8 * 24 * 60 * 60 * 1000);

      if (
        profile.status === "trial" &&
        trialFim &&
        trialFim > agora &&
        trialLegitimo
      ) {
        return respond({ status: "trialing", plan: "pro", trialEnd: profile.trial_fim }, corsHeaders);
      }

      if (profile.status === "ativo") {
        return respond({ status: "active", plan: "pro", trialEnd: null }, corsHeaders);
      }
    }

    // Nada encontrado — expirado
    return respond({ status: "expired", plan: "free", trialEnd: null }, corsHeaders);
  } catch (error) {
    console.error("check-subscription error:", error instanceof Error ? error.message : "Unknown");
    return errorResponse("Internal server error", 500, corsHeaders);
  }
});
