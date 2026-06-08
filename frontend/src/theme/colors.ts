// Theme tokens derived from /app/design_guidelines.json
// Constitution-inspired warm gold/amber accent on near-black (dark) / warm paper (light).

export type ColorScheme = "light" | "dark";

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  primary: string;
  primaryLight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  tileArticles: string;
  tileConstitution: string;
  tileDuties: string;
  // TTS highlight
  ttsActiveBg: string;
  ttsActiveText: string;
  ttsReadText: string;
  // misc
  danger: string;
  success: string;
  overlay: string;
  tabBar: string;
}

export const DARK: ThemeColors = {
  background: "#0F0F0F",
  surface: "#1A1A1A",
  surfaceElevated: "#262626",
  primary: "#D9A95C",
  primaryLight: "#E0B36A",
  textPrimary: "#F3F4F6",
  textSecondary: "#A1A1AA",
  textMuted: "#71717A",
  border: "#27272A",
  tileArticles: "#AD7270",
  tileConstitution: "#C0A080",
  tileDuties: "#7B967D",
  ttsActiveBg: "rgba(217, 169, 92, 0.25)",
  ttsActiveText: "#E0B36A",
  ttsReadText: "#6B6B70",
  danger: "#E5675F",
  success: "#7B967D",
  overlay: "rgba(0,0,0,0.6)",
  tabBar: "#0F0F0F",
};

export const LIGHT: ThemeColors = {
  background: "#FDFBF7",
  surface: "#FFFFFF",
  surfaceElevated: "#F4F0EA",
  primary: "#B48645",
  primaryLight: "#D9A95C",
  textPrimary: "#18181B",
  textSecondary: "#52525B",
  textMuted: "#A1A1AA",
  border: "#E4E4E7",
  tileArticles: "#C78D8B",
  tileConstitution: "#D4B799",
  tileDuties: "#94B096",
  ttsActiveBg: "rgba(180, 134, 69, 0.18)",
  ttsActiveText: "#8A5F25",
  ttsReadText: "#B8B4AE",
  danger: "#C2453C",
  success: "#5E7E60",
  overlay: "rgba(0,0,0,0.4)",
  tabBar: "#FFFFFF",
};

export const getColors = (scheme: ColorScheme): ThemeColors =>
  scheme === "light" ? LIGHT : DARK;

export const FONTS = {
  heading: "Lora_700Bold",
  headingSemi: "Lora_600SemiBold",
  body: "Merriweather_400Regular",
  bodyBold: "Merriweather_700Bold",
  ui: "Outfit_500Medium",
  uiRegular: "Outfit_400Regular",
  uiSemi: "Outfit_600SemiBold",
  uiBold: "Outfit_700Bold",
};

export const SPACING = {
  screen: 16,
  card: 16,
  radius: 12,
  radiusLg: 20,
  button: 24,
  pill: 9999,
  tabHeight: 64,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
