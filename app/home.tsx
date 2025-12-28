// app/home.tsx  -> MAIN APP HOME
import { Text, View, Pressable, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useUserRole } from "../context/UserRoleContext";

export default function Home() {
  const { colors } = useTheme();
  const { isAuthenticated, currentUser, logout } = useAuth();
  const { setRole } = useUserRole();

  const handleLogout = async () => {
    await logout();
    setRole(null);
    router.replace("/");
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      accessible
      accessibilityLabel="Home screen"
    >
      {isAuthenticated && (
        <View style={styles.userInfo}>
          <Text style={[styles.welcomeText, { color: colors.text }]}>
            Welcome, {currentUser?.name}
          </Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={[styles.logoutText, { color: colors.primary }]}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={[styles.title, { color: colors.text }]}>
        Transit Companion
      </Text>
      <View style={styles.buttons}>
        <AppButton title="Ask the Chatbot" onPress={() => router.push("/ask")} />
        <AppButton title="Updates Dashboard" onPress={() => router.push("/updates")} />
        <AppButton title="Live Announcements" onPress={() => router.push("/live")} />
        {isAuthenticated && currentUser?.role === "admin" && (
          <AppButton title="Admin Dashboard" onPress={() => router.push("/admin/dashboard")} />
        )}
      </View>
    </View>
  );
}

function AppButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.primary },
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    position: "absolute",
    top: 60,
    right: 20,
    alignItems: "flex-end",
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  logoutButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
  },
  buttons: {
    width: "100%",
    gap: 12,
    maxWidth: 360,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
