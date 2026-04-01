import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  errorResponse,
  jsonResponse,
  getAuthUrl,
} from "../_shared/shopee.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Unauthorized", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    const appUrl = Deno.env.get("APP_URL");
    if (!appUrl) {
      return errorResponse("APP_URL not configured", 500);
    }

    // Generate a state token and save it linked to this user
    const state = crypto.randomUUID();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: stateError } = await supabaseAdmin
      .from("shopee_auth_states")
      .insert({ user_id: user.id, state });

    if (stateError) {
      console.error("[SHOPEE AUTH] State insert error:", stateError);
      return errorResponse("Failed to create auth state", 500);
    }

    // Append state to redirect_url so callback receives it
    const callbackWithState = `${redirect_url}?state=${state}`;
    const authUrl = await getAuthUrl(callbackWithState);

    return jsonResponse({ auth_url: authUrl });
  } catch (e) {
    console.error("shopee-auth error:", e);
    return errorResponse((e as Error).message, 500);
  }
});
