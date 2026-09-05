const PAYSTACK_API = "https://api.paystack.co";

export function getPaystackPlan(interval) {
  const plans = {
    monthly: { interval: "monthly", amount: 150000, planCode: process.env["PAYSTACK_PRO_MONTHLY_PLAN_CODE"] },
    annually: { interval: "annually", amount: 1500000, planCode: process.env["PAYSTACK_PRO_ANNUAL_PLAN_CODE"] },
  };
  const plan = plans[interval];
  if (!plan) throw new Error("Choose monthly or annually.");
  if (!plan.planCode) throw new Error(`Missing Paystack ${interval} plan code.`);
  return plan;
}

export async function paystackRequest(path, init = {}) {
  const secret = process.env["PAYSTACK_SECRET_KEY"];
  if (!secret) throw new Error("Missing PAYSTACK_SECRET_KEY.");
  const response = await fetch(`${PAYSTACK_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json", ...init.headers },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.status) throw new Error(payload?.message || `Paystack request failed (${response.status}).`);
  return payload.data;
}

function metadataOf(data) {
  if (data?.metadata && typeof data.metadata === "object") return data.metadata;
  if (typeof data?.metadata === "string" && data.metadata) {
    try { return JSON.parse(data.metadata); } catch { return {}; }
  }
  return {};
}

function subscriptionCodeOf(data) {
  return typeof data?.subscription === "string" ? data.subscription : data?.subscription?.subscription_code ?? data?.subscription_code ?? null;
}

function customerCodeOf(data) {
  return typeof data?.customer === "string" ? data.customer : data?.customer?.customer_code ?? data?.customer_code ?? null;
}

function periodEnd(paidAt, interval, suggestedDate) {
  const suggested = suggestedDate ? new Date(suggestedDate) : null;
  if (suggested && !Number.isNaN(suggested.getTime()) && suggested > new Date(paidAt)) return suggested.toISOString();
  const end = new Date(paidAt);
  if (interval === "annually") end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return end.toISOString();
}

export async function applySuccessfulTransaction(data) {
  if (data?.status !== "success") throw new Error("Transaction is not successful.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const reference = data.reference;
  if (!reference) throw new Error("Paystack transaction has no reference.");
  const metadata = metadataOf(data);
  let subscriptionCode = subscriptionCodeOf(data);
  const customerCode = customerCodeOf(data);

  let { data: payment } = await supabaseAdmin.from("payment_transactions").select("*").eq("reference", reference).maybeSingle();
  let subscription = null;
  if (!payment && (subscriptionCode || customerCode)) {
    let query = supabaseAdmin.from("subscriptions").select("*");
    query = subscriptionCode ? query.eq("provider_subscription_id", subscriptionCode) : query.eq("provider_customer_code", customerCode);
    const result = await query.maybeSingle();
    subscription = result.data;
  }

  const userId = payment?.user_id ?? subscription?.user_id ?? metadata.user_id;
  const interval = payment?.interval ?? subscription?.billing_interval ?? metadata.interval;
  if (!userId || !interval) throw new Error("Could not match this Paystack charge to an EchoNotes account.");
  const plan = getPaystackPlan(interval);
  if (data.currency !== "NGN" || Number(data.amount) !== plan.amount) throw new Error("Paystack amount or currency does not match the selected EchoNotes plan.");

  // Paystack can deliver subscription.create before charge.success, and the
  // charge payload does not always contain the new subscription code. Resolve
  // it from Paystack so subscription management never depends on event order.
  if (!subscriptionCode && customerCode) {
    try {
      const subscriptions = await paystackRequest(`/subscription?customer=${encodeURIComponent(customerCode)}`);
      const candidates = Array.isArray(subscriptions) ? subscriptions : subscriptions?.data ?? [];
      const matching = candidates.find((item) => {
        const itemPlanCode = typeof item?.plan === "string" ? item.plan : item?.plan?.plan_code;
        return itemPlanCode === plan.planCode && !["cancelled", "complete"].includes(item?.status);
      }) ?? candidates.find((item) => !["cancelled", "complete"].includes(item?.status));
      subscriptionCode = matching?.subscription_code ?? null;
    } catch (error) {
      console.warn("Could not resolve Paystack subscription from charge", error);
    }
  }
  const paidAt = data.paid_at ?? data.paidAt ?? new Date().toISOString();
  const nextPayment = data?.subscription?.next_payment_date ?? null;

  const { error: paymentError } = await supabaseAdmin.from("payment_transactions").upsert({
    user_id: userId,
    reference,
    interval,
    amount_kobo: Number(data.amount),
    currency: data.currency,
    status: "success",
    provider_transaction_id: data.id == null ? null : String(data.id),
    paid_at: paidAt,
    raw_response: data,
  }, { onConflict: "reference" });
  if (paymentError) throw paymentError;

  const { error: subscriptionError } = await supabaseAdmin.from("subscriptions").upsert({
    user_id: userId,
    plan: "pro",
    status: "active",
    provider: "paystack",
    provider_customer_id: customerCode,
    provider_customer_code: customerCode,
    provider_subscription_id: subscriptionCode,
    billing_interval: interval,
    current_period_start: paidAt,
    current_period_end: periodEnd(paidAt, interval, nextPayment),
  }, { onConflict: "user_id" });
  if (subscriptionError) throw subscriptionError;
  return { userId, interval, reference };
}

export async function processPaystackEvent(event) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const data = event?.data ?? {};
  const identity = data.reference ?? data.invoice_code ?? data.subscription_code ?? data.id ?? data.created_at ?? "unknown";
  const eventKey = `${event.event}:${identity}`;
  const { data: existing } = await supabaseAdmin.from("billing_events").select("event_key").eq("event_key", eventKey).maybeSingle();
  if (existing) return;

  if (event.event === "charge.success") await applySuccessfulTransaction(data);
  if (event.event === "invoice.update" && data.paid && data.transaction?.status === "success") {
    await applySuccessfulTransaction({ ...data.transaction, paid_at: data.paid_at, customer: data.customer, subscription: data.subscription });
  }

  if (["subscription.create", "subscription.not_renew", "subscription.disable", "invoice.payment_failed"].includes(event.event)) {
    const subscriptionCode = subscriptionCodeOf(data);
    const customerCode = customerCodeOf(data);
    if (subscriptionCode || customerCode) {
      let query = supabaseAdmin.from("subscriptions").select("user_id,current_period_end");
      query = subscriptionCode ? query.eq("provider_subscription_id", subscriptionCode) : query.eq("provider_customer_code", customerCode);
      const { data: matched } = await query.maybeSingle();
      if (matched) {
        const status = event.event === "subscription.create" ? "active" : event.event === "subscription.not_renew" ? "cancelled" : event.event === "invoice.payment_failed" ? "past_due" : "expired";
        const update = { status, provider_subscription_id: subscriptionCode, provider_customer_code: customerCode };
        if (data.email_token) update.provider_email_token = data.email_token;
        if (data.next_payment_date) update.current_period_end = data.next_payment_date;
        const { error } = await supabaseAdmin.from("subscriptions").update(update).eq("user_id", matched.user_id);
        if (error) throw error;
      }
    }
  }

  const { error } = await supabaseAdmin.from("billing_events").insert({ event_key: eventKey, event_type: event.event, payload: event });
  if (error?.code !== "23505") throw error;
}

export async function verifyPaystackSignature(rawBody, signature) {
  const secret = process.env["PAYSTACK_SECRET_KEY"];
  if (!secret || !signature) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (hash.length !== signature.length) return false;
  let difference = 0;
  for (let index = 0; index < hash.length; index += 1) difference |= hash.charCodeAt(index) ^ signature.charCodeAt(index);
  return difference === 0;
}
