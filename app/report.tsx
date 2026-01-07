// app/report.tsx - Report submission page
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

const TRANSCRIBE_URL = "https://build-a-bridge-backend.vercel.app/api/transcribe";

function getAudioMimeType(uri: string): { name: string; type: string } {
    const extension = uri.split(".").pop()?.toLowerCase() || "";
    const mimeTypes: Record<string, { name: string; type: string }> = {
        m4a: { name: "audio.m4a", type: "audio/mp4" },
        mp4: { name: "audio.mp4", type: "audio/mp4" },
        caf: { name: "audio.caf", type: "audio/x-caf" },
        wav: { name: "audio.wav", type: "audio/wav" },
        "3gp": { name: "audio.3gp", type: "audio/3gpp" },
        aac: { name: "audio.aac", type: "audio/aac" },
        mp3: { name: "audio.mp3", type: "audio/mpeg" },
    };
    return mimeTypes[extension] || { name: "audio.m4a", type: "audio/mp4" };
}

async function fetchWithTimeout(
    input: RequestInfo,
    init: RequestInit,
    timeoutMs = 60000
) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(input, { ...init, signal: controller.signal as any });
    } finally {
        clearTimeout(id);
    }
}

export default function Report() {
    const { colors } = useTheme();
    const router = useRouter();

    const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [reportText, setReportText] = useState("");
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Start recording
    const startRecording = async () => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permission Denied", "Microphone permission is required to record audio.");
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            setRecording(recording);
        } catch (err) {
            console.error("Recording start error:", err);
            Alert.alert("Error", "Could not start recording. Please try again.");
        }
    };

    // Stop recording and transcribe
    const stopRecording = async () => {
        if (!recording) return;

        try {
            setIsTranscribing(true);
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);

            if (!uri) {
                Alert.alert("Error", "No audio recorded.");
                setIsTranscribing(false);
                return;
            }

            // Transcribe the audio
            const formData = new FormData();
            const { name, type } = getAudioMimeType(uri);

            formData.append("audio", {
                uri,
                name,
                type,
            } as any);

            const res = await fetchWithTimeout(
                TRANSCRIBE_URL,
                {
                    method: "POST",
                    headers: { Accept: "application/json" },
                    body: formData as any,
                },
                60000
            );

            const raw = await res.text();
            let data: any = {};
            try {
                data = JSON.parse(raw);
            } catch {
                data = { error: raw };
            }

            if (!res.ok || data.error) {
                Alert.alert("Transcription Error", data.error || "Failed to transcribe audio.");
                setIsTranscribing(false);
                return;
            }

            if (data.text?.trim()) {
                setReportText(data.text.trim());
            } else {
                Alert.alert("No Speech Detected", "Please try recording again.");
            }
        } catch (err: any) {
            console.error("Transcription error:", err);
            if (err?.name === "AbortError") {
                Alert.alert("Timeout", "Transcription took too long. Please try again.");
            } else {
                Alert.alert("Error", "Failed to transcribe audio.");
            }
        } finally {
            setIsTranscribing(false);
        }
    };

    // Submit report
    const submitReport = async () => {
        if (!reportText.trim()) {
            Alert.alert("Empty Report", "Please record or type your report before submitting.");
            return;
        }

        setIsSubmitting(true);

        // Simulate sending to TTC (you can replace this with actual API call)
        setTimeout(() => {
            setIsSubmitting(false);
            Alert.alert(
                "Report Submitted",
                "Thank you for your report. TTC has been notified.",
                [
                    {
                        text: "OK",
                        onPress: () => {
                            setReportText("");
                            router.back();
                        },
                    },
                ]
            );
        }, 1500);
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>Report an Issue</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Info Card */}
                <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
                    <Ionicons name="information-circle" size={24} color={colors.primary} />
                    <Text style={[styles.infoText, { color: colors.text }]}>
                        Report safety concerns, service issues, or suspicious activity to TTC.
                    </Text>
                </View>

                {/* Input Mode Toggle */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[
                            styles.toggleButton,
                            inputMode === "voice" && { backgroundColor: colors.primary },
                            inputMode !== "voice" && { backgroundColor: colors.surface },
                        ]}
                        onPress={() => setInputMode("voice")}
                    >
                        <Ionicons
                            name="mic"
                            size={20}
                            color={inputMode === "voice" ? "#fff" : colors.text}
                        />
                        <Text
                            style={[
                                styles.toggleText,
                                { color: inputMode === "voice" ? "#fff" : colors.text },
                            ]}
                        >
                            Voice
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.toggleButton,
                            inputMode === "text" && { backgroundColor: colors.primary },
                            inputMode !== "text" && { backgroundColor: colors.surface },
                        ]}
                        onPress={() => setInputMode("text")}
                    >
                        <Ionicons
                            name="create"
                            size={20}
                            color={inputMode === "text" ? "#fff" : colors.text}
                        />
                        <Text
                            style={[
                                styles.toggleText,
                                { color: inputMode === "text" ? "#fff" : colors.text },
                            ]}
                        >
                            Text
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Voice Input Section */}
                {inputMode === "voice" && (
                    <View style={styles.voiceSection}>
                        <TouchableOpacity
                            style={[
                                styles.micButton,
                                recording ? styles.micActive : styles.micIdle,
                            ]}
                            onPress={recording ? stopRecording : startRecording}
                            disabled={isTranscribing}
                        >
                            <Ionicons
                                name={recording ? "mic" : "mic-outline"}
                                size={48}
                                color="#fff"
                            />
                        </TouchableOpacity>

                        <Text style={[styles.instructionText, { color: colors.textMuted }]}>
                            {recording
                                ? "🔴 Recording... tap to stop"
                                : isTranscribing
                                    ? "Transcribing..."
                                    : "Tap microphone to record"}
                        </Text>

                        {isTranscribing && (
                            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 16 }} />
                        )}
                    </View>
                )}

                {/* Report Text Display/Input */}
                <View style={styles.textSection}>
                    <Text style={[styles.label, { color: colors.text }]}>
                        {inputMode === "voice" ? "Transcribed Report" : "Type Your Report"}
                    </Text>
                    <TextInput
                        style={[
                            styles.textInput,
                            {
                                backgroundColor: colors.surface,
                                color: colors.text,
                                borderColor: colors.border,
                            },
                        ]}
                        value={reportText}
                        onChangeText={setReportText}
                        placeholder="Your report will appear here..."
                        placeholderTextColor={colors.textMuted}
                        multiline
                        numberOfLines={8}
                        textAlignVertical="top"
                        editable={inputMode === "text"}
                    />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        { backgroundColor: colors.primary },
                        (!reportText.trim() || isSubmitting) && styles.buttonDisabled,
                    ]}
                    onPress={submitReport}
                    disabled={!reportText.trim() || isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="send" size={20} color="#fff" />
                            <Text style={styles.submitButtonText}>Submit Report to TTC</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Safety Quote */}
                <View style={styles.quoteContainer}>
                    <Text style={[styles.quoteText, { color: colors.textMuted }]}>
                        "If you see something, say something." - TTC
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingTop: 10,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
    },
    infoCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
    toggleContainer: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 24,
    },
    toggleButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 8,
    },
    toggleText: {
        fontSize: 16,
        fontWeight: "600",
    },
    voiceSection: {
        alignItems: "center",
        marginBottom: 10,
        paddingVertical: 15,
    },
    micButton: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    micIdle: {
        backgroundColor: "#3B82F6",
    },
    micActive: {
        backgroundColor: "#EF4444",
    },
    instructionText: {
        fontSize: 14,
        textAlign: "center",
    },
    textSection: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        minHeight: 150,
    },
    submitButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
        marginBottom: 24,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    quoteContainer: {
        alignItems: "center",
        paddingVertical: 16,
    },
    quoteText: {
        fontSize: 14,
        fontStyle: "italic",
        textAlign: "center",
    },
});
