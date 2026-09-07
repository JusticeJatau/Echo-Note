import { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { usePreferences } from "../store/preferences";
import { colors as sharedColors, palettes } from "../theme";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const preference = usePreferences((state) => state.theme);
  const systemTheme = useColorScheme();
  const mode = preference === "system" ? (systemTheme ?? "dark") : preference;
  const value = useMemo(() => {
    const colors = palettes[mode] ?? palettes.dark;
    Object.assign(sharedColors, colors);
    const base = mode === "dark" ? DarkTheme : DefaultTheme;
    return {
      mode,
      preference,
      colors,
      statusBarStyle: mode === "dark" ? "light" : "dark",
      navigationTheme: {
        ...base,
        colors: {
          ...base.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          border: colors.border,
          text: colors.text,
        },
      },
    };
  }, [mode, preference]);
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useAppTheme must be used inside ThemeProvider");
  return value;
}
