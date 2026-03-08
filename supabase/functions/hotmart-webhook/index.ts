import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hotmart-hottok",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const HOTMART_HOTTOK = Deno.env.get("HOTMART_HOTTOK");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase env vars");
      return new Response(JSON.stringify({ error: "Server config error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate hottok - MANDATORY
    if (!HOTMART_HOTTOK) {
      console.error("HOTMART_HOTTOK not configured");
      return new Response(JSON.stringify({ error: "Server config error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hottok = req.headers.get("x-hotmart-hottok");
    if (hottok !== HOTMART_HOTTOK) {
      console.error("Invalid hottok");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    
    // Log only event type, not full payload (avoid leaking PII)
    const event = body.event || body.data?.event;
    console.log("Hotmart webhook event:", event);

    const buyer = body.data?.buyer || body.buyer;
    const purchase = body.data?.purchase || body.purchase;
    const subscription = body.data?.subscription || body.subscription;

    if (!buyer?.email || typeof buyer.email !== "string") {
      return new Response(JSON.stringify({ error: "Missing buyer email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const email = buyer.email.toLowerCase().trim();
    if (!emailRegex.test(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const transactionId = typeof purchase?.transaction === "string" 
      ? purchase.transaction.slice(0, 100) : null;
    const subscriptionId = typeof subscription?.subscriber?.code === "string" 
      ? subscription.subscriber.code.slice(0, 100) : null;
    const planName = (
      typeof purchase?.offer?.code === "string" ? purchase.offer.code :
      typeof body.data?.product?.name === "string" ? body.data.product.name : "pro"
    ).slice(0, 50);

    // Map Hotmart events to subscription status
    const allowedEvents = [
      "PURCHASE_APPROVED", "PURCHASE_COMPLETE",
      "PURCHASE_CANCELED", "SUBSCRIPTION_CANCELLATION",
      "PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK",
      "PURCHASE_DELAYED", "PURCHASE_PROTEST",
      "SWITCH_PLAN",
    ];

    if (!allowedEvents.includes(event)) {
      console.log("Unhandled event:", event);
      return new Response(JSON.stringify({ ok: true, event }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let status = "free";
    let trialStart: string | null = null;
    let trialEnd: string | null = null;
    let periodStart: string | null = null;
    let periodEnd: string | null = null;

    switch (event) {
      case "PURCHASE_APPROVED":
      case "PURCHASE_COMPLETE":
        status = "active";
        periodStart = new Date().toISOString();
        if (purchase?.offer?.payment_mode === "SUBSCRIPTION" || subscription) {
          if (subscription?.trial_period_days || purchase?.recurrence_number === 0) {
            status = "trialing";
            trialStart = new Date().toISOString();
            const trialDays = Math.min(
              Math.max(Number(subscription?.trial_period_days) || 7, 1),
              90
            );
            trialEnd = new Date(Date.now() + trialDays * 86400000).toISOString();
            periodEnd = trialEnd;
          }
        }
        break;
      case "PURCHASE_CANCELED":
      case "SUBSCRIPTION_CANCELLATION":
      case "PURCHASE_REFUNDED":
      case "PURCHASE_CHARGEBACK":
        status = "canceled";
        break;
      case "PURCHASE_DELAYED":
      case "PURCHASE_PROTEST":
        status = "past_due";
        break;
      case "SWITCH_PLAN":
        status = "active";
        periodStart = new Date().toISOString();
        break;
    }

    // Find user by email using admin API with filter (not listAll)
    const { data: userList } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    // Filter server-side isn't supported well, so search in result
    const userMatch = userList?.users?.find(
      (u: any) => u.email?.toLowerCase() === email
    );
    const userId = userMatch?.id || null;

    // Build subscription data
    const subscriptionData: Record<string, unknown> = {
      email,
      plan: planName,
      status,
      updated_at: new Date().toISOString(),
    };

    if (userId) subscriptionData.user_id = userId;
    if (transactionId) subscriptionData.hotmart_transaction_id = transactionId;
    if (subscriptionId) subscriptionData.hotmart_subscription_id = subscriptionId;
    if (trialStart) subscriptionData.trial_start = trialStart;
    if (trialEnd) subscriptionData.trial_end = trialEnd;
    if (periodStart) subscriptionData.current_period_start = periodStart;
    if (periodEnd) subscriptionData.current_period_end = periodEnd;

    // Upsert by email
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update(subscriptionData)
        .eq("id", existing.id);
      if (updateError) console.error("Update error:", updateError.message);
    } else {
      if (!userId) {
        subscriptionData.user_id = "00000000-0000-0000-0000-000000000000";
      }
      const { error: insertError } = await supabase
        .from("subscriptions")
        .insert(subscriptionData);
      if (insertError) console.error("Insert error:", insertError.message);
    }

    console.log(`Subscription ${status} for user`);

    return new Response(JSON.stringify({ ok: true, status }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error instanceof Error ? error.message : "Unknown");
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
