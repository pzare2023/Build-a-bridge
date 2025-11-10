import { useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const TRANSCRIBE_URL =
  "https://speech-server-hrttqx8du-sanyas-projects-75066e62.vercel.app/api/transcribe";

export default function Live() {
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    if (isRecording) return;
    setTranscript("Listening…");

    if (Platform.OS !== "web") {
      setTranscript("Recording is only supported in the browser for this build.");
      return;
    }

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setTranscript("This browser doesn't support microphone access.");
        return;
      }
      // Request mic access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pick a mimeType the browser supports (iOS Safari often uses audio/mp4)
      const preferred = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/aac",
      ].find((t) => (window as any).MediaRecorder?.isTypeSupported?.(t));

      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        try {
          // Use the type of the first chunk if available (best for Safari)
          const type = chunksRef.current[0]?.type || preferred || "audio/webm";
          const blob = new Blob(chunksRef.current, { type });

          // Clean up stream
          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = null;

          // Upload
          setIsUploading(true);
          setTranscript("Transcribing…");

          const form = new FormData();
          // Use a filename extension that matches the blob type to help backends
          const ext = type.includes("mp4") ? "m4a" : type.includes("aac") ? "aac" : "webm";
          form.append("file", blob, `recording.${ext}`);

          const res = await fetch(TRANSCRIBE_URL, { method: "POST", body: form });
          if (!res.ok) throw new Error(await res.text());
          const data = (await res.json()) as { text?: string };
          setTranscript(data.text || "(empty)");
        } catch (err) {
          console.error(err);
          setTranscript("Transcription failed. Check your backend URL and logs.");
        } finally {
          setIsUploading(false);
          chunksRef.current = [];
          mediaRecorderRef.current = null;
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setTranscript("Could not start recording. Check mic permissions.");
      // clean up on failure
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;
      chunksRef.current = [];
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    // Safely stop
    try {
      mediaRecorderRef.current?.stop();
    } catch {
      // no-op
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Live Announcements (EN)</Text>
      <Text style={styles.transcript}>{transcript || "Tap the mic and speak…"}</Text>

      {isUploading && <ActivityIndicator style={{ marginTop: 8 }} />}

      <TouchableOpacity
        style={[styles.micButton, isRecording && styles.micActive]}
        onPress={isRecording ? stopRecording : startRecording}
        disabled={isUploading}
      >
        <Text style={{ color: "#fff", fontSize: 18 }}>{isRecording ? "Stop" : "Start"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16, backgroundColor: "#fff" },
  heading: { fontSize: 22, fontWeight: "600", marginBottom: 20 },
  transcript: { fontSize: 18, paddingHorizontal: 20, textAlign: "center", color: "#333" },
  micButton: { marginTop: 24, backgroundColor: "#1E90FF", width: 120, height: 60, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  micActive: { backgroundColor: "#FF4D4D" },
});
