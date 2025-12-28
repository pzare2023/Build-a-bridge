// app/index.tsx  -> FIRST PAGE (Announcer / Passenger)

import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import { useUserRole } from "../context/UserRoleContext";
import { useTheme } from "../context/ThemeContext";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";



export default function Index() {
  const router = useRouter();
  const { setRole } = useUserRole();
  const { colors } = useTheme();
  const resetOnboarding = async () => {
    await AsyncStorage.multiRemove(["user_name", "has_onboarded"]);
    setReady(false);
    router.replace("/onboarding");
  };
  
  const handleAnnouncer = () => {
    setRole("announcer");
    router.replace("/home"); // go to menu screen
  };

  const handlePassenger = () => {
    setRole("passenger");
    router.replace("/home"); // same menu, but Live behaves differently
  };
  const [name, setName] = useState<string | null>(null);

  const [ready, setReady] = useState(false);
 
  
  useEffect(() => {
    (async () => {
      const hasOnboarded = await AsyncStorage.getItem("has_onboarded");
      const storedName = await AsyncStorage.getItem("user_name");
  
      if (hasOnboarded !== "true" || !storedName) {
        router.replace("/onboarding");
        return;
      }
      
  
      setName(storedName);
      setReady(true);
    })();
  }, []);
  
if (!ready) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Multilingual Transit Companion
      </Text>

          { name && (
            <View style={styles.greetingContainer}>
  <Text style={[styles.subtitle, { color: colors.textMuted }]}>
    Hi, {name}
  </Text>

  <Image
    source={require("../assets/images/logo1.png")}
    style={styles.avatar}
    resizeMode="contain"
  />
</View>

    )}

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

      <TouchableOpacity
  style={[
    styles.secondaryButton,
    {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.textMuted,
      marginTop: 16,
    },
  ]}
  onPress={resetOnboarding}
>
  <Text style={[styles.buttonText, { color: colors.textMuted }]}>
    Reset onboarding (testing)
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
  greetingRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8, // works in newer RN; if not, use marginLeft on Image
  },

  greetingContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 150,
    height: 150,
    marginTop: 1,
  },
  
  
});
