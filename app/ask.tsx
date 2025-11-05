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

const initialMessages: ChatMsg[] = [
  {
    id: "welcome",
    role: "assistant",
    text:
      "Hi! Ask me anything. (AI not wired yet—this is a static starter.)",
    createdAt: Date.now(),
  },
];

export default function AskScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMsg[]>(initialMessages);
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList<ChatMsg>>(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() =>
      listRef.current?.scrollToEnd({ animated: true })
    );
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, scrollToEnd]);

  const onSend = useCallback(() => {
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

    // Mock assistant reply for now
    setTimeout(() => {
      const bot: ChatMsg = {
        id: `${Date.now()}-bot`,
        role: "assistant",
        text: "(Mock) Got it. I’ll answer once AI is connected.",
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, bot]);
    }, 400);
  }, [input]);

  const renderItem = ({ item }: { item: ChatMsg }) => (
    <View
      style={[
        styles.row,
        item.role === "user" ? styles.right : styles.left,
      ]}
    >
      <View
        style={[
          styles.bubble,
          item.role === "user" ? styles.userBubble : styles.botBubble,
        ]}
      >
        <Text
          style={[
            styles.text,
            item.role === "user" ? styles.userText : styles.botText,
          ]}
        >
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
            style={[
              styles.sendBtn,
              !input.trim() && styles.sendBtnDisabled,
            ]}
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
