import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SHOPEE_HOST,
  PARTNER_ID,
  corsHeaders,
  generateSign,
} from "../_shared/shopee.ts";

Deno.serve(async (req) => {
  console.log("[SHOPEE CALLBACK] Function invoked", {
    url: req.url,
    method: req.method,
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const appUrl =
    Deno.env.get("APP_URL") || "https://app.richardaragao.com.br";

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const shopId = url.searchParams.get("shop_id");

    console.log("[SHOPEE CALLBACK] received:", {
      code: code ? `${code.substring(0, 8)}...` : null,
      shop_id: shopId,
      all_params: Object.fromEntries(url.searchParams.entries()),
    });

    if (!code || !shopId) {
      console.error("[SHOPEE CALLBACK] Missing params:", { code: !!code, shopId: !!shopId });
      return Response.redirect(`${appUrl}/roas?shopee_error=missing_params`, 302);
    }

    // Token exchange - official v2 format
    const path = "/api/v2/auth/token/get";
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = await generateSign(path, timestamp, undefined, Number(shopId));

    const tokenUrl = `${SHOPEE_HOST}${path}?partner_id=${PARTNER_ID}&timestamp=${timestamp}&sign=${sign}`;

    const tokenBody = {
      code,
      shop_id: Number(shopId),
      partner_id: PARTNER_ID,
    };

    console.log("[SHOPEE CALLBACK] Token exchange:", {
      url: tokenUrl.substring(0, 80) + "...",
      shop_id: shopId,
    });

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tokenBody),
    });

    const tokenText = await tokenRes.text();
    console.log("[SHOPEE CALLBACK] Token response:", {
      status: tokenRes.status,
      body: tokenText.substring(0, 500),
    });

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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: adminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1);

    const adminUserId = adminRoles?.[0]?.user_id;
    if (!adminUserId) {
      return Response.redirect(`${appUrl}/roas?shopee_error=no_admin`, 302);
    }

    const { error: upsertError } = await supabaseAdmin
      .from("shopee_tokens")
      .upsert(
        {
          user_id: adminUserId,
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

    console.log("[SHOPEE CALLBACK] Token saved for shop:", shopId);
    return Response.redirect(`${appUrl}/roas?shopee_connected=true`, 302);
  } catch (e) {
    console.error("[SHOPEE CALLBACK] Error:", e);
    return Response.redirect(`${appUrl}/roas?shopee_error=unknown`, 302);
  }
});
