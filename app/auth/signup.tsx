import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { DEMO_ACCOUNTS } from "../../constants/demoAccounts";

export default function Signup() {
  const router = useRouter();
  const { colors } = useTheme();

  const announcerAccounts = DEMO_ACCOUNTS.filter(
    (acc) => acc.role === "announcer"
  );
  const adminAccount = DEMO_ACCOUNTS.find((acc) => acc.role === "admin");

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Demo Accounts
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          This is a demo app. Use one of these accounts to login:
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Announcer Accounts
        </Text>
        {announcerAccounts.map((account) => (
          <View
            key={account.id}
            style={[styles.accountCard, { backgroundColor: colors.card }]}
          >
            <View style={styles.accountInfo}>
              <Text style={[styles.accountName, { color: colors.text }]}>
                {account.name}
              </Text>
              <View style={styles.credentialRow}>
                <Text style={[styles.credentialLabel, { color: colors.textMuted }]}>
                  Email:
                </Text>
                <Text style={[styles.credentialValue, { color: colors.text }]}>
                  {account.email}
                </Text>
              </View>
              <View style={styles.credentialRow}>
                <Text style={[styles.credentialLabel, { color: colors.textMuted }]}>
                  Password:
                </Text>
                <Text style={[styles.credentialValue, { color: colors.text }]}>
                  {account.password}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {adminAccount && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Admin Account
          </Text>
          <View
            style={[
              styles.accountCard,
              styles.adminCard,
              { backgroundColor: colors.card, borderColor: colors.primary },
            ]}
          >
            <View style={styles.accountInfo}>
              <Text style={[styles.accountName, { color: colors.text }]}>
                {adminAccount.name}
              </Text>
              <View style={styles.credentialRow}>
                <Text style={[styles.credentialLabel, { color: colors.textMuted }]}>
                  Email:
                </Text>
                <Text style={[styles.credentialValue, { color: colors.text }]}>
                  {adminAccount.email}
                </Text>
              </View>
              <View style={styles.credentialRow}>
                <Text style={[styles.credentialLabel, { color: colors.textMuted }]}>
                  Password:
                </Text>
                <Text style={[styles.credentialValue, { color: colors.text }]}>
                  {adminAccount.password}
                </Text>
              </View>
            </View>
          </View>
          <Text style={[styles.adminNote, { color: colors.textMuted }]}>
            💡 Tip: Long-press the "Announcer" button on the home screen to
            access the admin dashboard
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: colors.primary }]}
        onPress={() => router.back()}
      >
        <Text style={[styles.backButtonText, { color: colors.textInverse }]}>
          Back to Login
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  accountCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  adminCard: {
    borderWidth: 2,
  },
  accountInfo: {
    gap: 8,
  },
  accountName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  credentialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 2,
  },
  credentialLabel: {
    fontSize: 14,
    width: 70,
  },
  credentialValue: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  adminNote: {
    fontSize: 14,
    fontStyle: "italic",
    marginTop: 8,
    lineHeight: 20,
  },
  backButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    marginTop: 16,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
});
