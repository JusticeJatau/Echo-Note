import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";
import { createClient } from "@supabase/supabase-js";

const storage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
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
