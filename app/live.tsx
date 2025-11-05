// app/live.tsx
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { useRef, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

// TODO: set this to your serverless endpoint (see step 3)
const TRANSCRIBE_URL =
  Platform.select({
    web: "/api/transcribe", // if you also run web locally with an API route
    default: "https://YOUR-SERVERLESS-URL/transcribe",
  }) as string;

export default function Live() {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const recordingRef = useRef<Audio.Recording | null>(null);

  const start = async () => {
    setTranscript("Listening…");
    setIsRecording(true);

    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY); // .m4a (AAC)
      await rec.startAsync();
      recordingRef.current = rec;
    } catch (e) {
      console.warn(e);
      setTranscript("Could not start recording. Check mic permission.");
      setIsRecording(false);
    }
  };

  const stop = async () => {
    setIsRecording(false);

    try {
      const rec = recordingRef.current;
      if (!rec) return;

      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      recordingRef.current = null;

      if (!uri) {
        setTranscript("No audio captured.");
        return;
      }

      setTranscript("Transcribing…");
      setIsUploading(true);

      // Build multipart/form-data
      const filename = uri.split("/").pop() || `recording-${Date.now()}.m4a`;
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        setTranscript("Recorded file missing.");
        return;
      }

      const formData: any = new FormData();
      formData.append("file", {
        uri,
        name: filename,
        type: "audio/m4a",
      } as any);

      const res = await fetch(TRANSCRIBE_URL, {
        method: "POST",
        body: formData,
        // Let fetch set the boundary; don't add Content-Type manually
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as { text: string };
      setTranscript(data.text || "(empty)");
    } catch (e: any) {
      console.warn(e);
      setTranscript("Transcription failed. Check your API URL.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Live Announcements (EN)</Text>
      <Text style={styles.transcript}>
        {transcript || "Tap the mic and speak…"}
      </Text>

      <TouchableOpacity
        style={[styles.micButton, isRecording && styles.micActive]}
        onPress={isRecording ? stop : start}
        disabled={isUploading}
        accessibilityRole="button"
        accessibilityLabel={isRecording ? "Stop recording" : "Start recording"}
      >
        <Ionicons name={isRecording ? "mic-off" : "mic"} size={40} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff", padding: 16 },
  heading: { fontSize: 22, fontWeight: "600", marginBottom: 20 },
  transcript: { fontSize: 18, paddingHorizontal: 20, textAlign: "center", color: "#333" },
  micButton: {
    marginTop: 24, backgroundColor: "#1E90FF", width: 80, height: 80, borderRadius: 40,
    justifyContent: "center", alignItems: "center", elevation: 4,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  micActive: { backgroundColor: "#FF4D4D" },
});
