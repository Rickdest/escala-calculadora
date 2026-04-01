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

    console.log("[SHOPEE CALLBACK] === INICIO ===");
    console.log("[SHOPEE CALLBACK] Params recebidos:", { code, shopId, state });
    console.log("[SHOPEE CALLBACK] URL completa:", req.url);

    if (!code || !shopId) {
      console.error("[SHOPEE CALLBACK] Params faltando - code:", code, "shopId:", shopId);
      return Response.redirect(`${appUrl}/roas?shopee_error=missing_params`, 302);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve user_id from state token
    let userId: string | null = null;

    if (state) {
      const { data: stateRow, error: stateError } = await supabaseAdmin
        .from("shopee_auth_states")
        .select("user_id")
        .eq("state", state)
        .maybeSingle();

      console.log("[SHOPEE CALLBACK] State lookup result:", { stateRow, stateError });

      if (stateRow) {
        userId = stateRow.user_id;
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

    console.log("[SHOPEE CALLBACK] User ID resolvido:", userId);

    // Token exchange
    const path = "/api/v2/auth/token/get";
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = await generateSign(path, timestamp, undefined, Number(shopId));

    const tokenUrl = `${SHOPEE_HOST}${path}?partner_id=${PARTNER_ID}&timestamp=${timestamp}&sign=${sign}`;
    const tokenBody = {
      code,
      shop_id: Number(shopId),
      partner_id: PARTNER_ID,
    };

    console.log("[SHOPEE CALLBACK] === TOKEN EXCHANGE ===");
    console.log("[SHOPEE CALLBACK] SHOPEE_HOST:", SHOPEE_HOST);
    console.log("[SHOPEE CALLBACK] PARTNER_ID:", PARTNER_ID);
    console.log("[SHOPEE CALLBACK] Token URL:", tokenUrl);
    console.log("[SHOPEE CALLBACK] Timestamp:", timestamp);
    console.log("[SHOPEE CALLBACK] Sign:", sign);
    console.log("[SHOPEE CALLBACK] Body:", JSON.stringify(tokenBody));

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tokenBody),
    });

    const tokenText = await tokenRes.text();

    console.log("[SHOPEE CALLBACK] === RESPOSTA SHOPEE ===");
    console.log("[SHOPEE CALLBACK] HTTP Status:", tokenRes.status);
    console.log("[SHOPEE CALLBACK] Response Headers:", Object.fromEntries(tokenRes.headers.entries()));
    console.log("[SHOPEE CALLBACK] Response Body:", tokenText);

    if (!tokenRes.ok) {
      console.error("[SHOPEE CALLBACK] HTTP error - status:", tokenRes.status);
      return Response.redirect(`${appUrl}/roas?shopee_error=token_exchange_http_error`, 302);
    }

    let tokenData: Record<string, unknown>;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (parseErr) {
      console.error("[SHOPEE CALLBACK] JSON parse error:", parseErr, "Raw text:", tokenText);
      return Response.redirect(`${appUrl}/roas?shopee_error=token_parse_error`, 302);
    }

    console.log("[SHOPEE CALLBACK] Token data parsed:", JSON.stringify(tokenData));

    if (tokenData.error || !tokenData.access_token) {
      console.error("[SHOPEE CALLBACK] Token error:", JSON.stringify(tokenData));
      return Response.redirect(`${appUrl}/roas?shopee_error=token_failed`, 302);
    }

    const upsertPayload = {
      user_id: userId,
      shop_id: Number(shopId),
      access_token: tokenData.access_token as string,
      refresh_token: tokenData.refresh_token as string,
      expire_in: (tokenData.expire_in as number) || 0,
      token_created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("[SHOPEE CALLBACK] Upsert payload (sem tokens):", {
      user_id: upsertPayload.user_id,
      shop_id: upsertPayload.shop_id,
      expire_in: upsertPayload.expire_in,
    });

    const { error: upsertError } = await supabaseAdmin
      .from("shopee_tokens")
      .upsert(upsertPayload, { onConflict: "user_id,shop_id" });

    if (upsertError) {
      console.error("[SHOPEE CALLBACK] Upsert error:", JSON.stringify(upsertError));
      return Response.redirect(`${appUrl}/roas?shopee_error=token_upsert_failed`, 302);
    }

    console.log("[SHOPEE CALLBACK] === SUCESSO === Token salvo com sucesso");
    return Response.redirect(`${appUrl}/roas?shopee_connected=true`, 302);
  } catch (e) {
    console.error("[SHOPEE CALLBACK] === ERRO FATAL ===");
    console.error("[SHOPEE CALLBACK] Error:", e);
    console.error("[SHOPEE CALLBACK] Stack:", (e as Error)?.stack);
    return Response.redirect(`${appUrl}/roas?shopee_error=unknown`, 302);
  }
});
