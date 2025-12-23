// app/index.tsx  -> FIRST PAGE (Announcer / Passenger)
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useUserRole } from "../context/UserRoleContext";
import { useTheme } from "../context/ThemeContext";

export default function Index() {
  const router = useRouter();
  const { setRole } = useUserRole();
  const { colors } = useTheme();

  const handleAnnouncer = () => {
    setRole("announcer");
    router.replace("/home"); // go to menu screen
  };

  const handlePassenger = () => {
    setRole("passenger");
    router.replace("/home"); // same menu, but Live behaves differently
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Multilingual Transit Companion
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Choose how you want to use the app
      </Text>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        onPress={handleAnnouncer}
      >
        <Text style={[styles.buttonText, { color: colors.textInverse }]}>
          Announcer
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, { backgroundColor: colors.primary }]}
        onPress={handlePassenger}
      >
        <Text style={[styles.buttonText, { color: colors.textInverse }]}>
          Passenger
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "stretch",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
});
