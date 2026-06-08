import React, { createContext, useContext, useEffect, useState } from "react";
import { storage } from "@/src/utils/storage";
import { ColorScheme, ThemeColors, getColors, FONTS, SPACING } from "./colors";

interface ThemeContextValue {
  scheme: ColorScheme;
  colors: ThemeColors;
  fonts: typeof FONTS;
  spacing: typeof SPACING;
  setScheme: (s: ColorScheme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "pref_theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setSchemeState] = useState<ColorScheme>("dark");

  useEffect(() => {
    (async () => {
      const saved = await storage.getItem<string>(STORAGE_KEY, "dark");
      if (saved === "light" || saved === "dark") setSchemeState(saved);
    })();
  }, []);

  const setScheme = (s: ColorScheme) => {
    setSchemeState(s);
    storage.setItem(STORAGE_KEY, s);
  };
  const toggle = () => setScheme(scheme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider
      value={{ scheme, colors: getColors(scheme), fonts: FONTS, spacing: SPACING, setScheme, toggle }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
