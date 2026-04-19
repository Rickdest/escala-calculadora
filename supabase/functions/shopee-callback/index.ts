import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SHOPEE_HOST,
  corsHeaders,
  generateSignWith,
  getCredentialsForAppType,
} from "../_shared/shopee.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("SHOPEE CALLBACK");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const appUrl = Deno.env.get("APP_URL");
    if (!appUrl) {
      log.error("config_missing", { var: "APP_URL" });
      return new Response("APP_URL not configured", { status: 500 });
    }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const shopId = url.searchParams.get("shop_id");
    const state = url.searchParams.get("state");

    log.info("start", { shopId, state, hasCode: !!code });

    if (!code || !shopId) {
      log.error("missing_params");
      return Response.redirect(`${appUrl}/configuracoes/integracoes?shopee_error=missing_params`, 302);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let userId: string | null = null;
    let appType = 'seller';
    let storeId: string | null = null;

    if (state) {
      const { data: stateRow, error: stateError } = await supabaseAdmin
        .from("shopee_auth_states")
        .select("user_id, app_type, store_id")
        .eq("state", state)
        .maybeSingle();

      log.info("state_lookup", { found: !!stateRow, app_type: stateRow?.app_type, store_id: stateRow?.store_id, stateError });

      if (stateRow) {
        userId = stateRow.user_id;
        appType = stateRow.app_type || 'seller';
        storeId = stateRow.store_id || null;
        // Immediate cleanup so a leaked state can't be reused
        await supabaseAdmin
          .from("shopee_auth_states")
          .delete()
          .eq("state", state);
      }
    }

    if (!userId) {
      log.error("invalid_state");
      return Response.redirect(`${appUrl}/configuracoes/integracoes?shopee_error=invalid_state`, 302);
    }

    log.info("user_resolved", { app_type: appType });

    let creds;
    try {
      creds = getCredentialsForAppType(appType);
    } catch (credErr) {
      log.error("credential_error", { app_type: appType, message: (credErr as Error).message });
      return Response.redirect(`${appUrl}/configuracoes/integracoes?shopee_error=error_param&app_type=${appType}`, 302);
    }

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

    log.info("token_exchange", { partner_id: creds.partnerId });

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tokenBody),
    });

    const tokenText = await tokenRes.text();
    log.info("token_response", { status: tokenRes.status });

    if (!tokenRes.ok) {
      log.error("token_http_error", { status: tokenRes.status, body: tokenText.substring(0, 300) });
      return Response.redirect(`${appUrl}/configuracoes/integracoes?shopee_error=token_exchange_http_error&app_type=${appType}`, 302);
    }

    let tokenData: Record<string, unknown>;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (parseErr) {
      log.error("token_parse_error", { message: (parseErr as Error).message });
      return Response.redirect(`${appUrl}/configuracoes/integracoes?shopee_error=token_parse_error&app_type=${appType}`, 302);
    }

    if (tokenData.error || !tokenData.access_token) {
      log.error("token_error", { error: tokenData.error, message: tokenData.message });
      const shopeeMsg = typeof tokenData.message === 'string' ? tokenData.message : '';
      const isDomainError = shopeeMsg.includes('redirect') || shopeeMsg.includes('domain');
      return Response.redirect(`${appUrl}/configuracoes/integracoes?shopee_error=${isDomainError ? 'redirect_domain' : 'token_failed'}&app_type=${appType}`, 302);
    }

    const upsertPayload: Record<string, unknown> = {
      user_id: userId,
      shop_id: Number(shopId),
      app_type: appType,
      store_id: storeId,
      access_token: tokenData.access_token as string,
      refresh_token: tokenData.refresh_token as string,
      expire_in: (tokenData.expire_in as number) || 0,
      token_created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    log.info("upsert", {
      shop_id: upsertPayload.shop_id,
      app_type: upsertPayload.app_type,
      store_id: upsertPayload.store_id,
      expire_in: upsertPayload.expire_in,
    });

    const { error: upsertError } = await supabaseAdmin
      .from("shopee_tokens")
      .upsert(upsertPayload, { onConflict: "user_id,store_id,shop_id,app_type" });

    if (upsertError) {
      log.error("upsert_error", { error: upsertError.message });
      return Response.redirect(`${appUrl}/configuracoes/integracoes?shopee_error=token_upsert_failed&app_type=${appType}`, 302);
    }

    log.info("success", { app_type: appType });

    let redirectUrl = `${appUrl}/configuracoes/integracoes?shopee_connected=true&app_type=${appType}`;
    if (appType === 'seller') {
      redirectUrl += '&next=ads';
    }
    return Response.redirect(redirectUrl, 302);
  } catch (e) {
    log.error("fatal", { message: (e as Error).message });
    return Response.redirect(`${appUrl}/configuracoes/integracoes?shopee_error=unknown`, 302);
  }
});
