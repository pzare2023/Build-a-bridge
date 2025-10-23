import { Text, View, StyleSheet, FlatList } from "react-native";
import { router } from "expo-router";


const updates = [
  {
    id: "1",
    title: "New TTC Routes Added",
    description: "We’ve expanded coverage to include all express lines in Toronto.",
  },
  {
    id: "2",
    title: "GO Transit Alerts",
    description: "Get live updates on GO train delays right in your dashboard.",
  },
  {
    id: "3",
    title: "Language Support",
    description: "Now available in Hindi, Persian, and Arabic for a more inclusive experience.",
  },
];

export default function Updates() {
  const renderItem = ({ item }: { item: typeof updates[0] }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDescription}>{item.description}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>See what’s new</Text>
      <FlatList
        data={updates}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fbfbfbff", 
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#282828ff", 
    textAlign: "center",
  },
    list: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 1, // adds subtle shadow (Android)
    shadowColor: "#000", // iOS shadow
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2F0B0B", // same maroon tone as your buttons if you like
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: "#555",
  },
});