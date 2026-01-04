import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  LayoutAnimation,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

interface SubwayAlert {
  headerEn: string;
  headerFr: string;
  cause: string;
  effect: string;
  start?: number;
  end?: number;
}


function translateTTC(englishText: string): string {
  let text = englishText;

  const dictionary: { [key: string]: string } = {
    "Line 1 Yonge-University": "Ligne 1 Yonge-University",
    "Line 2 Bloor-Danforth": "Ligne 2 Bloor-Danforth",
    "Line 3 Scarborough": "Ligne 3 Scarborough",
    "Line 4 Sheppard": "Ligne 4 Sheppard",
    "Subway trains will move slower than usual": "Les trains circuleront plus lentement",
    "while we work on track issues": "en raison de travaux sur les voies",
    "due to": "en raison de",
    "track issues": "problèmes de voie",
    "signal problems": "problèmes de signalisation",
    "injury on track": "incident au niveau de la voie",
    "security incident": "incident de sécurité",
    "southbound": "vers le sud",
    "northbound": "vers le nord",
    "westbound": "vers le ouest",
    "eastbound": "vers le est",
    "from": "de",
    "to": "à",
    "stations": "les stations",
    "MAINTENANCE": "MAINTENANCE",
    "SIGNIFICANT_DELAYS": "RETARDS IMPORTANTS",
    "MINOR_DELAYS": "RETARDS MINEURS",
    "NO_SERVICE": "AUCUN SERVICE",
    "REDUCED_SERVICE": "SERVICE RÉDUIT"
  };

  Object.keys(dictionary).forEach((key) => {
    const regex = new RegExp(key, "gi");
    text = text.replace(regex, dictionary[key]);
  });

  return text;
}


function parseFeed(feedText: string): { alerts: SubwayAlert[]; feedTimestamp?: number } {
  const alerts: SubwayAlert[] = [];
  
  const headerMatch = feedText.match(/timestamp\s*:\s*(\d+)/);
  const feedTimestamp = headerMatch ? parseInt(headerMatch[1], 10) * 1000 : undefined;

  const chunks = feedText.split(/entity\s*\{/g);


  chunks.forEach((chunk, index) => {
    if (index === 0 && !chunk.includes("alert")) return;

    const textMatch = chunk.match(/text:\s*"([^"]+)"/);
    const causeMatch = chunk.match(/cause:\s*([A-Z_]+)/);
    const effectMatch = chunk.match(/effect:\s*([A-Z_]+)/);
    const startMatch = chunk.match(/start:\s*(\d+)/);
    const endMatch = chunk.match(/end:\s*(\d+)/);

    const fallbackHeader = causeMatch ? `${causeMatch[1]} Alert` : "Service Update";
    const headerEn = textMatch ? textMatch[1] : fallbackHeader;

    const headerFr = translateTTC(headerEn);

    if (textMatch || causeMatch) {
      alerts.push({
        headerEn,
        headerFr,
        cause: causeMatch ? causeMatch[1] : "UNKNOWN",
        effect: effectMatch ? effectMatch[1] : "UNKNOWN",
        start: startMatch ? parseInt(startMatch[1], 10) * 1000 : undefined,
        end: endMatch ? parseInt(endMatch[1], 10) * 1000 : undefined,
      });
    }
  });

  return { alerts, feedTimestamp };
}

const formatTime = (ts?: number, lang: 'en' | 'fr' = 'en') => {
  if (!ts) return "N/A";
  return new Date(ts).toLocaleString(lang === 'fr' ? 'fr-CA' : 'en-CA');
};

