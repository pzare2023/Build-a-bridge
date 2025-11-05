// app/_layout.tsx
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack>
        <Stack.Screen name="index" options={{ title: "Home" }} />
        <Stack.Screen name="ask" options={{ title: "Ask Chatbot" }} />
        <Stack.Screen name="live" options={{ title: "Live Announcements" }} />
        <Stack.Screen name="updates" options={{ title: "Updates Dashboard" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
