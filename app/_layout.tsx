// app/_layout.tsx
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useColorScheme, Alert } from "react-native";
import { UserRoleProvider } from "../context/UserRoleContext";
import { ThemeProvider } from "../context/ThemeContext";
import {
  initializeNotifications,
  onForegroundMessage,
} from "../services/notifications";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Initialize Firebase notifications
  useEffect(() => {
    initializeNotifications();

    // Handle foreground messages
    const unsubscribe = onForegroundMessage((message) => {
      if (message.title || message.body) {
        Alert.alert(
          message.title || "New Announcement",
          message.body || "You have a new announcement"
        );
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ThemeProvider>
        <UserRoleProvider>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: isDark ? "#1a1f26" : "#f8f8f9",
              },
              headerTintColor: isDark ? "#e6eef3" : "#050505",
              headerTitleStyle: {
                fontWeight: "600",
              },
              contentStyle: {
                backgroundColor: isDark ? "#0f141a" : "#f8f8f9",
              },
            }}
          >
            {/* index.tsx = first screen (Announcer / Passenger) */}
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />


            {/* main app screens */}
            <Stack.Screen name="home" options={{ title: "Home" }} />
            <Stack.Screen name="ask" options={{ title: "Ask Chatbot" }} />
            <Stack.Screen name="live" options={{ title: "Live Announcements" }} />
            <Stack.Screen
              name="updates"
              options={{ title: "Updates Dashboard" }}
            />
          </Stack>
        </UserRoleProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
