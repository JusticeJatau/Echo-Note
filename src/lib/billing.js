import { supabase } from "@/integrations/supabase/client";

export const PLAN_LIMITS = Object.freeze({
  basic: { cloudNotes: 100, devices: 2, shareLinks: 3 },
  pro: { cloudNotes: null, devices: 5, shareLinks: null },
});

const DEVICE_KEY_STORAGE = "echonotes-device-key";

export function getDeviceIdentity() {
  let key = localStorage.getItem(DEVICE_KEY_STORAGE);
  if (!key) {
    key = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(DEVICE_KEY_STORAGE, key);
  }
  const platform = navigator.userAgentData?.platform || navigator.platform || "Unknown platform";
  const browser = /Edg\//.test(navigator.userAgent) ? "Edge" : /Firefox\//.test(navigator.userAgent) ? "Firefox" : /Chrome\//.test(navigator.userAgent) ? "Chrome" : /Safari\//.test(navigator.userAgent) ? "Safari" : "Browser";
  return { key, name: `${browser} on ${platform}`, platform };
}

export async function registerCurrentDevice() {
  const device = getDeviceIdentity();
  const { data, error } = await supabase.rpc("register_device", {
    p_device_key: device.key,
    p_device_name: device.name,
    p_platform: device.platform,
  });
  if (!error) return { ok: true, device: data };
  if (error.message?.includes("DEVICE_LIMIT_REACHED")) return { ok: false, reason: "device-limit", error };
  if (error.code === "PGRST202" || error.code === "42883") return { ok: true, setupRequired: true };
  throw error;
}

export async function getBillingOverview(userId) {
  if (!userId) return null;
  const deviceKey = getDeviceIdentity().key;
  const [subscriptionResult, deviceResult, noteResult, shareResult] = await Promise.all([
    supabase.from("subscriptions").select("plan,status,current_period_end").eq("user_id", userId).maybeSingle(),
    supabase.from("user_devices").select("id,device_key,device_name,platform,last_seen_at,created_at").eq("user_id", userId).order("last_seen_at", { ascending: false }),
    supabase.from("notes").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_deleted", false),
    supabase.from("note_shares").select("share_id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  const missingSchema = [subscriptionResult.error, deviceResult.error].some((error) => error?.code === "42P01" || error?.code === "PGRST205");
  if (missingSchema) return { plan: "basic", status: "active", devices: [], currentDeviceKey: deviceKey, usage: { cloudNotes: noteResult.count ?? 0, shareLinks: shareResult.count ?? 0 }, setupRequired: true };
  const error = subscriptionResult.error || deviceResult.error || noteResult.error || shareResult.error;
  if (error) throw error;
  const subscription = subscriptionResult.data;
  const paidThrough = subscription?.current_period_end ? new Date(subscription.current_period_end).getTime() > Date.now() : false;
  const plan = subscription?.plan === "pro" && (subscription.status === "active" || paidThrough) ? "pro" : "basic";
  return {
    plan,
    status: subscriptionResult.data?.status ?? "active",
    currentPeriodEnd: subscriptionResult.data?.current_period_end ?? null,
    devices: deviceResult.data ?? [],
    currentDeviceKey: deviceKey,
    usage: { cloudNotes: noteResult.count ?? 0, shareLinks: shareResult.count ?? 0 },
  };
}

export async function removeDevice(deviceId) {
  const { error } = await supabase.from("user_devices").delete().eq("id", deviceId);
  if (error) throw error;
}

export function formatLimit(value) {
  return value == null ? "Unlimited" : String(value);
}
