// app/announcer/dashboard.tsx
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { TTC_LINES, getTTCLineColor, type TTCLine } from "../../constants/ttcLines";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
    Announcement,
    AnnouncementPriority,
    deleteAnnouncement,
    saveAnnouncement,
    subscribeToAnnouncements,
} from "../../services/announcements";

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

export default function AnnouncerDashboard() {
    const router = useRouter();
    const { logout, currentUser, isAuthenticated } = useAuth();
    const { colors } = useTheme();

    // Auth check
    useEffect(() => {
        if (!isAuthenticated || !currentUser) {
            router.replace("/auth/login");
        }
    }, [isAuthenticated, currentUser, router]);

    // State
    const [selectedLine, setSelectedLine] = useState<TTCLine | null>(null);
    const [showLineSelector, setShowLineSelector] = useState(false);
    const [priority, setPriority] = useState<AnnouncementPriority>("info");
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [transcript, setTranscript] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [showAnnouncementsList, setShowAnnouncementsList] = useState(true);
    const unsubscribeRef = useRef<(() => void) | null>(null);

    // Get assigned lines from current user
    const assignedLines = (currentUser as any)?.assignedLines || [];
    const hasAssignedLines = assignedLines.length > 0;

    // Subscribe to announcements for selected line
    useEffect(() => {
        if (!selectedLine) return;

        // Unsubscribe from previous line
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
        }

        // Subscribe to new line (using line as trainNumber for now)
        unsubscribeRef.current = subscribeToAnnouncements(
            selectedLine,
            (newAnnouncements) => {
                // Filter to only show announcements for this line
                const lineAnnouncements = newAnnouncements.filter(
                    (a) => a.lineNumber === selectedLine
                );
                setAnnouncements(lineAnnouncements);
            },
            (error) => {
                console.error("Subscription error:", error);
            }
        );

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
        };
    }, [selectedLine]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
        };
    }, []);

    // Logout handler
    const handleLogout = async () => {
        await logout();
        router.replace("/");
    };

    // Start recording
    const startRecording = async () => {
        if (!selectedLine) {
            Alert.alert("Select Line", "Please select a TTC line first");
            return;
        }

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

    // Stop recording and transcribe
    const stopRecording = async () => {
        if (!recording || !selectedLine) return;

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

                // Auto-save to Firebase with line number
                setIsSaving(true);
                try {
                    await saveAnnouncement(
                        selectedLine, // Use line as trainNumber
                        transcribedText,
                        priority,
                        currentUser?.name || "Announcer",
                        currentUser?.id,
                        currentUser?.email,
                        selectedLine // Add line number
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
        if (!selectedLine) return;

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
                            await deleteAnnouncement(selectedLine, announcement);
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

    // Get filtered assigned lines
    const availableLines = TTC_LINES.filter((line) =>
        assignedLines.includes(line.id)
    );

    if (!currentUser) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.primary }]}>
                <View style={styles.headerContent}>
                    <View style={styles.headerLeft}>
                        <Ionicons name="megaphone" size={32} color="#fff" />
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Announcer Dashboard</Text>
                            <Text style={styles.headerSubtitle}>{currentUser.name}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                        <Ionicons name="log-out-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={true}
            >
                {/* Line Selector Card */}
                <View style={[styles.card, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>
                        Select TTC Line
                    </Text>
                    {!hasAssignedLines ? (
                        <View style={styles.noLinesContainer}>
                            <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
                            <Text style={[styles.noLinesText, { color: colors.textMuted }]}>
                                No lines assigned
                            </Text>
                            <Text style={[styles.noLinesSubtext, { color: colors.textMuted }]}>
                                Contact admin to assign TTC lines to your account
                            </Text>
                        </View>
                    ) : (
                        <>
                            <TouchableOpacity
                                style={[
                                    styles.lineSelector,
                                    {
                                        backgroundColor: selectedLine
                                            ? getTTCLineColor(selectedLine) + "20"
                                            : colors.background,
                                        borderColor: selectedLine
                                            ? getTTCLineColor(selectedLine)
                                            : colors.border,
                                    },
                                ]}
                                onPress={() => setShowLineSelector(true)}
                            >
                                {selectedLine ? (
                                    <View style={styles.selectedLineContent}>
                                        <View
                                            style={[
                                                styles.lineDot,
                                                { backgroundColor: getTTCLineColor(selectedLine) },
                                            ]}
                                        />
                                        <Text style={[styles.selectedLineText, { color: colors.text }]}>
                                            {TTC_LINES.find((l) => l.id === selectedLine)?.fullName}
                                        </Text>
                                    </View>
                                ) : (
                                    <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
                                        Tap to select a line
                                    </Text>
                                )}
                                <Ionicons name="chevron-down" size={20} color={colors.text} />
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {selectedLine && (
                    <>
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

                        {/* Announcements List */}
                        <View style={styles.announcementsListSection}>
                            <View style={styles.announcementsListHeader}>
                                <View style={styles.announcementsHeaderLeft}>
                                    <Ionicons name="list" size={20} color={colors.primary} />
                                    <Text style={[styles.sectionLabel, { color: colors.text }]}>
                                        Line {selectedLine} Announcements ({announcements.length})
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
                    </>
                )}
            </ScrollView>

            {/* Line Selector Modal */}
            <Modal
                visible={showLineSelector}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowLineSelector(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>
                                Select TTC Line
                            </Text>
                            <TouchableOpacity onPress={() => setShowLineSelector(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={availableLines}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.lineOption,
                                        {
                                            backgroundColor:
                                                selectedLine === item.id ? item.color + "20" : colors.background,
                                            borderColor: item.color,
                                        },
                                    ]}
                                    onPress={() => {
                                        setSelectedLine(item.id);
                                        setShowLineSelector(false);
                                    }}
                                >
                                    <View style={[styles.lineDot, { backgroundColor: item.color }]} />
                                    <Text style={[styles.lineOptionText, { color: colors.text }]}>
                                        {item.fullName}
                                    </Text>
                                    {selectedLine === item.id && (
                                        <Ionicons name="checkmark-circle" size={24} color={item.color} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: Platform.OS === "ios" ? 60 : 40,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    headerTextContainer: {
        gap: 2,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#fff",
    },
    headerSubtitle: {
        fontSize: 14,
        color: "#fff",
        opacity: 0.9,
    },
    logoutButton: {
        padding: 8,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
        gap: 20,
    },
    card: {
        borderRadius: 16,
        padding: 20,
        gap: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "600",
    },
    noLinesContainer: {
        alignItems: "center",
        paddingVertical: 30,
        gap: 12,
    },
    noLinesText: {
        fontSize: 16,
        fontWeight: "600",
    },
    noLinesSubtext: {
        fontSize: 14,
        textAlign: "center",
    },
    lineSelector: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
    },
    selectedLineContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    lineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    selectedLineText: {
        fontSize: 16,
        fontWeight: "600",
    },
    placeholderText: {
        fontSize: 16,
    },
    prioritySection: {
        gap: 12,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: "600",
    },
    priorityContainer: {
        flexDirection: "row",
        gap: 12,
    },
    priorityButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 14,
        borderRadius: 12,
        borderWidth: 2,
    },
    priorityText: {
        fontSize: 14,
        fontWeight: "600",
    },
    micSection: {
        alignItems: "center",
        gap: 16,
        paddingVertical: 20,
    },
    micButton: {
        width: 140,
        height: 140,
        borderRadius: 70,
        alignItems: "center",
        justifyContent: "center",
    },
    micIdle: {
        backgroundColor: "#3B82F6",
    },
    micActive: {
        backgroundColor: "#DC2626",
    },
    micRing: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    instructionText: {
        fontSize: 14,
        textAlign: "center",
    },
    transcriptBox: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
        minHeight: 120,
    },
    transcriptHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    transcriptLabel: {
        fontSize: 14,
        fontWeight: "600",
    },
    transcriptText: {
        fontSize: 16,
        lineHeight: 24,
    },
    transcriptPlaceholder: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 20,
        gap: 12,
    },
    transcriptPlaceholderText: {
        fontSize: 14,
    },
    loadingOverlay: {
        alignItems: "center",
        gap: 12,
        paddingVertical: 20,
    },
    loadingText: {
        fontSize: 14,
    },
    announcementsListSection: {
        gap: 12,
    },
    announcementsListHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    announcementsHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    toggleButton: {
        padding: 4,
    },
    announcementsListContent: {
        gap: 12,
    },
    emptyAnnouncementsList: {
        alignItems: "center",
        paddingVertical: 30,
        gap: 12,
    },
    emptyAnnouncementsText: {
        fontSize: 14,
    },
    announcementItem: {
        borderRadius: 12,
        padding: 16,
        gap: 12,
        borderLeftWidth: 4,
    },
    announcementItemHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    priorityBadgeSmall: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
    },
    priorityBadgeSmallText: {
        fontSize: 11,
        fontWeight: "600",
    },
    deleteButton: {
        padding: 4,
    },
    announcementItemText: {
        fontSize: 15,
        lineHeight: 22,
    },
    announcementItemFooter: {
        flexDirection: "row",
        gap: 16,
    },
    announcementItemMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    metaText: {
        fontSize: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: "70%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
    },
    lineOption: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 2,
    },
    lineOptionText: {
        flex: 1,
        fontSize: 16,
        fontWeight: "600",
    },
});
