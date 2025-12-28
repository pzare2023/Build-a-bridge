// app/home.tsx  -> MAIN APP HOME
import { Text, View, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useTheme } from "../context/ThemeContext";

export default function Home() {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      accessible
      accessibilityLabel="Home screen"
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Transit Companion
      </Text>
      <View style={styles.buttons}>
        <AppButton title="Ask the Chatbot" onPress={() => router.push("/ask")} />
        <AppButton title="Updates Dashboard" onPress={() => router.push("/updates")} />
        <AppButton title="Live Announcements" onPress={() => router.push("/live")} />
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
