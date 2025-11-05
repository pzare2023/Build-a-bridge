// app/ask.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
};

// --- API base (module scope): use .env or temporarily hardcode for testing
const rawUrl = process.env.EXPO_PUBLIC_API_URL as string | undefined;
// const rawUrl = "https://<your-codespace>-3000.app.github.dev"; // <— use this line temporarily if needed
const API_URL = rawUrl ? rawUrl.replace(/\/+$/, "") : "";

// --- initial messages (module scope)
const initialMessages: ChatMsg[] = [
  {
    id: "welcome",
    role: "assistant",
    text: "Hi! Ask me anything. (Connected to server—try a question.)",
    createdAt: Date.now(),
  },
];

export default function AskScreen() {
  const insets = useSafeAreaInsets();

  // state
  const [messages, setMessages] = useState<ChatMsg[]>(initialMessages);
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList<ChatMsg>>(null);

  // tiny connection banner
  const [conn, setConn] = useState<"checking" | "ok" | "fail">("checking");
  useEffect(() => {
    (async () => {
      try {
        if (!API_URL) throw new Error("no API_URL");
        const r = await fetch(`${API_URL}/health`);
        setConn(r.ok ? "ok" : "fail");
      } catch {
        setConn("fail");
      }
    })();
  }, []);

  // autoscroll
  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);
  useEffect(() => { scrollToEnd(); }, [messages, scrollToEnd]);

  // send
  const onSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: ChatMsg = {
      id: `${Date.now()}-user`,
      role: "user",
      text: trimmed,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      if (!API_URL) throw new Error("Missing EXPO_PUBLIC_API_URL (restart Expo after setting .env)");

      const r = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      const raw = await r.text(); // helpful for debugging
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${raw}`);

      const data = JSON.parse(raw);
      const bot: ChatMsg = {
        id: `${Date.now()}-bot`,
        role: "assistant",
        text: data.reply || "Sorry, no reply.",
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, bot]);
    } catch (e: any) {
      const bot: ChatMsg = {
        id: `${Date.now()}-bot`,
        role: "assistant",
        text: `Network/server error: ${e?.message || "unknown"}`,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, bot]);
    }
  }, [input]);

  const renderItem = ({ item }: { item: ChatMsg }) => (
    <View style={[styles.row, item.role === "user" ? styles.right : styles.left]}>
      <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.botBubble]}>
        <Text style={[styles.text, item.role === "user" ? styles.userText : styles.botText]}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ title: "Ask" }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
        keyboardVerticalOffset={80 + insets.top}
      >
        {conn !== "ok" && (
          <View style={{ padding: 8, backgroundColor: "#402", margin: 8, borderRadius: 8 }}>
            <Text style={{ color: "#fff" }}>
              {conn === "checking" ? "Checking server..." : "Cannot reach server. Check EXPO_PUBLIC_API_URL."}
            </Text>
          </View>
        )}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={scrollToEnd}
          onLayout={scrollToEnd}
        />

        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message"
            placeholderTextColor="#9aa0a6"
            style={styles.input}
            multiline
          />
          <TouchableOpacity
            accessibilityLabel="Send message"
            onPress={onSend}
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            disabled={!input.trim()}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6f7f8ff" },
  flex: { flex: 1 },
  listContent: { padding: 12, gap: 8 },
  row: { flexDirection: "row", marginVertical: 2 },
  left: { justifyContent: "flex-start" },
  right: { justifyContent: "flex-end" },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  botBubble: { backgroundColor: "#1f2933", borderTopLeftRadius: 4 },
  userBubble: { backgroundColor: "#9f2828ff", borderTopRightRadius: 4 },
  text: { fontSize: 16, lineHeight: 22 },
  botText: { color: "#e6eef3" },
  userText: { color: "#f7fff9" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#27323a",
    backgroundColor: "#0f141a",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#1a2229",
    color: "#e6eef3",
  },
  sendBtn: {
    height: 44,
    width: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#9f2828ff",
  },
  sendBtnDisabled: { opacity: 0.5 },
});
