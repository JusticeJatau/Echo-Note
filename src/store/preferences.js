import { create } from "zustand";

const STORAGE_KEY = "echonotes-preferences-v1";
const defaults = {
  theme: "dark",
  editorFontSize: 16,
  spellCheck: true,
  autosaveDelay: 500,
  notifications: false,
  keepDataAfterLogout: false,
  language: "en",
};

function loadPreferences() {
  if (typeof localStorage === "undefined") return defaults;
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") };
  } catch {
    return defaults;
  }
}

export const usePreferences = create((set) => ({
  ...loadPreferences(),
  setPreference: (key, value) => set((state) => {
    const next = { ...state, [key]: value };
    if (typeof localStorage !== "undefined") {
      const saved = Object.fromEntries(Object.keys(defaults).map((name) => [name, next[name]]));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    }
    return { [key]: value };
  }),
}));

export function resolveTheme(theme) {
  if (theme !== "system") return theme;
  if (typeof matchMedia === "undefined") return "dark";
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
