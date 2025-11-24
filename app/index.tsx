// app/index.tsx  -> FIRST PAGE (Announcer / Passenger)
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useUserRole } from "../context/UserRoleContext";

export default function Index() {
  const router = useRouter();
  const { setRole } = useUserRole();

  const handleAnnouncer = () => {
    setRole("announcer");
    router.replace("/home"); // go to menu screen
  };

  const handlePassenger = () => {
    setRole("passenger");
    router.replace("/home"); // same menu, but Live behaves differently
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Multilingual Transit Companion</Text>
      <Text style={styles.subtitle}>Choose how you want to use the app</Text>

      <TouchableOpacity style={styles.primaryButton} onPress={handleAnnouncer}>
        <Text style={styles.buttonText}>Announcer</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={handlePassenger}>
        <Text style={styles.buttonText}>Passenger</Text>
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
    backgroundColor: "#f8f8f9ff",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#050505ff",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: "#9f2828ff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 16
  },
  secondaryButton: {
    backgroundColor: "#9f2828ff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",

  },
  buttonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#f9fafb",
    textAlign: "center",
  },
});
