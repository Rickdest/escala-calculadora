import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";

const caktoPayloadSchema = z.object({
  event: z.string().min(1).max(100),
  id: z.string().max(100).optional(),
  refId: z.string().max(100).optional(),
  fields: z.object({
    secret: z.string().min(1),
  }).optional(),
  secret: z.string().optional(),
  customer: z.object({
    email: z.string().email().max(255),
    name: z.string().max(200).optional(),
  }),
  product: z.object({
    name: z.string().max(50).optional(),
  }).optional(),
  subscription: z.object({
    id: z.string().max(100).optional(),
  }).optional(),
});

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  return `${user.substring(0, 3)}***@${domain}`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://pay.cakto.com.br",
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

    const clientIp = req.headers.get("x-forwarded-for") ?? "unknown";
    console.log("Webhook request from:", clientIp.split(",")[0].trim());

    // Parse body first — Cakto sends the secret inside the JSON payload
    const body = await req.json();

    // Validate payload schema
    const parsed = caktoPayloadSchema.safeParse(body);
    if (!parsed.success) {
      console.error("Invalid payload schema:", parsed.error.issues.map(i => i.message).join(", "));
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = parsed.data;

    // Validate secret from body (constant-time comparison)
    const secret = payload.fields?.secret || payload.secret || "";
    const encoder = new TextEncoder();
    const receivedBytes = encoder.encode(String(secret));
    const expectedBytes = encoder.encode(CAKTO_WEBHOOK_SECRET);
    const isValid = receivedBytes.length === expectedBytes.length &&
      crypto.subtle.timingSafeEqual(receivedBytes, expectedBytes);
    if (!isValid) {
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

    // ── Idempotency check ──
    // If we have an orderId, check if this exact event was already processed
    if (orderId) {
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id, status, cakto_order_id")
        .eq("email", email)
        .maybeSingle();

      if (existing?.cakto_order_id === orderId) {
        // Same order already processed — check if status would change
        const wouldBeStatus = getStatusForEvent(event);
        if (existing.status === wouldBeStatus) {
          console.log(`Idempotent: order ${orderId} already processed with status ${wouldBeStatus} for ${maskEmail(email)}`);
          return new Response(JSON.stringify({ ok: true, status: wouldBeStatus, idempotent: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const status = getStatusForEvent(event);
    let periodStart: string | null = null;
    if (event === "purchase_approved" || event === "subscription_renewed") {
      periodStart = new Date().toISOString();
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
    const { data: existingRow } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("email", email)
      .maybeSingle();

    const statusBefore = existingRow?.status || null;

    if (existingRow) {
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update(subscriptionData)
        .eq("id", existingRow.id);
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

    // Audit log
    await supabase.from("subscription_events").insert({
      email,
      user_id: userId,
      event_type: event,
      order_id: orderId,
      status_before: statusBefore,
      status_after: status,
    });

    console.log(`Subscription ${status} for ${maskEmail(email)} (order: ${orderId || 'n/a'})`);

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

function getStatusForEvent(event: string): string {
  switch (event) {
    case "purchase_approved":
    case "subscription_renewed":
      return "active";
    case "refund":
    case "chargeback":
    case "subscription_canceled":
      return "canceled";
    case "subscription_renewal_refused":
      return "past_due";
    default:
      return "free";
  }
}
