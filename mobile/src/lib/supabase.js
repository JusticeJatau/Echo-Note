import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";
import { createClient } from "@supabase/supabase-js";
import { getPreference, setPreference } from "../db/database";

const AUTH_STORAGE_PREFIX = "supabase-auth:";
const storage = {
  getItem: async (key) => {
    const saved = await getPreference(`${AUTH_STORAGE_PREFIX}${key}`, null);
    if (typeof saved === "string") return saved;
    const legacy = await SecureStore.getItemAsync(key).catch(() => null);
    if (legacy) await setPreference(`${AUTH_STORAGE_PREFIX}${key}`, legacy);
    return legacy;
  },
  setItem: async (key, value) => {
    // SQLite has no small-value limit and survives Android process recreation.
    // SecureStore remains a best-effort migration backup for existing installs.
    await setPreference(`${AUTH_STORAGE_PREFIX}${key}`, value);
    await SecureStore.setItemAsync(key, value).catch(() => {});
  },
  removeItem: async (key) => {
    await setPreference(`${AUTH_STORAGE_PREFIX}${key}`, null);
    await SecureStore.deleteItemAsync(key).catch(() => {});
  },
};

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) console.warn("Add the Expo Supabase variables from .env.example.");

export const supabase = createClient(url ?? "https://placeholder.supabase.co", key ?? "placeholder", {
  auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
