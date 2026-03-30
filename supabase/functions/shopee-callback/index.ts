import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SHOPEE_HOST,
  SHOPEE_PARTNER_ID,
  corsHeaders,
  hmacSign,
} from "../_shared/shopee.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const appUrl =
    Deno.env.get("APP_URL") || "https://escala-calculadora.lovable.app";

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const shopId = url.searchParams.get("shop_id");

    if (!code || !shopId) {
      return Response.redirect(
        `${appUrl}/roas?shopee_error=missing_params`,
        302
      );
    }

    const path = "/api/v2/auth/token/get";
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = await hmacSign(path, timestamp);

    const tokenUrl = `${SHOPEE_HOST}${path}?partner_id=${SHOPEE_PARTNER_ID}&timestamp=${timestamp}&sign=${sign}`;

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        shop_id: Number(shopId),
        partner_id: SHOPEE_PARTNER_ID,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error("Shopee token error:", tokenData);
      return Response.redirect(
        `${appUrl}/roas?shopee_error=token_failed`,
        302
      );
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
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expire_in: tokenData.expire_in || 0,
          token_created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,shop_id" }
      );

    if (upsertError) {
      console.error("Upsert error:", upsertError);
    }

    return Response.redirect(`${appUrl}/roas?shopee_connected=true`, 302);
  } catch (e) {
    console.error("Callback error:", e);
    return Response.redirect(`${appUrl}/roas?shopee_error=unknown`, 302);
  }
});