export default function SubwayAlerts() {
  const { colors } = useTheme();
  const [alerts, setAlerts] = useState<SubwayAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number | undefined>();
  const [expanded, setExpanded] = useState<{ [key: number]: boolean }>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [lang, setLang] = useState<'en' | 'fr'>('en');

  const getAlertColor = (start?: number, end?: number) => {
    const now = Date.now();
    if (start && start > now) return colors.alertUpcoming;
    if (start && (!end || end >= now)) return colors.alertActive;
    return colors.alertInactive;
  };

  const loadAlerts = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const PROXY_URL = "https://corsproxy.io/?";
      const TARGET_URL = "https://gtfsrt.ttc.ca/alerts/subway?format=text";
      const res = await fetch(`${PROXY_URL}${TARGET_URL}&_t=${Date.now()}`, {
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        }
      });

      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const text = await res.text();
      
      const { alerts: parsedAlerts, feedTimestamp } = parseFeed(text);

      const seen = new Set<string>();
      const uniqueAlerts = parsedAlerts.filter((alert) => {
        if (seen.has(alert.headerEn)) return false;
        seen.add(alert.headerEn);
        return true;
      });

      setAlerts(uniqueAlerts);
      setLastRefresh(feedTimestamp);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setErrorMsg(err.message || "Failed to load");
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: colors.text }]}>
          {lang === 'en' ? "Subway Alerts" : "Alertes Métro"}
        </Text>
        
        {/* Language Toggle Button */}
        <Pressable 
          onPress={() => setLang(l => l === 'en' ? 'fr' : 'en')} 
          style={({pressed}) => [
            styles.langButton, 
            { borderColor: colors.primary, opacity: pressed ? 0.6 : 1 }
          ]}
        >
          <Text style={[styles.langText, { color: colors.primary }]}>
            {lang === 'en' ? "FR" : "EN"}
          </Text>
        </Pressable>
      </View>

      <AppButton 
        title={lang === 'en' ? "Refresh Alerts" : "Actualiser"} 
        onPress={loadAlerts} 
      />
      
      <Text style={[styles.lastRefreshed, { color: colors.textSecondary }]}>
        {errorMsg 
          ? `Error: ${errorMsg}` 
          : `${lang === 'en' ? "Last refreshed" : "Dernière mise à jour"}: ${formatTime(lastRefresh, lang)}`}
      </Text>

      <ScrollView style={styles.scroll}>
        {loading ? (
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {lang === 'en' ? "Loading..." : "Chargement..."}
          </Text>
        ) : alerts.length === 0 ? (
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {errorMsg 
               ? (lang === 'en' ? "Could not load alerts." : "Impossible de charger.")
               : (lang === 'en' ? "No active subway alerts" : "Aucune alerte active")}
          </Text>
        ) : (
          alerts.map((alert, i) => {
            const isExpanded = expanded[i];
            
            const header = lang === 'en' ? alert.headerEn : alert.headerFr;
            const cause = lang === 'en' ? alert.cause : translateTTC(alert.cause);
            const effect = lang === 'en' ? alert.effect : translateTTC(alert.effect);

            return (
              <Pressable key={i} onPress={() => toggleExpand(i)}>
                <View
                  style={[
                    styles.alertCard,
                    { backgroundColor: getAlertColor(alert.start, alert.end) },
                  ]}
                >
                  <View style={styles.alertHeaderRow}>
                    <Text style={[styles.alertHeader, { color: colors.alertText }]}>
                      {header}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={colors.chevron}
                      style={{ transform: [{ rotate: isExpanded ? "180deg" : "0deg" }] }}
                    />
                  </View>
                  {isExpanded && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={[styles.alertText, { color: colors.alertText }]}>
                        Cause: {cause}
                      </Text>
                      <Text style={[styles.alertText, { color: colors.alertText }]}>
                        Effect: {effect}
                      </Text>
                      <Text style={[styles.alertText, { color: colors.alertText }]}>
                        Start: {formatTime(alert.start, lang)}
                      </Text>
                      {alert.end && (
                        <Text style={[styles.alertText, { color: colors.alertText }]}>
                          End: {formatTime(alert.end, lang)}
                        </Text>
                      )}
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
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.primary },
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  headerContainer: { 
    flexDirection: "row", 
    justifyContent: "center", 
    alignItems: "center", 
    marginBottom: 16,
    position: 'relative'
  },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  langButton: { 
    position: 'absolute', 
    right: 0, 
    borderWidth: 2, 
    borderRadius: 8, 
    paddingHorizontal: 10, 
    paddingVertical: 6 
  },
  langText: { fontWeight: "bold", fontSize: 14 },
  lastRefreshed: { fontSize: 14, fontStyle: "italic", marginTop: 8, marginBottom: 16, textAlign: "center" },
  scroll: { flex: 1 },
  alertCard: { padding: 16, borderRadius: 14, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  alertHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  alertHeader: { fontWeight: "bold", fontSize: 16, flex: 1 },
  alertText: { fontSize: 14, marginTop: 4 },
  loadingText: { textAlign: "center", marginTop: 20 },
  button: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, alignItems: "center", marginBottom: 12 },
  buttonPressed: { opacity: 0.9 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
});