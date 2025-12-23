// context/ThemeContext.tsx
import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";

// Define color palette for light and dark modes
const colors = {
  light: {
    // Backgrounds
    background: "#f8f8f9",
    backgroundSecondary: "#fbfbfb",
    surface: "#ffffff",
    inputBackground: "#f0f0f0",

    // Text
    text: "#050505",
    textSecondary: "#555555",
    textMuted: "#9ca3af",
    textInverse: "#f9fafb",

    // Primary (brand red)
    primary: "#9f2828",
    primaryPressed: "#8e2a2a",

    // Chat bubbles
    botBubble: "#1f2933",
    botText: "#e6eef3",
    userBubble: "#9f2828",
    userText: "#f7fff9",

    // Input bar (chat)
    inputBar: "#f0f0f0",
    inputBarBorder: "#d0d0d0",
    inputField: "#ffffff",
    inputText: "#050505",
    inputPlaceholder: "#9aa0a6",

    // Alerts
    alertActive: "#ffcccc",
    alertUpcoming: "#fff3cc",
    alertInactive: "#f0f0f0",
    alertText: "#282828",

    // Status
    statusBar: "dark",
    chevron: "#282828",

    // Misc
    border: "#cccccc",
    shadow: "#000000",
  },
  dark: {
    // Backgrounds
    background: "#0f141a",
    backgroundSecondary: "#1a1f26",
    surface: "#1f2933",
    inputBackground: "#1a2229",

    // Text
    text: "#e6eef3",
    textSecondary: "#a0aab4",
    textMuted: "#6b7580",
    textInverse: "#050505",

    // Primary (brand red - slightly lighter for dark mode)
    primary: "#b33030",
    primaryPressed: "#9f2828",

    // Chat bubbles
    botBubble: "#2d3740",
    botText: "#e6eef3",
    userBubble: "#9f2828",
    userText: "#f7fff9",

    // Input bar (chat)
    inputBar: "#0f141a",
    inputBarBorder: "#27323a",
    inputField: "#1a2229",
    inputText: "#e6eef3",
    inputPlaceholder: "#6b7580",

    // Alerts
    alertActive: "#4a2020",
    alertUpcoming: "#4a4020",
    alertInactive: "#2d3740",
    alertText: "#e6eef3",

    // Status
    statusBar: "light",
    chevron: "#e6eef3",

    // Misc
    border: "#27323a",
    shadow: "#000000",
  },
};

type ThemeColors = typeof colors.light;
type ThemeMode = "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const mode: ThemeMode = colorScheme === "dark" ? "dark" : "light";

  const value = useMemo(
    () => ({
      mode,
      colors: colors[mode],
      isDark: mode === "dark",
    }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
