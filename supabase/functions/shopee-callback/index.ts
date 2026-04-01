import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SHOPEE_HOST,
  PARTNER_ID,
  corsHeaders,
  generateSign,
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

    if (!code || !shopId) {
      return Response.redirect(`${appUrl}/roas?shopee_error=missing_params`, 302);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve user_id from state token
    let userId: string | null = null;

    if (state) {
      const { data: stateRow } = await supabaseAdmin
        .from("shopee_auth_states")
        .select("user_id")
        .eq("state", state)
        .maybeSingle();

      if (stateRow) {
        userId = stateRow.user_id;
        // Delete used state
        await supabaseAdmin
          .from("shopee_auth_states")
          .delete()
          .eq("state", state);
      }
    }

    if (!userId) {
      console.error("[SHOPEE CALLBACK] No valid state/user found");
      return Response.redirect(`${appUrl}/roas?shopee_error=invalid_state`, 302);
    }

    // Token exchange
    const path = "/api/v2/auth/token/get";
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = await generateSign(path, timestamp, undefined, Number(shopId));

    const tokenUrl = `${SHOPEE_HOST}${path}?partner_id=${PARTNER_ID}&timestamp=${timestamp}&sign=${sign}`;

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        shop_id: Number(shopId),
        partner_id: PARTNER_ID,
      }),
    });

    const tokenText = await tokenRes.text();

    if (!tokenRes.ok) {
      return Response.redirect(`${appUrl}/roas?shopee_error=token_exchange_http_error`, 302);
    }

    let tokenData: Record<string, unknown>;
    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      return Response.redirect(`${appUrl}/roas?shopee_error=token_parse_error`, 302);
    }

    if (tokenData.error || !tokenData.access_token) {
      console.error("[SHOPEE CALLBACK] Token error:", tokenData);
      return Response.redirect(`${appUrl}/roas?shopee_error=token_failed`, 302);
    }

    const { error: upsertError } = await supabaseAdmin
      .from("shopee_tokens")
      .upsert(
        {
          user_id: userId,
          shop_id: Number(shopId),
          access_token: tokenData.access_token as string,
          refresh_token: tokenData.refresh_token as string,
          expire_in: (tokenData.expire_in as number) || 0,
          token_created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,shop_id" }
      );

    if (upsertError) {
      console.error("[SHOPEE CALLBACK] Upsert error:", upsertError);
      return Response.redirect(`${appUrl}/roas?shopee_error=token_upsert_failed`, 302);
    }

    return Response.redirect(`${appUrl}/roas?shopee_connected=true`, 302);
  } catch (e) {
    console.error("[SHOPEE CALLBACK] Error:", e);
    return Response.redirect(`${appUrl}/roas?shopee_error=unknown`, 302);
  }
});
