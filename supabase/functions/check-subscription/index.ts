import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate JWT and get user
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );

    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email as string)?.toLowerCase() || "";

    // Use service role to check subscription (bypasses RLS for complete check)
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Check subscriptions table (by user_id or email)
    const { data: sub } = await adminClient
      .from("subscriptions")
      .select("status, plan, trial_end, trial_start")
      .or(`user_id.eq.${userId},email.eq.${userEmail}`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub) {
      if (sub.status === "active") {
        return respond({ status: "active", plan: sub.plan || "pro", trialEnd: null });
      }

      if (sub.status === "trialing" && sub.trial_end) {
        const trialEndDate = new Date(sub.trial_end);
        if (trialEndDate > new Date()) {
          return respond({ status: "trialing", plan: sub.plan || "pro", trialEnd: sub.trial_end });
        }
        return respond({ status: "expired", plan: "free", trialEnd: sub.trial_end });
      }

      if (sub.status === "canceled" || sub.status === "past_due") {
        return respond({ status: sub.status, plan: "free", trialEnd: sub.trial_end || null });
      }
    }

    // 2. Fallback to profile trial fields
    const { data: profile } = await adminClient
      .from("profiles")
      .select("status, trial_fim, trial_inicio")
      .eq("user_id", userId)
      .maybeSingle();

    if (profile) {
      if (profile.status === "ativo") {
        return respond({ status: "active", plan: "pro", trialEnd: null });
      }

      if (profile.status === "expirado" || profile.status === "cancelado") {
        return respond({ status: "expired", plan: "free", trialEnd: profile.trial_fim });
      }

      if (profile.status === "trial" && profile.trial_fim) {
        const end = new Date(profile.trial_fim);
        if (end > new Date()) {
          return respond({ status: "trialing", plan: "pro", trialEnd: profile.trial_fim });
        }
        return respond({ status: "expired", plan: "free", trialEnd: profile.trial_fim });
      }
    }

    // Nothing found
    return respond({ status: "expired", plan: "free", trialEnd: null });
  } catch (error) {
    console.error("check-subscription error:", error instanceof Error ? error.message : "Unknown");
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function respond(data: { status: string; plan: string; trialEnd: string | null }) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=60",
    },
  });
}
