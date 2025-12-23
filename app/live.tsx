// app/live.tsx
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useUserRole } from "../context/UserRoleContext";
import {
  Announcement,
  AnnouncementPriority,
  saveAnnouncement,
  subscribeToAnnouncements,
} from "../services/announcements";
import {
  subscribeToTrain,
  unsubscribeFromTrain,
} from "../services/notifications";
import {
  getDriverName,
  getTrainNumber,
  saveDriverName,
  saveTrainNumber,
} from "../utils/storage";
import { getRelativeTime } from "../utils/timeAgo";

const TRANSCRIBE_URL =
  "https://build-a-bridge-backend.vercel.app/api/transcribe";

// Priority configuration
const PRIORITIES: { key: AnnouncementPriority; label: string; color: string; icon: string }[] = [
  { key: "emergency", label: "Emergency", color: "#DC2626", icon: "alert-circle" },
  { key: "service_change", label: "Service", color: "#F59E0B", icon: "swap-horizontal" },
  { key: "info", label: "Info", color: "#3B82F6", icon: "information-circle" },
];

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
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export default function Live() {
  const { role } = useUserRole();
  const { colors, isDark } = useTheme();
  const isPassenger = role === "passenger";

  // Common state
  const [trainNumber, setTrainNumber] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  // Driver state
  const [driverName, setDriverName] = useState("");
  const [priority, setPriority] = useState<AnnouncementPriority>("info");
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Passenger state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const lastAnnouncementRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Load saved train number and driver name
  useEffect(() => {
    const loadSavedData = async () => {
      const savedTrain = await getTrainNumber();
      const savedDriver = await getDriverName();
      if (savedTrain) setTrainNumber(savedTrain);
      if (savedDriver) setDriverName(savedDriver);
    };
    loadSavedData();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Text-to-Speech for new announcements
  useEffect(() => {
    if (isPassenger && autoSpeak && announcements.length > 0) {
      const latestAnnouncement = announcements[0];
      if (
        latestAnnouncement &&
        latestAnnouncement.text !== lastAnnouncementRef.current
      ) {
        lastAnnouncementRef.current = latestAnnouncement.text;
        Speech.speak(latestAnnouncement.text, {
          language: "en",
          rate: 0.9,
        });
      }
    }
  }, [announcements, isPassenger, autoSpeak]);

  // Connect to train (Passenger)
  const connectToTrain = async () => {
    if (!trainNumber.trim()) return;

    await saveTrainNumber(trainNumber.trim());
    await subscribeToTrain(trainNumber.trim());

    // Subscribe to real-time updates
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    unsubscribeRef.current = subscribeToAnnouncements(
      trainNumber.trim(),
      (newAnnouncements) => {
        setAnnouncements(newAnnouncements);
      },
      (error) => {
        console.error("Subscription error:", error);
        setIsConnected(false);
      }
    );

    setIsConnected(true);
  };

  // Disconnect from train (Passenger)
  const disconnectFromTrain = async () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    await unsubscribeFromTrain(trainNumber.trim());
    setIsConnected(false);
    setAnnouncements([]);
    lastAnnouncementRef.current = null;
  };

  // Start session (Driver)
  const startSession = async () => {
    if (!trainNumber.trim() || !driverName.trim()) return;
    await saveTrainNumber(trainNumber.trim());
    await saveDriverName(driverName.trim());
    setIsConnected(true);
  };

  // Start recording (Driver)
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        setTranscript("Microphone permission denied.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );

      setRecording(recording);
      setTranscript("Listening...");
    } catch (err) {
      console.error("Recording start error:", err);
      setTranscript("Could not start recording.");
    }
  };

  // Stop recording and transcribe (Driver)
  const stopRecording = async () => {
    if (!recording) return;

    try {
      setTranscript("Finalizing audio...");

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        setTranscript("No audio URI found.");
        return;
      }

      setIsUploading(true);
      setTranscript("Transcribing...");

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
          body: formData,
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
        setTranscript(`Error: ${data.error || raw}`);
        return;
      }

      if (data.text?.trim()) {
        const transcribedText = data.text.trim();
        setTranscript(transcribedText);

        // Auto-save to Firebase
        setIsSaving(true);
        try {
          await saveAnnouncement(
            trainNumber.trim(),
            transcribedText,
            priority,
            driverName.trim()
          );
          setTranscript(`"${transcribedText}"`);
        } catch (saveError) {
          console.error("Error saving announcement:", saveError);
          setTranscript(`Transcribed but failed to send: "${transcribedText}"`);
        } finally {
          setIsSaving(false);
        }
      } else {
        setTranscript("(No transcription)");
      }
    } catch (err: any) {
      console.error("Stop recording error:", err);
      if (err?.name === "AbortError") {
        setTranscript("Request timed out. Try again.");
      } else {
        setTranscript("Transcription failed.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Get priority config
  const getPriorityConfig = (p: AnnouncementPriority) =>
    PRIORITIES.find((pr) => pr.key === p) || PRIORITIES[2];

  // Render Driver UI
  const renderDriverUI = () => (
    <>
      {!isConnected ? (
        // Setup form
        <View style={styles.setupContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Train Number</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={trainNumber}
            onChangeText={setTrainNumber}
            placeholder="e.g., 5421"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
          />

          <Text style={[styles.label, { color: colors.text }]}>Driver Name</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={driverName}
            onChangeText={setDriverName}
            placeholder="e.g., John Smith"
            placeholderTextColor={colors.textMuted}
          />

          <TouchableOpacity
            style={[
              styles.connectButton,
              { backgroundColor: colors.primary },
              (!trainNumber.trim() || !driverName.trim()) && styles.buttonDisabled,
            ]}
            onPress={startSession}
            disabled={!trainNumber.trim() || !driverName.trim()}
          >
            <Text style={styles.connectButtonText}>Start Session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Recording UI
        <View style={styles.recordingContainer}>
          <View style={styles.sessionInfo}>
            <Text style={[styles.sessionText, { color: colors.textSecondary }]}>
              Train: {trainNumber} | Driver: {driverName}
            </Text>
            <TouchableOpacity onPress={() => setIsConnected(false)}>
              <Text style={[styles.changeLink, { color: colors.primary }]}>
                Change
              </Text>
            </TouchableOpacity>
          </View>

          {/* Priority Selector */}
          <Text style={[styles.label, { color: colors.text }]}>Priority</Text>
          <View style={styles.priorityContainer}>
            {PRIORITIES.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[
                  styles.priorityButton,
                  {
                    backgroundColor:
                      priority === p.key ? p.color : colors.surface,
                    borderColor: p.color,
                  },
                ]}
                onPress={() => setPriority(p.key)}
              >
                <Ionicons
                  name={p.icon as any}
                  size={18}
                  color={priority === p.key ? "#fff" : p.color}
                />
                <Text
                  style={[
                    styles.priorityText,
                    { color: priority === p.key ? "#fff" : p.color },
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Mic Button */}
          <TouchableOpacity
            style={[
              styles.micButton,
              recording ? styles.micActive : styles.micIdle,
            ]}
            onPress={recording ? stopRecording : startRecording}
            disabled={isUploading || isSaving}
          >
            <Ionicons
              name={recording ? "mic" : "mic-outline"}
              size={60}
              color="#fff"
            />
          </TouchableOpacity>

          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            {recording
              ? "Recording... tap to stop"
              : "Tap the mic to record announcement"}
          </Text>

          {/* Transcript Box */}
          <View
            style={[
              styles.transcriptBox,
              {
                borderColor: colors.border,
                backgroundColor: isDark ? colors.surface : colors.background,
              },
            ]}
          >
            <Text style={[styles.transcriptText, { color: colors.text }]}>
              {transcript || "Your transcription will appear here..."}
            </Text>
          </View>

          {(isUploading || isSaving) && (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={{ marginTop: 20 }}
            />
          )}
        </View>
      )}
    </>
  );

  // Render Passenger UI
  const renderPassengerUI = () => (
    <>
      {!isConnected ? (
        // Join form
        <View style={styles.setupContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Train Number</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={trainNumber}
            onChangeText={setTrainNumber}
            placeholder="Enter train number"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
          />

          <TouchableOpacity
            style={[
              styles.connectButton,
              { backgroundColor: colors.primary },
              !trainNumber.trim() && styles.buttonDisabled,
            ]}
            onPress={connectToTrain}
            disabled={!trainNumber.trim()}
          >
            <Text style={styles.connectButtonText}>Join Train</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Announcements View
        <View style={styles.announcementsContainer}>
          {/* Connection Status */}
          <View style={styles.statusBar}>
            <View style={styles.statusLeft}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={[styles.liveText, { color: colors.text }]}>
                  Connected to Train {trainNumber}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={disconnectFromTrain}>
              <Text style={[styles.disconnectLink, { color: colors.primary }]}>
                Leave
              </Text>
            </TouchableOpacity>
          </View>

          {/* Auto-speak toggle */}
          <TouchableOpacity
            style={styles.speakToggle}
            onPress={() => setAutoSpeak(!autoSpeak)}
          >
            <Ionicons
              name={autoSpeak ? "volume-high" : "volume-mute"}
              size={20}
              color={autoSpeak ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.speakToggleText,
                { color: autoSpeak ? colors.primary : colors.textMuted },
              ]}
            >
              Auto-read: {autoSpeak ? "ON" : "OFF"}
            </Text>
          </TouchableOpacity>

          {/* Announcements List */}
          <ScrollView style={styles.announcementsList}>
            {announcements.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="notifications-outline"
                  size={48}
                  color={colors.textMuted}
                />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No announcements yet
                </Text>
                <Text
                  style={[styles.emptySubtext, { color: colors.textMuted }]}
                >
                  Announcements will appear here in real-time
                </Text>
              </View>
            ) : (
              announcements.map((announcement, index) => {
                const priorityConfig = getPriorityConfig(announcement.priority);
                return (
                  <View
                    key={`${announcement.createdAt}-${index}`}
                    style={[
                      styles.announcementCard,
                      {
                        backgroundColor: isDark
                          ? colors.surface
                          : colors.background,
                        borderLeftColor: priorityConfig.color,
                      },
                    ]}
                  >
                    <View style={styles.announcementHeader}>
                      <View
                        style={[
                          styles.priorityBadge,
                          { backgroundColor: priorityConfig.color },
                        ]}
                      >
                        <Ionicons
                          name={priorityConfig.icon as any}
                          size={14}
                          color="#fff"
                        />
                        <Text style={styles.priorityBadgeText}>
                          {priorityConfig.label.toUpperCase()}
                        </Text>
                      </View>
                      <Text
                        style={[styles.timeText, { color: colors.textMuted }]}
                      >
                        {getRelativeTime(announcement.createdAt)}
                      </Text>
                    </View>
                    <Text
                      style={[styles.announcementText, { color: colors.text }]}
                    >
                      {announcement.text}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.heading, { color: colors.text }]}>
        {isPassenger ? "Live Announcements" : "Broadcast Announcement"}
      </Text>

      <Text style={[styles.modeLabel, { color: colors.textSecondary }]}>
        {isPassenger
          ? "Receive real-time announcements from your train"
          : "Record and broadcast announcements to passengers"}
      </Text>

      {isPassenger ? renderPassengerUI() : renderDriverUI()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  modeLabel: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  setupContainer: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 100,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  connectButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
  },
  connectButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  recordingContainer: {
    flex: 1,
    alignItems: "center",
  },
  sessionInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    gap: 10,
  },
  sessionText: {
    fontSize: 14,
  },
  changeLink: {
    fontSize: 14,
    fontWeight: "500",
  },
  priorityContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 30,
  },
  priorityButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 2,
    gap: 6,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: "500",
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    marginBottom: 20,
  },
  micIdle: { backgroundColor: "#1E90FF" },
  micActive: {
    backgroundColor: "#FF3B30",
    shadowColor: "#FF3B30",
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  instructionText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  transcriptBox: {
    width: "100%",
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 24,
  },
  announcementsContainer: {
    flex: 1,
  },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },
  liveText: {
    fontSize: 14,
    fontWeight: "500",
  },
  disconnectLink: {
    fontSize: 14,
    fontWeight: "500",
  },
  speakToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  speakToggleText: {
    fontSize: 14,
  },
  announcementsList: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "500",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  announcementCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  announcementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  priorityBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  timeText: {
    fontSize: 13,
  },
  announcementText: {
    fontSize: 16,
    lineHeight: 24,
  },
});
