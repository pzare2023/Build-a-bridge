// app/_layout.tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Alert, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { UserRoleProvider } from "../context/UserRoleContext";
import {
  initializeNotifications,
  onForegroundMessage,
} from "../services/notifications";

function StackNavigator() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
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

      {/* auth screens */}
      <Stack.Screen name="auth/login" options={{ title: "Login" }} />
      <Stack.Screen name="auth/signup" options={{ title: "Demo Accounts" }} />

      {/* admin screens */}
      <Stack.Screen name="admin/dashboard" options={{ title: "Admin Dashboard", headerShown: false }} />

      {/* main app screens */}
      <Stack.Screen name="home" options={{ title: "Home" }} />
      <Stack.Screen name="ask" options={{ title: "Ask Chatbot" }} />
      <Stack.Screen
        name="live"
        options={{
          title: "Live Announcements",
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="updates"
        options={{ title: "Updates Dashboard" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
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
      <StatusBar style="auto" />
      <ThemeProvider>
        <AuthProvider>
          <UserRoleProvider>
            <StackNavigator />
          </UserRoleProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
