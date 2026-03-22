import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const CAKTO_WEBHOOK_SECRET = Deno.env.get("CAKTO_WEBHOOK_SECRET");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase env vars");
      return new Response(JSON.stringify({ error: "Server config error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!CAKTO_WEBHOOK_SECRET) {
      console.error("CAKTO_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Server config error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    // Validate secret from body
    const secret = body.secret || body.fields?.secret;
    if (secret !== CAKTO_WEBHOOK_SECRET) {
      console.error("Invalid webhook secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = body.event;
    console.log("Cakto webhook event:", event);

    const customer = body.customer;
    if (!customer?.email || typeof customer.email !== "string") {
      return new Response(JSON.stringify({ error: "Missing customer email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const email = customer.email.toLowerCase().trim();
    if (!emailRegex.test(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const orderId = typeof body.id === "string" ? body.id.slice(0, 100) : null;
    const refId = typeof body.refId === "string" ? body.refId.slice(0, 100) : null;
    const subscriptionId = typeof body.subscription?.id === "string"
      ? body.subscription.id.slice(0, 100) : null;
    const planName = (
      typeof body.product?.name === "string" ? body.product.name : "pro"
    ).slice(0, 50);

    // Map Cakto events to subscription status
    const allowedEvents = [
      "purchase_approved",
      "refund",
      "chargeback",
      "subscription_canceled",
      "subscription_renewed",
      "subscription_renewal_refused",
    ];

    if (!allowedEvents.includes(event)) {
      console.log("Unhandled event:", event);
      return new Response(JSON.stringify({ ok: true, event }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let status = "free";
    let periodStart: string | null = null;

    switch (event) {
      case "purchase_approved":
      case "subscription_renewed":
        status = "active";
        periodStart = new Date().toISOString();
        break;
      case "refund":
      case "chargeback":
      case "subscription_canceled":
        status = "canceled";
        break;
      case "subscription_renewal_refused":
        status = "past_due";
        break;
    }

    // Find user by email
    let userId: string | null = null;
    const { data: userByEmail } = await supabase.auth.admin.getUserByEmail(email);
    userId = userByEmail?.user?.id || null;

    // Fallback: try profiles table
    if (!userId) {
      const { data: profileMatch } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .maybeSingle();
      if (profileMatch) userId = profileMatch.user_id;
    }

    // Build subscription data
    const subscriptionData: Record<string, unknown> = {
      email,
      plan: planName,
      status,
      updated_at: new Date().toISOString(),
    };

    if (userId) subscriptionData.user_id = userId;
    if (orderId) subscriptionData.cakto_order_id = orderId;
    if (subscriptionId) subscriptionData.cakto_subscription_id = subscriptionId;
    if (periodStart) subscriptionData.current_period_start = periodStart;

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
