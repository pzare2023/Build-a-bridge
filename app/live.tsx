// app/live.tsx
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
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
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useUserRole } from "../context/UserRoleContext";
import { useLanguage, SupportedLanguage } from "../context/LanguageContext";
import {
  Announcement,
  AnnouncementPriority,
  deleteAnnouncement,
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
import { translateText } from "../services/translation";

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
  const { role, setRole } = useUserRole();
  const { colors } = useTheme();
  const { isAuthenticated, currentUser, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const isPassenger = role === "passenger";

  // Language dropdown state
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  // Auth check for announcers
  useEffect(() => {
    if (role === "announcer" && !isAuthenticated) {
      // Redirect to login if announcer is not authenticated
      router.replace("/auth/login");
    }
  }, [role, isAuthenticated, router]);

  // Logout handler
  const handleLogout = async () => {
    await logout();
    setRole(null);
    router.replace("/");
  };

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
  const [showAnnouncementsList, setShowAnnouncementsList] = useState(false);

  // Passenger state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [translatedAnnouncements, setTranslatedAnnouncements] = useState<Announcement[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const lastAnnouncementRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const trainNumberInputRef = useRef<TextInput>(null);

  // Load saved train number and driver name
  useEffect(() => {
    const loadSavedData = async () => {
      const savedTrain = await getTrainNumber();
      const savedDriver = await getDriverName();

      if (savedTrain) setTrainNumber(savedTrain);

      // For announcers, use authenticated user's name as default
      if (role === "announcer" && currentUser) {
        setDriverName(currentUser.name);
      } else if (savedDriver) {
        setDriverName(savedDriver);
      }
    };
    loadSavedData();
  }, [role, currentUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Translate announcements when language changes
  useEffect(() => {
    if (!isPassenger || announcements.length === 0) {
      setTranslatedAnnouncements(announcements);
      return;
    }

    const translateAnnouncements = async () => {
      if (language === "en") {
        // No translation needed for English
        setTranslatedAnnouncements(announcements);
        return;
      }

      setIsTranslating(true);
      try {
        const translated = await Promise.all(
          announcements.map(async (announcement) => ({
            ...announcement,
            text: await translateText(announcement.text, language),
          }))
        );
        setTranslatedAnnouncements(translated);
      } catch (error) {
        console.error("Translation error:", error);
        // Fallback to original announcements
        setTranslatedAnnouncements(announcements);
      } finally {
        setIsTranslating(false);
      }
    };

    translateAnnouncements();
  }, [announcements, language, isPassenger]);

  // Text-to-Speech for new announcements
  useEffect(() => {
    if (isPassenger && autoSpeak && translatedAnnouncements.length > 0) {
      const latestAnnouncement = translatedAnnouncements[0];
      if (
        latestAnnouncement &&
        latestAnnouncement.text !== lastAnnouncementRef.current
      ) {
        lastAnnouncementRef.current = latestAnnouncement.text;

        // Get language code for speech
        const speechLang =
          language === "hi" ? "hi-IN" :
          language === "fa" ? "fa-IR" :
          language === "fr" ? "fr-FR" :
          "en-US";

        Speech.speak(latestAnnouncement.text, {
          language: speechLang,
          rate: 0.9,
        });
      }
    }
  }, [translatedAnnouncements, isPassenger, autoSpeak, language]);

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
        // Filter announcements to only show those less than 1 hour old
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        const filteredAnnouncements = newAnnouncements.filter(
          (announcement) => announcement.createdAt >= oneHourAgo
        );
        setAnnouncements(filteredAnnouncements);
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

    // Subscribe to announcements for this train
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    unsubscribeRef.current = subscribeToAnnouncements(
      trainNumber.trim(),
      (newAnnouncements) => {
        // Show all announcements for announcers (no time filter)
        setAnnouncements(newAnnouncements);
      },
      (error) => {
        console.error("Subscription error:", error);
        setIsConnected(false);
      }
    );

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
            driverName.trim(),
            currentUser?.id,
            currentUser?.email
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

  // Delete announcement handler
  const handleDeleteAnnouncement = async (announcement: Announcement) => {
    Alert.alert(
      "Delete Announcement",
      "Are you sure you want to delete this announcement?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAnnouncement(trainNumber.trim(), announcement);
            } catch (error) {
              console.error("Error deleting announcement:", error);
              Alert.alert("Error", "Failed to delete announcement. Please try again.");
            }
          },
        },
      ]
    );
  };

  // Get priority config
  const getPriorityConfig = (p: AnnouncementPriority) =>
    PRIORITIES.find((pr) => pr.key === p) || PRIORITIES[2];

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Render Driver UI
  const renderDriverUI = () => (
    <>
      {!isConnected ? (
        // Enhanced Setup form
        <KeyboardAvoidingView
          style={styles.setupContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={100}
        >
          <ScrollView
            contentContainerStyle={styles.setupScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.setupCard, { backgroundColor: colors.surface }]}>
              <View style={styles.setupHeader}>
                <View style={[styles.setupIconCircle, { backgroundColor: colors.primary + "20" }]}>
                  <Ionicons name="settings-outline" size={32} color={colors.primary} />
                </View>
                <Text style={[styles.setupTitle, { color: colors.text }]}>
                  Session Setup
                </Text>
                <Text style={[styles.setupSubtitle, { color: colors.textMuted }]}>
                  Configure your broadcast session
                </Text>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="train" size={20} color={colors.primary} />
                  <View style={styles.inputContent}>
                    <Text style={[styles.label, { color: colors.text }]}>Train Number</Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.background,
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
                  </View>
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="person" size={20} color={colors.primary} />
                  <View style={styles.inputContent}>
                    <Text style={[styles.label, { color: colors.text }]}>Announcer Name</Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.background,
                          color: colors.text,
                          borderColor: colors.border,
                        },
                      ]}
                      value={driverName}
                      onChangeText={setDriverName}
                      placeholder="e.g., John Smith"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.connectButton,
                  { backgroundColor: colors.primary },
                  (!trainNumber.trim() || !driverName.trim()) && styles.buttonDisabled,
                ]}
                onPress={startSession}
                disabled={!trainNumber.trim() || !driverName.trim()}
              >
                <Ionicons name="play-circle" size={24} color="#fff" />
                <Text style={styles.connectButtonText}>Start Broadcast Session</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        // Enhanced Recording UI
        <ScrollView
          style={styles.recordingContainer}
          contentContainerStyle={styles.recordingContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Session Info Card */}
          <View style={[styles.sessionCard, { backgroundColor: colors.surface }]}>
            <View style={styles.sessionHeader}>
              <View style={styles.sessionBadge}>
                <View style={styles.liveDot} />
                <Text style={[styles.liveText, { color: colors.text }]}>LIVE</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsConnected(false)}
                style={[styles.changeButton, { backgroundColor: colors.background }]}
              >
                <Ionicons name="settings-outline" size={16} color={colors.primary} />
                <Text style={[styles.changeLink, { color: colors.primary }]}>
                  Change
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sessionDetails}>
              <View style={styles.sessionDetailItem}>
                <Ionicons name="train" size={18} color={colors.primary} />
                <Text style={[styles.sessionDetailText, { color: colors.text }]}>
                  Train {trainNumber}
                </Text>
              </View>
              <View style={styles.sessionDetailItem}>
                <Ionicons name="person" size={18} color={colors.primary} />
                <Text style={[styles.sessionDetailText, { color: colors.text }]}>
                  {driverName}
                </Text>
              </View>
            </View>
          </View>

          {/* Priority Selector */}
          <View style={styles.prioritySection}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>
              Select Priority Level
            </Text>
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
                    size={20}
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
          </View>

          {/* Mic Button */}
          <View style={styles.micSection}>
            <TouchableOpacity
              style={[
                styles.micButton,
                recording ? styles.micActive : styles.micIdle,
              ]}
              onPress={recording ? stopRecording : startRecording}
              disabled={isUploading || isSaving}
            >
              <View style={styles.micRing}>
                <Ionicons
                  name={recording ? "mic" : "mic-outline"}
                  size={64}
                  color="#fff"
                />
              </View>
            </TouchableOpacity>

            <Text style={[styles.instructionText, { color: colors.textMuted }]}>
              {recording
                ? "🔴 Recording... tap to stop"
                : "Tap microphone to start recording"}
            </Text>
          </View>

          {/* Transcript Box */}
          <View
            style={[
              styles.transcriptBox,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            {transcript ? (
              <>
                <View style={styles.transcriptHeader}>
                  <Ionicons name="document-text" size={20} color={colors.primary} />
                  <Text style={[styles.transcriptLabel, { color: colors.text }]}>
                    Transcription
                  </Text>
                </View>
                <Text style={[styles.transcriptText, { color: colors.text }]}>
                  {transcript}
                </Text>
              </>
            ) : (
              <View style={styles.transcriptPlaceholder}>
                <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.transcriptPlaceholderText, { color: colors.textMuted }]}>
                  Your transcription will appear here...
                </Text>
              </View>
            )}
          </View>

          {(isUploading || isSaving) && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.text }]}>
                {isUploading ? "Transcribing..." : "Sending announcement..."}
              </Text>
            </View>
          )}

          {/* Announcements List Section */}
          <View style={styles.announcementsListSection}>
            <View style={styles.announcementsListHeader}>
              <View style={styles.announcementsHeaderLeft}>
                <Ionicons name="list" size={20} color={colors.primary} />
                <Text style={[styles.sectionLabel, { color: colors.text }]}>
                  Your Announcements ({announcements.length})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAnnouncementsList(!showAnnouncementsList)}
                style={styles.toggleButton}
              >
                <Ionicons
                  name={showAnnouncementsList ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>

            {showAnnouncementsList && (
              <View style={styles.announcementsListContent}>
                {announcements.length === 0 ? (
                  <View style={styles.emptyAnnouncementsList}>
                    <Ionicons name="megaphone-outline" size={48} color={colors.textMuted} />
                    <Text style={[styles.emptyAnnouncementsText, { color: colors.textMuted }]}>
                      No announcements yet
                    </Text>
                  </View>
                ) : (
                  announcements.map((announcement, index) => {
                    const priorityConfig = getPriorityConfig(announcement.priority);
                    return (
                      <View
                        key={`${announcement.createdAt}-${index}`}
                        style={[
                          styles.announcementItem,
                          {
                            backgroundColor: colors.surface,
                            borderLeftColor: priorityConfig.color,
                          },
                        ]}
                      >
                        <View style={styles.announcementItemHeader}>
                          <View
                            style={[
                              styles.priorityBadgeSmall,
                              {
                                backgroundColor: priorityConfig.color + "20",
                                borderColor: priorityConfig.color,
                              },
                            ]}
                          >
                            <Ionicons
                              name={priorityConfig.icon as any}
                              size={12}
                              color={priorityConfig.color}
                            />
                            <Text
                              style={[
                                styles.priorityBadgeSmallText,
                                { color: priorityConfig.color },
                              ]}
                            >
                              {priorityConfig.label}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleDeleteAnnouncement(announcement)}
                            style={styles.deleteButton}
                          >
                            <Ionicons name="trash-outline" size={18} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                        <Text style={[styles.announcementItemText, { color: colors.text }]}>
                          {announcement.text}
                        </Text>
                        <View style={styles.announcementItemFooter}>
                          <View style={styles.announcementItemMeta}>
                            <Ionicons name="person-outline" size={12} color={colors.textMuted} />
                            <Text style={[styles.metaText, { color: colors.textMuted }]}>
                              {announcement.driverName}
                            </Text>
                          </View>
                          <View style={styles.announcementItemMeta}>
                            <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                            <Text style={[styles.metaText, { color: colors.textMuted }]}>
                              {formatDate(announcement.createdAt)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </>
  );

  // Render Passenger UI
  const renderPassengerUI = () => (
    <>
      {!isConnected ? (
        // Enhanced Join form
        <KeyboardAvoidingView
          style={styles.setupContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={100}
        >
          <ScrollView
            contentContainerStyle={styles.setupScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.setupCard, { backgroundColor: colors.surface }]}>
              <View style={styles.setupHeader}>
                <View style={[styles.setupIconCircle, { backgroundColor: colors.primary + "20" }]}>
                  <Ionicons name="train-outline" size={36} color={colors.primary} />
                </View>
                <Text style={[styles.setupTitle, { color: colors.text }]}>
                  Join Your Train
                </Text>
                <Text style={[styles.setupSubtitle, { color: colors.textMuted }]}>
                  Enter your train number to receive live announcements
                </Text>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="train" size={20} color={colors.primary} />
                  <View style={styles.inputContent}>
                    <Text style={[styles.label, { color: colors.text }]}>Train Number</Text>
                    <TextInput
                      ref={trainNumberInputRef}
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.inputField,
                          color: colors.inputText,
                          borderColor: colors.border,
                        },
                      ]}
                      value={trainNumber}
                      onChangeText={setTrainNumber}
                      placeholder="e.g., 5421"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.connectButton,
                  { backgroundColor: colors.primary },
                  !trainNumber.trim() && styles.buttonDisabled,
                ]}
                onPress={connectToTrain}
                disabled={!trainNumber.trim()}
              >
                <Ionicons name="enter-outline" size={24} color="#fff" />
                <Text style={styles.connectButtonText}>Connect to Train</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        // Enhanced Announcements View
        <View style={styles.announcementsContainer}>
          {/* Enhanced Connection Status Card */}
          <View style={[styles.statusCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statusCardContent}>
              <View style={styles.statusLeft}>
                <View style={[styles.liveIndicator, { backgroundColor: "rgba(34, 197, 94, 0.15)" }]}>
                  <View style={styles.liveDot} />
                  <Text style={[styles.liveText, { color: colors.text }]}>
                    Train {trainNumber}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={disconnectFromTrain}
                style={[styles.leaveButton, { backgroundColor: colors.background }]}
              >
                <Ionicons name="exit-outline" size={16} color={colors.primary} />
                <Text style={[styles.disconnectLink, { color: colors.primary }]}>
                  Leave
                </Text>
              </TouchableOpacity>
            </View>

            {/* Enhanced Auto-speak toggle */}
            <TouchableOpacity
              style={[
                styles.speakToggle,
                {
                  backgroundColor: autoSpeak
                    ? colors.primary + "15"
                    : colors.background,
                  borderColor: autoSpeak ? colors.primary : colors.border,
                }
              ]}
              onPress={() => setAutoSpeak(!autoSpeak)}
            >
              <View style={styles.speakToggleLeft}>
                <Ionicons
                  name={autoSpeak ? "volume-high" : "volume-mute"}
                  size={20}
                  color={autoSpeak ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.speakToggleText,
                    { color: autoSpeak ? colors.primary : colors.text },
                  ]}
                >
                  Auto-read announcements
                </Text>
              </View>
              <View style={[
                styles.toggleSwitch,
                { backgroundColor: autoSpeak ? colors.primary : colors.textMuted }
              ]}>
                <Text style={styles.toggleSwitchText}>
                  {autoSpeak ? "ON" : "OFF"}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Language Selector Dropdown */}
            <View style={styles.languageSelector}>
              <View style={styles.languageSelectorHeader}>
                <Ionicons name="language" size={20} color={colors.textMuted} />
                <Text style={[styles.languageSelectorLabel, { color: colors.textMuted }]}>
                  Language
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.languageDropdownButton,
                  {
                    backgroundColor: colors.inputField,
                    borderColor: showLanguageDropdown ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
              >
                <Text style={[styles.languageDropdownText, { color: colors.text }]}>
                  {language === "en" ? "English" :
                   language === "hi" ? "हिन्दी (Hindi)" :
                   language === "fa" ? "فارسی (Farsi)" :
                   "Français (French)"}
                </Text>
                <Ionicons
                  name={showLanguageDropdown ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              {showLanguageDropdown && (
                <View style={[styles.languageDropdownMenu, {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                }]}>
                  {(["en", "hi", "fa", "fr"] as const).map((lang) => (
                    <TouchableOpacity
                      key={lang}
                      style={[
                        styles.languageDropdownItem,
                        language === lang && { backgroundColor: colors.primary + "10" },
                      ]}
                      onPress={() => {
                        setLanguage(lang);
                        setShowLanguageDropdown(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.languageDropdownItemText,
                          { color: language === lang ? colors.primary : colors.text }
                        ]}
                      >
                        {lang === "en" ? "English" :
                         lang === "hi" ? "हिन्दी (Hindi)" :
                         lang === "fa" ? "فارسی (Farsi)" :
                         "Français (French)"}
                      </Text>
                      {language === lang && (
                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Announcements List */}
          <ScrollView
            style={styles.announcementsList}
            contentContainerStyle={styles.announcementsListContent}
            showsVerticalScrollIndicator={true}
          >
            {translatedAnnouncements.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
                  <Ionicons
                    name="notifications-outline"
                    size={48}
                    color={colors.textMuted}
                  />
                </View>
                <Text style={[styles.emptyText, { color: colors.text }]}>
                  No announcements yet
                </Text>
                <Text
                  style={[styles.emptySubtext, { color: colors.textMuted }]}
                >
                  Announcements will appear here in real-time
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.announcementsHeader}>
                  <Ionicons name="megaphone" size={18} color={colors.primary} />
                  <Text style={[styles.announcementsHeaderText, { color: colors.text }]}>
                    Recent Announcements ({translatedAnnouncements.length})
                  </Text>
                  {isTranslating && (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
                  )}
                </View>
                {translatedAnnouncements.map((announcement, index) => {
                  const priorityConfig = getPriorityConfig(announcement.priority);
                  return (
                    <View
                      key={`${announcement.createdAt}-${index}`}
                      style={[
                        styles.announcementCard,
                        {
                          backgroundColor: colors.surface,
                          borderLeftColor: priorityConfig.color,
                        },
                      ]}
                    >
                      <View style={styles.announcementHeader}>
                        <View
                          style={[
                            styles.priorityBadge,
                            {
                              backgroundColor: priorityConfig.color + "20",
                              borderColor: priorityConfig.color,
                            },
                          ]}
                        >
                          <Ionicons
                            name={priorityConfig.icon as any}
                            size={14}
                            color={priorityConfig.color}
                          />
                          <Text style={[styles.priorityBadgeText, { color: priorityConfig.color }]}>
                            {priorityConfig.label.toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.timeContainer}>
                          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                          <Text
                            style={[styles.timeText, { color: colors.textMuted }]}
                          >
                            {getRelativeTime(announcement.createdAt)}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[styles.announcementText, { color: colors.text }]}
                      >
                        {announcement.text}
                      </Text>
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
        </View>
      )}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Enhanced Header with gradient-like effect */}
      <View style={[styles.headerContainer, { backgroundColor: colors.primary }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <Ionicons
              name={isPassenger ? "notifications" : "megaphone"}
              size={28}
              color="#fff"
            />
            <View style={styles.headerTextWrapper}>
              <Text style={styles.heading}>
                {isPassenger ? "Live Announcements" : "Broadcast Announcements"}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isPassenger
                  ? "Real-time updates from your train"
                  : "Send announcements to passengers"}
              </Text>
            </View>
          </View>
          {!isPassenger && isAuthenticated && (
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isPassenger ? renderPassengerUI() : renderDriverUI()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerTextWrapper: {
    flex: 1,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#fff",
    opacity: 0.9,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  setupContainer: {
    flex: 1,
  },
  setupScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  setupCard: {
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  setupHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  setupIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 6,
  },
  setupSubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  formGroup: {
    gap: 20,
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  inputContent: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  connectButton: {
    flexDirection: "row",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  connectButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  recordingContainer: {
    flex: 1,
  },
  recordingContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  sessionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sessionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  liveText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  changeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  changeLink: {
    fontSize: 13,
    fontWeight: "600",
  },
  sessionDetails: {
    gap: 10,
  },
  sessionDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sessionDetailText: {
    fontSize: 15,
    fontWeight: "500",
  },
  prioritySection: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },
  priorityContainer: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  priorityButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 6,
    minWidth: 100,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: "700",
  },
  micSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  micButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    marginBottom: 16,
  },
  micRing: {
    width: "100%",
    height: "100%",
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
  },
  micIdle: {
    backgroundColor: "#1E90FF",
  },
  micActive: {
    backgroundColor: "#FF3B30",
    shadowColor: "#FF3B30",
    shadowOpacity: 0.5,
    shadowRadius: 24,
  },
  instructionText: {
    fontSize: 15,
    textAlign: "center",
    fontWeight: "500",
  },
  transcriptBox: {
    minHeight: 140,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  transcriptHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.2)",
  },
  transcriptLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 24,
  },
  transcriptPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
    gap: 12,
  },
  transcriptPlaceholderText: {
    fontSize: 14,
    textAlign: "center",
  },
  loadingOverlay: {
    marginTop: 20,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: "500",
  },
  announcementsContainer: {
    flex: 1,
  },
  statusCard: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusCardContent: {
    marginBottom: 12,
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },
  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  disconnectLink: {
    fontSize: 14,
    fontWeight: "600",
  },
  speakToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  speakToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  speakToggleText: {
    fontSize: 15,
    fontWeight: "500",
  },
  toggleSwitch: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    minWidth: 45,
    alignItems: "center",
  },
  toggleSwitchText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  announcementsList: {
    flex: 1,
  },
  announcementsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  announcementsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.15)",
  },
  announcementsHeaderText: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
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
    borderWidth: 1,
    gap: 4,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 13,
  },
  announcementText: {
    fontSize: 16,
    lineHeight: 24,
  },
  announcementFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.1)",
  },
  announcerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  announcerName: {
    fontSize: 13,
    fontWeight: "500",
  },
  announcementsListSection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
    paddingTop: 16,
  },
  announcementsListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  announcementsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleButton: {
    padding: 4,
  },
  emptyAnnouncementsList: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyAnnouncementsText: {
    fontSize: 15,
    textAlign: "center",
  },
  announcementItem: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  announcementItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  priorityBadgeSmall: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  priorityBadgeSmallText: {
    fontSize: 10,
    fontWeight: "700",
  },
  deleteButton: {
    padding: 4,
  },
  announcementItemText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  announcementItemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  announcementItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  languageSelector: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
  },
  languageSelectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  languageSelectorLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  languageDropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  languageDropdownText: {
    fontSize: 15,
    fontWeight: "500",
  },
  languageDropdownMenu: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  languageDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.1)",
  },
  languageDropdownItemText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
