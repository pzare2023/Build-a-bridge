import React, { MutableRefObject, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useUserRole } from "../context/UserRoleContext";

const TRANSCRIBE_URL =
  "https://speech-server-hrttqx8du-sanyas-projects-75066e62.vercel.app/api/transcribe";

// Helper to safely stop any existing stream
const stopCurrentStream = (streamRef: MutableRefObject<any>) => {
  const stream = streamRef.current as any;
  if (!stream || typeof stream.getTracks !== "function") return;

  try {
    stream.getTracks().forEach((track: any) => {
      try {
        track.stop();
      } catch {
        // ignore
      }
    });
  } catch {
    // ignore
  }

  streamRef.current = null;
};

export default function Live() {
  const { role } = useUserRole();
  const isPassenger = role === "passenger";

  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<any>(null);

  const startRecording = async () => {
    if (isRecording) return;
    setTranscript("Listening…");

    if (Platform.OS !== "web") {
      setTranscript("Recording is only supported in the browser for this build.");
      return;
    }

    const nav: any =
      typeof navigator !== "undefined" ? (navigator as any) : undefined;

    try {
      if (!nav?.mediaDevices?.getUserMedia) {
        setTranscript("This browser doesn't support microphone access.");
        return;
      }

      // Request mic access
      const stream: any = await nav.mediaDevices.getUserMedia({
        audio: true,
      });

      // Clean up any previous stream, then store this one
      stopCurrentStream(streamRef);
      streamRef.current = stream;

      const MediaRecorderClass = (globalThis as any).MediaRecorder;
      if (!MediaRecorderClass) {
        setTranscript("MediaRecorder is not supported in this browser.");
        return;
      }

      const preferred = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/aac",
      ].find((t) => MediaRecorderClass?.isTypeSupported?.(t));

      const recorder = new MediaRecorderClass(
        stream,
        preferred ? { mimeType: preferred } : undefined
      );
      chunksRef.current = [];

      recorder.ondataavailable = (e: any) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        try {
          const type = chunksRef.current[0]?.type || preferred || "audio/webm";
          const blob = new Blob(chunksRef.current, { type });

          // Stop stream tracks
          stopCurrentStream(streamRef);

          // Upload
          setIsUploading(true);
          setTranscript("Transcribing…");

          const form = new FormData();
          const ext = type.includes("mp4")
            ? "m4a"
            : type.includes("aac")
            ? "aac"
            : "webm";
          form.append("file", blob, `recording.${ext}`);

          const fetchFn: any = (globalThis as any).fetch;
          const res = await fetchFn(TRANSCRIBE_URL, {
            method: "POST",
            body: form, // TS is fine because whole options object is any
          });

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
      stopCurrentStream(streamRef);
      mediaRecorderRef.current = null;
      chunksRef.current = [];
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    try {
      mediaRecorderRef.current?.stop();
    } catch {
      // no-op
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        {isPassenger ? "Live Announcements" : "Live Announcements (EN)"}
      </Text>

      <Text style={styles.modeLabel}>
        {isPassenger
          ? "Passenger mode – read-only transcript."
          : "Announcer mode – capture and send new announcements."}
      </Text>

      <Text style={styles.transcript}>
        {transcript || "No announcements yet."}
      </Text>

      {isUploading && <ActivityIndicator style={{ marginTop: 8 }} />}

      {/* Announcer only: show mic controls */}
      {!isPassenger && (
        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.micActive]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isUploading}
        >
          <Text style={{ color: "#fff", fontSize: 18 }}>
            {isRecording ? "Stop" : "Start"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
  },
  heading: { fontSize: 22, fontWeight: "600", marginBottom: 8 },
  modeLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  transcript: {
    fontSize: 18,
    paddingHorizontal: 20,
    textAlign: "center",
    color: "#333",
  },
  micButton: {
    marginTop: 24,
    backgroundColor: "#1E90FF",
    width: 120,
    height: 60,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  micActive: { backgroundColor: "#FF4D4D" },
});
