import React, { useEffect, useState, useCallback } from "react";
import { Text, View, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from "react-native";

// ⬇️ Replace this with your public Codespaces/Ngrok URL, including /alerts
const ALERTS_URL = "https://ectatic-cecil-abstemiously.ngrok-free.dev/alerts";



type AlertItem = {
  id: string;
  title: string;
  description: string;
  effect?: string | null;
  cause?: string | null;
  activePeriod?: { start: number | null; end: number | null }[];
};

export default function Updates() {
  const [data, setData] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const mapItems = (items: any[]): AlertItem[] =>
    (items || []).map((it) => ({
      id: String(it.id),
      title: it.title || it.effect || "TTC Service Alert",
      description:
        it.description ||
        [it.effect ? `Effect: ${it.effect}` : "", it.cause ? `Cause: ${it.cause}` : ""]
          .filter(Boolean)
          .join(" • "),
      effect: it.effect ?? null,
      cause: it.cause ?? null,
      activePeriod: it.activePeriod || [],
    }));

  const load = useCallback(async () => {
    try {
      const r = await fetch(ALERTS_URL);
      const j = await r.json();
      setData(mapItems(j.items));
    } catch (e) {
      console.warn("Failed to load alerts:", e);
      setData([]); // fail safe
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000); // refresh every minute
    return () => clearInterval(t);
  }, [load]);

  const renderItem = ({ item }: { item: AlertItem }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDescription}>{item.description}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8, color: "#555" }}>Loading TTC updates…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>See what’s new</Text>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, data.length === 0 && { flexGrow: 1, justifyContent: "center" }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<Text style={{ textAlign: "center", color: "#777" }}>No active alerts.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fbfbfbff",
    alignItems: "center",
    paddingTop: 32, // keeps title from hugging the top
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#282828ff",
    textAlign: "center",
    marginBottom: 16,
  },
  list: {
    paddingBottom: 40,
    width: "90%",
  },
  card: {
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2F0B0B",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: "#555",
  },
});
