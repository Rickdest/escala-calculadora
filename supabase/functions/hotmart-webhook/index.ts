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

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const HOTMART_HOTTOK = Deno.env.get("HOTMART_HOTTOK");

    // Validate hottok if configured
    const hottok = req.headers.get("x-hotmart-hottok");
    if (HOTMART_HOTTOK && hottok !== HOTMART_HOTTOK) {
      console.error("Invalid hottok received");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    console.log("Hotmart webhook received:", JSON.stringify(body));

    const event = body.event || body.data?.event;
    const buyer = body.data?.buyer || body.buyer;
    const purchase = body.data?.purchase || body.purchase;
    const subscription = body.data?.subscription || body.subscription;

    if (!buyer?.email) {
      console.error("No buyer email found in webhook payload");
      return new Response(JSON.stringify({ error: "Missing buyer email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const email = buyer.email.toLowerCase();
    const transactionId = purchase?.transaction || null;
    const subscriptionId = subscription?.subscriber?.code || null;
    const planName = purchase?.offer?.code || body.data?.product?.name || "pro";

    // Map Hotmart events to subscription status
    let status = "free";
    let trialStart = null;
    let trialEnd = null;
    let periodStart = null;
    let periodEnd = null;

    switch (event) {
      case "PURCHASE_APPROVED":
      case "PURCHASE_COMPLETE":
        status = "active";
        periodStart = new Date().toISOString();
        // Check if it's a trial
        if (purchase?.offer?.payment_mode === "SUBSCRIPTION" || subscription) {
          // Check for trial period
          if (subscription?.trial_period_days || purchase?.recurrence_number === 0) {
            status = "trialing";
            trialStart = new Date().toISOString();
            const trialDays = subscription?.trial_period_days || 7;
            trialEnd = new Date(Date.now() + trialDays * 86400000).toISOString();
            periodEnd = trialEnd;
          }
        }
        break;

      case "PURCHASE_CANCELED":
      case "SUBSCRIPTION_CANCELLATION":
        status = "canceled";
        break;

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

      default:
        console.log("Unhandled event:", event);
        return new Response(JSON.stringify({ ok: true, event }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Find user by email
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find(
      (u: any) => u.email?.toLowerCase() === email
    );

    const userId = user?.id || null;

    // Upsert subscription
    const subscriptionData: any = {
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

    // Try to find existing subscription by email
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("subscriptions")
        .update(subscriptionData)
        .eq("id", existing.id);
    } else {
      if (!userId) {
        // User hasn't registered yet - store with a placeholder
        subscriptionData.user_id = "00000000-0000-0000-0000-000000000000";
      }
      await supabase.from("subscriptions").insert(subscriptionData);
    }

    console.log(`Subscription ${status} for ${email}`);

    return new Response(JSON.stringify({ ok: true, status }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
