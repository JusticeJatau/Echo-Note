export const palettes = {
  dark: {
    background: "#090b10",
    surface: "#11141b",
    raised: "#171b24",
    border: "#252a36",
    text: "#f7f8fb",
    muted: "#9299a8",
    primary: "#7c3aed",
    primarySoft: "#25164a",
    success: "#2dd4bf",
    danger: "#fb7185",
    warning: "#fbbf24",
  },
  light: {
    background: "#f7f7fb",
    surface: "#ffffff",
    raised: "#eeeef5",
    border: "#d9dbe5",
    text: "#171923",
    muted: "#697080",
    primary: "#6d28d9",
    primarySoft: "#ede9fe",
    success: "#0f9f8f",
    danger: "#e11d48",
    warning: "#b77900",
  },
};
export const colors = { ...palettes.dark };
export function applyTheme(name) {
  Object.assign(colors, palettes[name] ?? palettes.dark);
}
