import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SHOPEE_HOST,
  PARTNER_ID,
  corsHeaders,
  generateSign,
  shopeeGet,
  errorResponse,
  jsonResponse,
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

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _role: "admin",
    });
    if (!isAdmin) {
      return errorResponse("Admin only", 403);
    }

    const { data: tokens } = await supabase
      .from("shopee_tokens")
      .select("*")
      .eq("user_id", user.id)
      .limit(1);

    if (!tokens || tokens.length === 0) {
      return errorResponse("No Shopee token found. Connect your shop first.");
    }

    const shopeeToken = tokens[0];
    const shopId = shopeeToken.shop_id;
    let currentAccessToken = shopeeToken.access_token;

    // Refresh token if near expiry
    const tokenAge =
      (Date.now() - new Date(shopeeToken.token_created_at).getTime()) / 1000;

    if (tokenAge > shopeeToken.expire_in - 300) {
      const refreshPath = "/api/v2/auth/access_token/get";
      const timestamp = Math.floor(Date.now() / 1000);
      const sign = await generateSign(refreshPath, timestamp);

      const refreshUrl = `${SHOPEE_HOST}${refreshPath}?partner_id=${PARTNER_ID}&timestamp=${timestamp}&sign=${sign}`;

      const refreshRes = await fetch(refreshUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refresh_token: shopeeToken.refresh_token,
          shop_id: Number(shopId),
          partner_id: PARTNER_ID,
        }),
      });

      const refreshData = await refreshRes.json();
      if (refreshData.access_token) {
        currentAccessToken = refreshData.access_token;

        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabaseAdmin
          .from("shopee_tokens")
          .update({
            access_token: refreshData.access_token,
            refresh_token: refreshData.refresh_token,
            expire_in: refreshData.expire_in || 0,
            token_created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", shopeeToken.id);
      }
    }

    const adsData = await shopeeGet(
      "/api/v2/marketing/get_shop_campaigns",
      currentAccessToken,
      shopId
    );

    return jsonResponse({
      success: true,
      shop_id: shopId,
      ads_response: adsData,
      message: "Sync completed.",
    });
  } catch (e) {
    console.error("Sync error:", e);
    return errorResponse((e as Error).message, 500);
  }
});
