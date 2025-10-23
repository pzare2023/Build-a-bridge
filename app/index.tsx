import { Text, View, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";


export default function Index() {
  return (
    <View style={styles.container} accessible accessibilityLabel="Home screen">
      <Text style={styles.title}>Transit Companion</Text>
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
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
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
    backgroundColor: "#0B0F14",
  },
  title: {
    color: "white",
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
    backgroundColor: "#2F86EB",
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
