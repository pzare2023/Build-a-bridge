import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DEMO_ACCOUNTS } from "../../constants/demoAccounts";
import { useTheme } from "../../context/ThemeContext";
import { db } from "../../firebase/config";
import type { Announcement } from "../../services/announcements";
import { deleteAnnouncement as deleteAnnouncementService } from "../../services/announcements";

interface TrainWithAnnouncements {
  trainNumber: string;
  announcements: Announcement[];
}

type TabType = "announcements" | "users" | "stats";

export default function AdminDashboard() {
  const router = useRouter();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>("announcements");
  const [allAnnouncements, setAllAnnouncements] = useState<
    TrainWithAnnouncements[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);

  useEffect(() => {
    loadAllAnnouncements();
  }, []);

  const loadAllAnnouncements = async () => {
    setLoading(true);
    try {
      const trainsRef = collection(db, "trains");
      const snapshot = await getDocs(trainsRef);

      const trains: TrainWithAnnouncements[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.announcements && data.announcements.length > 0) {
          trains.push({
            trainNumber: doc.id,
            announcements: data.announcements,
          });
        }
      });

      setAllAnnouncements(trains);
    } catch (error) {
      console.error("Error loading announcements:", error);
      Alert.alert("Error", "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (
    trainNumber: string,
    announcement: Announcement
  ) => {
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
              await deleteAnnouncementService(trainNumber, announcement);
              await loadAllAnnouncements();
              Alert.alert("Success", "Announcement deleted");
            } catch (error) {
              console.error("Error deleting announcement:", error);
              Alert.alert("Error", "Failed to delete announcement");
            }
          },
        },
      ]
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "emergency":
        return "#ef4444";
      case "service_change":
        return "#f59e0b";
      case "info":
        return "#3b82f6";
      default:
        return colors.text;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "emergency":
        return "EMERGENCY";
      case "service_change":
        return "SERVICE CHANGE";
      case "info":
        return "INFO";
      default:
        return priority.toUpperCase();
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getAllAnnouncementsFlat = () => {
    let flat: Array<{
      trainNumber: string;
      announcement: Announcement;
      index: number;
    }> = [];

    allAnnouncements.forEach((train) => {
      train.announcements.forEach((announcement, index) => {
        flat.push({ trainNumber: train.trainNumber, announcement, index });
      });
    });

    // Filter by priority if selected
    if (filterPriority) {
      flat = flat.filter((item) => item.announcement.priority === filterPriority);
    }

    // Sort by most recent
    flat.sort((a, b) => b.announcement.createdAt - a.announcement.createdAt);

    return flat;
  };

  const getStatistics = () => {
    const flatAnnouncements = getAllAnnouncementsFlat();
    const total = flatAnnouncements.length;
    const emergency = flatAnnouncements.filter(
      (a) => a.announcement.priority === "emergency"
    ).length;
    const serviceChange = flatAnnouncements.filter(
      (a) => a.announcement.priority === "service_change"
    ).length;
    const info = flatAnnouncements.filter(
      (a) => a.announcement.priority === "info"
    ).length;

    // Count by driver
    const driverCounts: { [key: string]: number } = {};
    flatAnnouncements.forEach((item) => {
      const driver = item.announcement.driverName;
      driverCounts[driver] = (driverCounts[driver] || 0) + 1;
    });

    const mostActive = Object.entries(driverCounts).sort(
      ([, a], [, b]) => b - a
    )[0];

    return {
      total,
      emergency,
      serviceChange,
      info,
      mostActiveDriver: mostActive ? mostActive[0] : "N/A",
      mostActiveCount: mostActive ? mostActive[1] : 0,
    };
  };

  const renderAnnouncementsTab = () => {
    const flatAnnouncements = getAllAnnouncementsFlat();

    return (
      <View style={styles.tabContent}>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  filterPriority === null ? colors.primary : colors.card,
              },
            ]}
            onPress={() => setFilterPriority(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                {
                  color:
                    filterPriority === null ? colors.textInverse : colors.text,
                },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  filterPriority === "emergency" ? "#ef4444" : colors.card,
              },
            ]}
            onPress={() => setFilterPriority("emergency")}
          >
            <Text
              style={[
                styles.filterChipText,
                {
                  color:
                    filterPriority === "emergency"
                      ? "#fff"
                      : colors.text,
                },
              ]}
            >
              Emergency
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  filterPriority === "service_change" ? "#f59e0b" : colors.card,
              },
            ]}
            onPress={() => setFilterPriority("service_change")}
          >
            <Text
              style={[
                styles.filterChipText,
                {
                  color:
                    filterPriority === "service_change"
                      ? "#fff"
                      : colors.text,
                },
              ]}
            >
              Service
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  filterPriority === "info" ? "#3b82f6" : colors.card,
              },
            ]}
            onPress={() => setFilterPriority("info")}
          >
            <Text
              style={[
                styles.filterChipText,
                {
                  color:
                    filterPriority === "info" ? "#fff" : colors.text,
                },
              ]}
            >
              Info
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={flatAnnouncements}
          keyExtractor={(item, idx) =>
            `${item.trainNumber}-${item.index}-${idx}`
          }
          renderItem={({ item }) => (
            <View
              style={[styles.announcementCard, { backgroundColor: colors.card, borderLeftColor: getPriorityColor(item.announcement.priority) }]}
            >
              <View style={styles.announcementHeader}>
                <View style={styles.announcementHeaderLeft}>
                  <Ionicons name="train" size={18} color={colors.primary} />
                  <Text style={[styles.trainNumber, { color: colors.text }]}>
                    Train #{item.trainNumber}
                  </Text>
                  <View
                    style={[
                      styles.priorityBadge,
                      {
                        backgroundColor: getPriorityColor(
                          item.announcement.priority
                        ) + "20",
                        borderColor: getPriorityColor(
                          item.announcement.priority
                        ),
                      },
                    ]}
                  >
                    <Text style={[styles.priorityText, { color: getPriorityColor(item.announcement.priority) }]}>
                      {getPriorityLabel(item.announcement.priority)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    handleDeleteAnnouncement(item.trainNumber, item.announcement)
                  }
                  style={styles.deleteButtonContainer}
                >
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
              <Text style={[styles.announcementText, { color: colors.text }]}>
                {item.announcement.text}
              </Text>
              <View style={styles.announcementFooter}>
                <View style={styles.footerItem}>
                  <Ionicons name="person" size={14} color={colors.textMuted} />
                  <Text
                    style={[styles.announcementMeta, { color: colors.textMuted }]}
                  >
                    {item.announcement.driverName}
                  </Text>
                </View>
                <View style={styles.footerItem}>
                  <Ionicons name="time" size={14} color={colors.textMuted} />
                  <Text
                    style={[styles.announcementMeta, { color: colors.textMuted }]}
                  >
                    {formatDate(item.announcement.createdAt)}
                  </Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="megaphone-outline" size={64} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No announcements found
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                Announcements will appear here once they are created
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadAllAnnouncements}
              colors={[colors.primary]}
            />
          }
        />
      </View>
    );
  };

  const renderUsersTab = () => {
    const announcerAccounts = DEMO_ACCOUNTS.filter(
      (acc) => acc.role === "announcer"
    );

    // Count announcements per driver
    const driverCounts: { [key: string]: number } = {};
    allAnnouncements.forEach((train) => {
      train.announcements.forEach((announcement) => {
        const driver = announcement.driverName;
        driverCounts[driver] = (driverCounts[driver] || 0) + 1;
      });
    });

    return (
      <ScrollView style={styles.tabContent} contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeader}>
          <Ionicons name="people" size={24} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Announcer Accounts ({announcerAccounts.length})
          </Text>
        </View>
        {announcerAccounts.map((account, index) => (
          <View
            key={account.id}
            style={[styles.userCard, { backgroundColor: colors.card }]}
          >
            <View style={styles.userCardHeader}>
              <View style={[styles.userAvatar, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.userAvatarText, { color: colors.primary }]}>
                  {account.name.charAt(0)}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {account.name}
                </Text>
                <View style={styles.userEmailRow}>
                  <Ionicons name="mail-outline" size={14} color={colors.textMuted} />
                  <Text style={[styles.userEmail, { color: colors.textMuted }]}>
                    {account.email}
                  </Text>
                </View>
              </View>
            </View>
            <View style={[styles.userStatsContainer, { backgroundColor: colors.background }]}>
              <Ionicons name="megaphone" size={16} color={colors.primary} />
              <Text style={[styles.userStats, { color: colors.text }]}>
                {driverCounts[account.name] || 0} announcements
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderStatsTab = () => {
    const stats = getStatistics();

    return (
      <ScrollView style={styles.tabContent} contentContainerStyle={styles.scrollContent}>
        {/* Total Announcements Card */}
        <View style={[styles.totalStatCard, { backgroundColor: colors.primary }]}>
          <Ionicons name="megaphone" size={40} color="#fff" />
          <Text style={styles.totalStatNumber}>
            {stats.total}
          </Text>
          <Text style={styles.totalStatLabel}>
            Total Announcements
          </Text>
        </View>

        {/* Priority Breakdown */}
        <View style={styles.sectionHeader}>
          <Ionicons name="pie-chart" size={24} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            By Priority
          </Text>
        </View>

        <View style={styles.priorityGrid}>
          <View style={[styles.priorityCard, { backgroundColor: "#ef4444" + "15", borderColor: "#ef4444" }]}>
            <Ionicons name="alert-circle" size={32} color="#ef4444" />
            <Text style={[styles.priorityNumber, { color: "#ef4444" }]}>
              {stats.emergency}
            </Text>
            <Text style={[styles.priorityLabel, { color: colors.text }]}>
              Emergency
            </Text>
          </View>

          <View style={[styles.priorityCard, { backgroundColor: "#f59e0b" + "15", borderColor: "#f59e0b" }]}>
            <Ionicons name="swap-horizontal" size={32} color="#f59e0b" />
            <Text style={[styles.priorityNumber, { color: "#f59e0b" }]}>
              {stats.serviceChange}
            </Text>
            <Text style={[styles.priorityLabel, { color: colors.text }]}>
              Service
            </Text>
          </View>

          <View style={[styles.priorityCard, { backgroundColor: "#3b82f6" + "15", borderColor: "#3b82f6" }]}>
            <Ionicons name="information-circle" size={32} color="#3b82f6" />
            <Text style={[styles.priorityNumber, { color: "#3b82f6" }]}>
              {stats.info}
            </Text>
            <Text style={[styles.priorityLabel, { color: colors.text }]}>
              Info
            </Text>
          </View>
        </View>

        {/* Most Active Announcer */}
        <View style={styles.sectionHeader}>
          <Ionicons name="trophy" size={24} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Most Active Announcer
          </Text>
        </View>
        <View style={[styles.activeAnnouncerCard, { backgroundColor: colors.card }]}>
          <View style={[styles.trophy, { backgroundColor: "#fbbf24" }]}>
            <Ionicons name="trophy" size={24} color="#fff" />
          </View>
          <Text style={[styles.activeAnnouncerName, { color: colors.text }]}>
            {stats.mostActiveDriver}
          </Text>
          <Text style={[styles.activeAnnouncerCount, { color: colors.primary }]}>
            {stats.mostActiveCount} announcements
          </Text>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Enhanced Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Ionicons name="shield-checkmark" size={32} color="#fff" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Admin Dashboard</Text>
              <Text style={styles.headerSubtitle}>System Management</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Enhanced Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "announcements" && [
              styles.activeTab,
              { backgroundColor: colors.primary + "15" },
            ],
          ]}
          onPress={() => setActiveTab("announcements")}
        >
          <Ionicons
            name="megaphone"
            size={20}
            color={activeTab === "announcements" ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "announcements" ? colors.primary : colors.textMuted,
              },
            ]}
          >
            Announcements
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "users" && [
              styles.activeTab,
              { backgroundColor: colors.primary + "15" },
            ],
          ]}
          onPress={() => setActiveTab("users")}
        >
          <Ionicons
            name="people"
            size={20}
            color={activeTab === "users" ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "users" ? colors.primary : colors.textMuted },
            ]}
          >
            Users
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "stats" && [
              styles.activeTab,
              { backgroundColor: colors.primary + "15" },
            ],
          ]}
          onPress={() => setActiveTab("stats")}
        >
          <Ionicons
            name="stats-chart"
            size={20}
            color={activeTab === "stats" ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "stats" ? colors.primary : colors.textMuted },
            ]}
          >
            Statistics
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading dashboard data...
          </Text>
        </View>
      ) : (
        <>
          {activeTab === "announcements" && renderAnnouncementsTab()}
          {activeTab === "users" && renderUsersTab()}
          {activeTab === "stats" && renderStatsTab()}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
  },
  backButton: {
    padding: 8,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingTop: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  activeTab: {
    borderRadius: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  filterContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  announcementCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  announcementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  announcementHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    flexWrap: "wrap",
  },
  trainNumber: {
    fontSize: 16,
    fontWeight: "700",
  },
  priorityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "700",
  },
  deleteButtonContainer: {
    padding: 4,
  },
  announcementText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  announcementFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  announcementMeta: {
    fontSize: 13,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtext: {
    textAlign: "center",
    fontSize: 14,
    maxWidth: 280,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  userCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
  },
  userEmailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  userEmail: {
    fontSize: 13,
  },
  userStatsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  userStats: {
    fontSize: 14,
    fontWeight: "600",
  },
  totalStatCard: {
    borderRadius: 16,
    padding: 32,
    marginBottom: 24,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  totalStatNumber: {
    fontSize: 56,
    fontWeight: "700",
    color: "#fff",
  },
  totalStatLabel: {
    fontSize: 16,
    color: "#fff",
    opacity: 0.95,
  },
  priorityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  priorityCard: {
    flex: 1,
    minWidth: 100,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  priorityNumber: {
    fontSize: 32,
    fontWeight: "700",
  },
  priorityLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  activeAnnouncerCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  trophy: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  activeAnnouncerName: {
    fontSize: 20,
    fontWeight: "700",
  },
  activeAnnouncerCount: {
    fontSize: 16,
    fontWeight: "600",
  },
  statCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 48,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 16,
    marginTop: 4,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 8,
  },
  statText: {
    fontSize: 16,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 8,
  },
});
