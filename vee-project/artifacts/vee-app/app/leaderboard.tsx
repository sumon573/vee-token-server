import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { firebaseService } from "@/services/firebase";
import { VeeUser } from "@/types";
import { UserAvatar } from "@/components/UserAvatar";
import { LevelBadge } from "@/components/LevelBadge";

type Tab = "gifters" | "receivers" | "richest";

interface RankedUser extends VeeUser { rank: number; value: number }

const MEDAL = ["🥇", "🥈", "🥉"];
const PODIUM_COLORS = ["#F5A623", "#C0C0C0", "#CD7F32"];
const PODIUM_HEIGHT = [100, 80, 65];

export default function LeaderboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("gifters");
  const [users, setUsers] = useState<RankedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPadding = insets.bottom + (Platform.OS === "web" ? 34 : 60);

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      try {
        let data: RankedUser[];
        if (tab === "gifters") data = (await firebaseService.getTopGifters(20)) as RankedUser[];
        else if (tab === "receivers") data = (await firebaseService.getTopReceivers(20)) as RankedUser[];
        else {
          const all = (await firebaseService.getTopReceivers(20)) as RankedUser[];
          data = all.sort((a, b) => b.diamonds - a.diamonds).map((u, i) => ({ ...u, rank: i + 1, value: u.diamonds }));
        }
        setUsers(data);
      } catch (e) {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tab]);

  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  const valueLabel = tab === "gifters" ? "💎 sent" : tab === "receivers" ? "💰 earned" : "💎 balance";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.background]}
        locations={[0, 1]}
        style={[styles.headerGrad, { paddingTop: topPadding + 12 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={{ width: 32, height: 32, justifyContent: "center" }}>
            <Feather name="chevron-left" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rankings</Text>
          <Feather name="award" size={24} color={colors.gold} />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {([
            { key: "gifters", label: "Top Gifters" },
            { key: "receivers", label: "Top Earners" },
            { key: "richest", label: "Richest" },
          ] as { key: Tab; label: string }[]).map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, tab === t.key && [styles.tabBtnActive, { backgroundColor: colors.card }]]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabLabel, { color: tab === t.key ? colors.text : "rgba(255,255,255,0.7)" }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : users.length === 0 ? (
        <View style={styles.center}>
          <Feather name="award" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No data yet</Text>
        </View>
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(u) => u.uid}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 16 }}
          ListHeaderComponent={() => (
            <>
              {/* Podium — top 3 */}
              {top3.length >= 1 && (
                <View style={styles.podium}>
                  {/* 2nd place */}
                  {top3[1] ? (
                    <View style={[styles.podiumSlot, { marginTop: 24 }]}>
                      <Text style={styles.podiumMedal}>{MEDAL[1]}</Text>
                      <UserAvatar uri={top3[1].avatar} size={56} borderColor={PODIUM_COLORS[1]} borderWidth={2} />
                      <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>{top3[1].displayName}</Text>
                      <View style={[styles.podiumBase, { backgroundColor: PODIUM_COLORS[1], height: PODIUM_HEIGHT[1] }]}>
                        <Text style={styles.podiumScore}>{top3[1].value.toLocaleString()}</Text>
                      </View>
                    </View>
                  ) : <View style={styles.podiumSlot} />}

                  {/* 1st place */}
                  <View style={[styles.podiumSlot, { marginBottom: 0 }]}>
                    <Feather name="award" size={24} color={colors.gold} />
                    <Text style={styles.podiumMedal}>{MEDAL[0]}</Text>
                    <UserAvatar uri={top3[0].avatar} size={68} borderColor={PODIUM_COLORS[0]} borderWidth={3} />
                    <Text style={[styles.podiumName, { color: colors.text, fontWeight: "800" }]} numberOfLines={1}>{top3[0].displayName}</Text>
                    <View style={[styles.podiumBase, { backgroundColor: PODIUM_COLORS[0], height: PODIUM_HEIGHT[0] }]}>
                      <Text style={styles.podiumScore}>{top3[0].value.toLocaleString()}</Text>
                    </View>
                  </View>

                  {/* 3rd place */}
                  {top3[2] ? (
                    <View style={[styles.podiumSlot, { marginTop: 42 }]}>
                      <Text style={styles.podiumMedal}>{MEDAL[2]}</Text>
                      <UserAvatar uri={top3[2].avatar} size={50} borderColor={PODIUM_COLORS[2]} borderWidth={2} />
                      <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>{top3[2].displayName}</Text>
                      <View style={[styles.podiumBase, { backgroundColor: PODIUM_COLORS[2], height: PODIUM_HEIGHT[2] }]}>
                        <Text style={styles.podiumScore}>{top3[2].value.toLocaleString()}</Text>
                      </View>
                    </View>
                  ) : <View style={styles.podiumSlot} />}
                </View>
              )}

              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>All Rankings</Text>
            </>
          )}
          renderItem={({ item, index }) => (
            <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.rankNum, { color: colors.mutedForeground }]}>{item.rank}</Text>
              <UserAvatar uri={item.avatar} size={44} />
              <View style={styles.rowInfo}>
                <View style={styles.rowTop}>
                  <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{item.displayName}</Text>
                  <LevelBadge level={item.level} small />
                </View>
                <Text style={[styles.veeId, { color: colors.primary }]}>{item.veeId}</Text>
              </View>
              <View style={styles.valueWrap}>
                <Text style={[styles.value, { color: colors.gold }]}>{item.value.toLocaleString()}</Text>
                <Text style={[styles.valueLabel, { color: colors.mutedForeground }]}>{valueLabel}</Text>
              </View>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGrad: { paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#fff" },
  tabs: { flexDirection: "row", gap: 6 },
  tabBtn: { flex: 1, paddingVertical: 8, paddingHorizontal: 4, alignItems: "center", borderRadius: 10 },
  tabBtnActive: {},
  tabLabel: { fontSize: 12, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyText: { fontSize: 16, fontWeight: "600" },
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    marginVertical: 20,
    gap: 8,
  },
  podiumSlot: { flex: 1, alignItems: "center", gap: 4 },
  podiumMedal: { fontSize: 20 },
  podiumName: { fontSize: 11, fontWeight: "700", textAlign: "center", width: "100%" },
  podiumBase: {
    width: "100%",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 8,
  },
  podiumScore: { color: "#fff", fontWeight: "900", fontSize: 13 },
  sectionLabel: { fontSize: 12, fontWeight: "700", marginBottom: 12, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 12, gap: 12, borderWidth: 1 },
  rankNum: { fontSize: 14, fontWeight: "700", width: 28, textAlign: "center" },
  rowInfo: { flex: 1 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  userName: { fontSize: 14, fontWeight: "700", maxWidth: 120 },
  veeId: { fontSize: 11, marginTop: 2 },
  valueWrap: { alignItems: "flex-end" },
  value: { fontSize: 15, fontWeight: "900" },
  valueLabel: { fontSize: 10, fontWeight: "600" },
});
