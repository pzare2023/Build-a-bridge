
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { LayoutAnimation, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";


interface SubwayAlert {
  header: string;
  cause: string;
  effect: string;
  start?: number;
  end?: number;
}

// Parse feed line-by-line
function parseFeed(feedText: string): { alerts: SubwayAlert[]; feedTimestamp?: number } {
  const lines = feedText.split("\n");
  const alerts: SubwayAlert[] = [];
  let currentAlert: Partial<SubwayAlert> = {};
  let inAlertBlock = false;
  let braceStack: string[] = [];
  let feedTimestamp: number | undefined;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!feedTimestamp && trimmed.startsWith("timestamp:")) {
      feedTimestamp = parseInt(trimmed.replace("timestamp:", "").trim(), 10) * 1000;
    }
    if (trimmed.endsWith("{")) {
      braceStack.push(trimmed.replace("{", "").trim());
      if (trimmed.startsWith("alert")) {
        inAlertBlock = true;
        currentAlert = {};
      }
    } else if (trimmed === "}") {
      const popped = braceStack.pop();
      if (popped === "alert") {
        inAlertBlock = false;
        if (currentAlert.header) alerts.push(currentAlert as SubwayAlert);
      }
    } else if (inAlertBlock) {
      if (trimmed.startsWith("cause:")) currentAlert.cause = trimmed.replace("cause:", "").trim();
      else if (trimmed.startsWith("effect:")) currentAlert.effect = trimmed.replace("effect:", "").trim();
      else if (trimmed.startsWith("text:")) {
        const t = trimmed.replace(/^text: /, "").replace(/^"|"$/g, "");
        currentAlert.header = t;
      } else if (trimmed.startsWith("start:"))
        currentAlert.start = parseInt(trimmed.replace("start:", "").trim(), 10) * 1000;
      else if (trimmed.startsWith("end:"))
        currentAlert.end = parseInt(trimmed.replace("end:", "").trim(), 10) * 1000;
    }
  });

  return { alerts, feedTimestamp };
}

const formatTime = (ts?: number) => (ts ? new Date(ts).toLocaleString() : "N/A");
const getAlertColor = (start?: number, end?: number) => {
  const now = Date.now();
  if (start && end && now >= start && now <= end) return "#ffcccc";
  if (start && start > now) return "#fff3cc";
  return "#f0f0f0";
};

export default function SubwayAlerts() {
  const [alerts, setAlerts] = useState<SubwayAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number | undefined>();
  const [expanded, setExpanded] = useState<{ [key: number]: boolean }>({});

  const loadAlerts = async () => {
  setLoading(true);
  try {
    const res = await fetch("https://gtfsrt.ttc.ca/alerts/subway?format=text");
    const text = await res.text();
    const { alerts: parsedAlerts, feedTimestamp } = parseFeed(text);

    // Remove duplicate alerts by header
    const seen = new Set<string>();
    const uniqueAlerts = parsedAlerts.filter(alert => {
      if (seen.has(alert.header)) return false;
      seen.add(alert.header);
      return true;
    });

    setAlerts(uniqueAlerts);
    setLastRefresh(feedTimestamp);
  } catch (err) {
    console.error("Error fetching subway alerts:", err);
    setAlerts([]);
    setLastRefresh(undefined);
  }
  setLoading(false);
};

    useEffect(() => {
    loadAlerts();
  }, []);

  const toggleExpand = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subway Alerts</Text>
      <AppButton title="Refresh Alerts" onPress={loadAlerts} />
      <Text style={styles.lastRefreshed}>Last refreshed: {formatTime(lastRefresh)}</Text>
      <ScrollView style={styles.scroll}>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : alerts.length === 0 ? (
          <Text style={styles.loadingText}>No active subway alerts</Text>
        ) : (
          alerts.map((alert, i) => {
            const isExpanded = expanded[i];
            return (
              <Pressable key={i} onPress={() => toggleExpand(i)}>
                <View style={[styles.alertCard, { backgroundColor: getAlertColor(alert.start, alert.end) }]}>
                  <View style={styles.alertHeaderRow}>
                    <Text style={styles.alertHeader}>{alert.header}</Text>
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color="#282828"
                      style={{ transform: [{ rotate: isExpanded ? "180deg" : "0deg" }] }}
                    />
                  </View>
                  {isExpanded && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.alertText}>Cause: {alert.cause}</Text>
                      <Text style={styles.alertText}>Effect: {alert.effect}</Text>
                      <Text style={styles.alertText}>Start: {formatTime(alert.start)}</Text>
                      <Text style={styles.alertText}>End: {formatTime(alert.end)}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function AppButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#fbfbfbff" },
  title: { fontSize: 24, fontWeight: "700", color: "#282828ff", marginBottom: 16, textAlign: "center" },
  lastRefreshed: { fontSize: 14, fontStyle: "italic", marginTop: 8, marginBottom: 16, textAlign: "center", color: "#555" },
  scroll: { flex: 1 },
  alertCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  alertHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  alertHeader: { fontWeight: "bold", fontSize: 16, color: "#282828ff", flex: 1 },
  alertText: { fontSize: 14, color: "#282828ff", marginTop: 2 },
  loadingText: { textAlign: "center", color: "#555", marginTop: 20 },
  button: { backgroundColor: "#8e2a2aff", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, alignItems: "center", marginBottom: 12 },
  buttonPressed: { opacity: 0.9 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
});
