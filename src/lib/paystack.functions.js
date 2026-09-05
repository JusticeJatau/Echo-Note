import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const initializeProCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ interval: z.enum(["monthly", "annually"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { getPaystackPlan, paystackRequest } = await import("@/lib/paystack.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const plan = getPaystackPlan(data.interval);
    const email = context.claims.email;
    if (!email) throw new Error("Your account has no billing email.");
    const { data: currentSubscription } = await supabaseAdmin.from("subscriptions").select("plan,status,current_period_end").eq("user_id", context.userId).maybeSingle();
    const stillPaid = currentSubscription?.current_period_end && new Date(currentSubscription.current_period_end).getTime() > Date.now();
    if (currentSubscription?.plan === "pro" && (currentSubscription.status === "active" || stillPaid)) throw new Error("This account already has an active Pro plan. Manage it from Billing settings.");
    const reference = `ECHONOTES-${Date.now()}-${crypto.randomUUID()}`;
    const request = getRequest();
    const origin = process.env["APP_URL"] || new URL(request.url).origin;
    const { error } = await supabaseAdmin.from("payment_transactions").insert({ user_id: context.userId, reference, interval: data.interval, amount_kobo: plan.amount });
    if (error) throw error;
    try {
      const checkout = await paystackRequest("/transaction/initialize", {
        method: "POST",
        body: JSON.stringify({ email, amount: plan.amount, plan: plan.planCode, reference, callback_url: `${origin}/app/settings?billing=verify&reference=${encodeURIComponent(reference)}`, metadata: JSON.stringify({ user_id: context.userId, interval: data.interval, product: "echonotes_pro" }) }),
      });
      return { authorizationUrl: checkout.authorization_url, reference };
    } catch (error) {
      await supabaseAdmin.from("payment_transactions").update({ status: "failed" }).eq("reference", reference);
      throw error;
    }
  });

export const verifyProCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ reference: z.string().min(10).max(160) }).parse(input))
  .handler(async ({ data, context }) => {
    const { applySuccessfulTransaction, paystackRequest } = await import("@/lib/paystack.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pending, error } = await supabaseAdmin.from("payment_transactions").select("user_id").eq("reference", data.reference).single();
    if (error || pending.user_id !== context.userId) throw new Error("This payment reference does not belong to your account.");
    const transaction = await paystackRequest(`/transaction/verify/${encodeURIComponent(data.reference)}`);
    const result = await applySuccessfulTransaction(transaction);
    if (result.userId !== context.userId) throw new Error("This payment belongs to another account.");
    return { ok: true, plan: "pro" };
  });

export const getSubscriptionManagementLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { paystackRequest } = await import("@/lib/paystack.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("subscriptions").select("provider_subscription_id").eq("user_id", context.userId).single();
    if (error || !data?.provider_subscription_id) throw new Error("No active Paystack subscription was found.");
    const result = await paystackRequest(`/subscription/${encodeURIComponent(data.provider_subscription_id)}/manage/link`);
    return { url: result.link };
  });
