import { useState } from "react";
import { Text, TextInput, Pressable, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useTheme } from "../context/ThemeContext";


export default function Onboarding() {
  const [name, setName] = useState("");
  const router = useRouter();
  const { colors } = useTheme();


  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return Alert.alert("Name required", "Please enter your name.");

    await AsyncStorage.setItem("user_name", trimmed);
    await AsyncStorage.setItem("has_onboarded", "true");

    // Replace so user can't go "back" to onboarding
    router.replace("/");

  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 24,
          justifyContent: "center",
          gap: 12
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 24, fontWeight: "600", color: colors.text }}>Welcome 👋</Text>
        <Text style={{ fontSize: 16, color: colors.textMuted }}>What should we call you?</Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={colors.inputPlaceholder}
          autoCapitalize="words"
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.inputField,
            padding: 12,
            borderRadius: 10,
            fontSize: 16,
            color: colors.inputText,
          }}
        />

        <Pressable
          onPress={save}
          style={{
            padding: 14,
            borderRadius: 10,
            alignItems: "center",
            backgroundColor: colors.primary,
          }}
        >
          <Text style={{ color: colors.textInverse, fontSize: 16, fontWeight: "600" }}>
            Continue
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
