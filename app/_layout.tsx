// app/_layout.tsx
import React from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { UserRoleProvider } from "../context/UserRoleContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <UserRoleProvider>
        <Stack>
          {/* index.tsx = first screen (Announcer / Passenger) */}
          <Stack.Screen name="index" options={{ headerShown: false }} />

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
    </SafeAreaProvider>
  );
}
