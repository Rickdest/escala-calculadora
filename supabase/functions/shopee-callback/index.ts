import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SHOPEE_HOST,
  corsHeaders,
  generateSignWith,
  getCredentialsForAppType,
} from "../_shared/shopee.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const appUrl =
    Deno.env.get("APP_URL") || "https://app.richardaragao.com.br";

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const shopId = url.searchParams.get("shop_id");
    const state = url.searchParams.get("state");

    console.log("[SHOPEE CALLBACK] === INICIO ===");
    console.log("[SHOPEE CALLBACK] Params recebidos:", { shopId, state, hasCode: !!code });

    if (!code || !shopId) {
      console.error("[SHOPEE CALLBACK] Params faltando");
      return Response.redirect(`${appUrl}/roas?shopee_error=missing_params`, 302);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve user_id and app_type from state token
    let userId: string | null = null;
    let appType = 'seller';

    if (state) {
      const { data: stateRow, error: stateError } = await supabaseAdmin
        .from("shopee_auth_states")
        .select("user_id, app_type")
        .eq("state", state)
        .maybeSingle();

      console.log("[SHOPEE CALLBACK] State lookup result:", { stateRow: stateRow ? { user_id: stateRow.user_id, app_type: stateRow.app_type } : null, stateError });

      if (stateRow) {
        userId = stateRow.user_id;
        appType = stateRow.app_type || 'seller';
        await supabaseAdmin
          .from("shopee_auth_states")
          .delete()
          .eq("state", state);
      }
    }

    if (!userId) {
      console.error("[SHOPEE CALLBACK] No valid state/user found. state:", state);
      return Response.redirect(`${appUrl}/roas?shopee_error=invalid_state`, 302);
    }

    console.log("[SHOPEE CALLBACK] User ID:", userId, "app_type:", appType);

    // Use correct credentials for this app type
    const creds = getCredentialsForAppType(appType);

    // Token exchange
    const path = "/api/v2/auth/token/get";
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = await generateSignWith(creds.partnerId, creds.partnerKey, path, timestamp);

    const tokenUrl = `${SHOPEE_HOST}${path}?partner_id=${creds.partnerId}&timestamp=${timestamp}&sign=${sign}`;
    const tokenBody = {
      code,
      shop_id: Number(shopId),
      partner_id: creds.partnerId,
    };

    console.log("[SHOPEE CALLBACK] Token exchange with partner_id:", creds.partnerId);

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tokenBody),
    });

    const tokenText = await tokenRes.text();
    console.log("[SHOPEE CALLBACK] HTTP Status:", tokenRes.status);

    if (!tokenRes.ok) {
      console.error("[SHOPEE CALLBACK] HTTP error - status:", tokenRes.status, "body:", tokenText.substring(0, 300));
      return Response.redirect(`${appUrl}/roas?shopee_error=token_exchange_http_error`, 302);
    }

    let tokenData: Record<string, unknown>;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (parseErr) {
      console.error("[SHOPEE CALLBACK] JSON parse error:", parseErr);
      return Response.redirect(`${appUrl}/roas?shopee_error=token_parse_error`, 302);
    }

    if (tokenData.error || !tokenData.access_token) {
      console.error("[SHOPEE CALLBACK] Token error:", JSON.stringify(tokenData));
      return Response.redirect(`${appUrl}/roas?shopee_error=token_failed`, 302);
    }

    const upsertPayload = {
      user_id: userId,
      shop_id: Number(shopId),
      app_type: appType,
      access_token: tokenData.access_token as string,
      refresh_token: tokenData.refresh_token as string,
      expire_in: (tokenData.expire_in as number) || 0,
      token_created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("[SHOPEE CALLBACK] Upsert:", {
      user_id: upsertPayload.user_id,
      shop_id: upsertPayload.shop_id,
      app_type: upsertPayload.app_type,
      expire_in: upsertPayload.expire_in,
    });

    const { error: upsertError } = await supabaseAdmin
      .from("shopee_tokens")
      .upsert(upsertPayload, { onConflict: "user_id,shop_id,app_type" });

    if (upsertError) {
      console.error("[SHOPEE CALLBACK] Upsert error:", JSON.stringify(upsertError));
      return Response.redirect(`${appUrl}/roas?shopee_error=token_upsert_failed`, 302);
    }

    console.log(`[SHOPEE CALLBACK] === SUCESSO === Token salvo (app_type=${appType})`);
    return Response.redirect(`${appUrl}/roas?shopee_connected=true&app_type=${appType}`, 302);
  } catch (e) {
    console.error("[SHOPEE CALLBACK] === ERRO FATAL ===");
    console.error("[SHOPEE CALLBACK] Error:", e);
    return Response.redirect(`${appUrl}/roas?shopee_error=unknown`, 302);
  }
});
