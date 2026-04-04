import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  errorResponse,
  jsonResponse,
  getAuthUrl,
  getCredentialsForAppType,
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

    // Read app_type from body (default: 'seller')
    let appType = 'seller';
    try {
      if (req.method === "POST" || req.headers.get("content-type")?.includes("json")) {
        const body = await req.json().catch(() => ({}));
        if (body?.app_type === 'ads' || body?.app_type === 'seller') {
          appType = body.app_type;
        }
      }
    } catch { /* ignore */ }

    const appUrl = Deno.env.get("APP_URL");
    if (!appUrl) {
      return errorResponse("APP_URL not configured", 500);
    }

    // Generate a state token and save it linked to this user + app_type
    const state = crypto.randomUUID();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: stateError } = await supabaseAdmin
      .from("shopee_auth_states")
      .insert({ user_id: user.id, state, app_type: appType });

    if (stateError) {
      console.error("[SHOPEE AUTH] State insert error:", stateError);
      return errorResponse("Failed to create auth state", 500);
    }

    // Use credentials for the correct app type
    let creds;
    try {
      creds = getCredentialsForAppType(appType);
    } catch (credErr) {
      console.error(`[SHOPEE AUTH] Credential error for app_type=${appType}:`, (credErr as Error).message);
      return errorResponse(`Erro de configuração: ${(credErr as Error).message}`, 500);
    }
    const callbackWithState = `${appUrl}/shopee-callback?state=${state}`;
    const authUrl = await getAuthUrl(callbackWithState, creds.partnerId, creds.partnerKey);

    console.log(`[SHOPEE AUTH] Generated auth URL for app_type=${appType}, partner_id=${creds.partnerId}`);

    return jsonResponse({ auth_url: authUrl });
  } catch (e) {
    console.error("shopee-auth error:", e);
    return errorResponse((e as Error).message, 500);
  }
});
