import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  errorResponse,
  jsonResponse,
  getAuthUrl,
  PARTNER_ID,
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

    const { redirect_url } = await req.json();
    if (!redirect_url) {
      return errorResponse("redirect_url required");
    }

    const authUrl = await getAuthUrl(redirect_url);

    console.log("[SHOPEE AUTH] Generated URL:", {
      partner_id: PARTNER_ID,
      redirect_url,
      auth_url_prefix: authUrl.substring(0, 100) + "...",
    });

    return jsonResponse({ auth_url: authUrl });
  } catch (e) {
    console.error("shopee-auth error:", e);
    return errorResponse((e as Error).message, 500);
  }
});
