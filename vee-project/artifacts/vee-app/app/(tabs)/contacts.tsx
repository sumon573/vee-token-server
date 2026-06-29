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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { firebaseService } from "@/services/firebase";
import { VeeUser } from "@/types";
import { UserAvatar } from "@/components/UserAvatar";
import { LevelBadge } from "@/components/LevelBadge";

export default function ContactsScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [friends, setFriends] = useState<VeeUser[]>([]);
  const [loading, setLoading] = useState(true);

  const followingKey = (user?.following ?? []).join(",");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const uids = user.following ?? [];
        const profiles = await Promise.all(uids.map((uid) => firebaseService.getUserProfile(uid)));
        // Contacts are mutual follows (true friends).
        const mutual = profiles.filter(
          (p): p is VeeUser => !!p && p.following.includes(user.uid)
        );
        mutual.sort((a, b) => a.displayName.localeCompare(b.displayName));
        if (!cancelled) setFriends(mutual);
      } catch {
        if (!cancelled) setFriends([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, followingKey]);

  const bottomPadding = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={[styles.addRow, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push("/friends/search")}
        activeOpacity={0.8}
      >
        <View style={[styles.addIcon, { backgroundColor: colors.primary + "22" }]}>
          <Feather name="user-plus" size={20} color={colors.primary} />
        </View>
        <Text style={[styles.addText, { color: colors.text }]}>Find Friends</Text>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : friends.length === 0 ? (
        <View style={styles.center}>
          <Feather name="users" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No contacts yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Add friends by their Vee ID to see them here
          </Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(u) => u.uid}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 16 }}
          ListHeaderComponent={() => (
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              {friends.length} CONTACT{friends.length !== 1 ? "S" : ""}
            </Text>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/profile/${item.uid}`)}
              activeOpacity={0.8}
            >
              <UserAvatar uri={item.avatar} size={48} />
              <View style={styles.rowInfo}>
                <View style={styles.rowTop}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                    {item.displayName}
                  </Text>
                  <LevelBadge level={item.level} small />
                </View>
                <Text style={[styles.veeId, { color: colors.primary }]}>{item.veeId}</Text>
              </View>
              <TouchableOpacity
                style={[styles.msgBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push(`/chat/${item.uid}`)}
              >
                <Feather name="message-circle" size={18} color="#fff" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    margin: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  addIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  addText: { flex: 1, fontSize: 15, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontWeight: "700", marginTop: 6 },
  emptyText: { fontSize: 14, textAlign: "center" },
  sectionLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.8, marginBottom: 12, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 12, gap: 12, borderWidth: 1 },
  rowInfo: { flex: 1 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 15, fontWeight: "700", maxWidth: 160 },
  veeId: { fontSize: 12, marginTop: 2, fontWeight: "600" },
  msgBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
