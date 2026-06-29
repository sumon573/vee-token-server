import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { firebaseService } from "@/services/firebase";
import { Announcement, UserReport, VeeUser } from "@/types";
import { UserAvatar } from "@/components/UserAvatar";

type Tab = "users" | "reports" | "announcements";

const BADGE_PRESETS = [
  { id: "star", name: "Star", color: "#F5A623", icon: "⭐" },
  { id: "fire", name: "Fire", color: "#FF4444", icon: "🔥" },
  { id: "crown", name: "Crown", color: "#7B2FF7", icon: "👑" },
  { id: "heart", name: "Heart", color: "#FF69B4", icon: "❤️" },
  { id: "diamond", name: "Diamond", color: "#00BCD4", icon: "💎" },
];

const FRAME_PRESETS = [
  { id: "gold", name: "Gold Ring", color: "#F5A623" },
  { id: "neon", name: "Neon Purple", color: "#7B2FF7" },
  { id: "aqua", name: "Aqua Glow", color: "#00BCD4" },
  { id: "rose", name: "Rose", color: "#FF69B4" },
  { id: "emerald", name: "Emerald", color: "#2ECC71" },
];

const ADMIN_WRITE_HINT =
  "This write was rejected by the database. In production, moderation actions on other users require the Admin SDK backend (see FIREBASE_SECURITY_RULES.md).";

export default function AdminScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<VeeUser[]>([]);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState<VeeUser | null>(null);
  const [searching, setSearching] = useState(false);

  // Grant diamonds
  const [diamondUid, setDiamondUid] = useState("");
  const [diamondAmount, setDiamondAmount] = useState("");

  // Announcement
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [sendingAnn, setSendingAnn] = useState(false);

  // Warn modal
  const [warnModal, setWarnModal] = useState(false);
  const [warnTarget, setWarnTarget] = useState<VeeUser | null>(null);
  const [warnReason, setWarnReason] = useState("");

  // Ban reason modal
  const [banModal, setBanModal] = useState(false);
  const [banTarget, setBanTarget] = useState<VeeUser | null>(null);
  const [banReason, setBanReason] = useState("");

  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  useEffect(() => {
    if (!user?.isAdmin) { router.back(); return; }
    loadData();
  }, []);

  useEffect(() => {
    if (!user?.isAdmin) return;
    if (tab === "reports") {
      return firebaseService.subscribeToReports(setReports);
    }
    if (tab === "announcements") {
      return firebaseService.subscribeToAnnouncements(setAnnouncements);
    }
  }, [tab]);

  const loadData = async () => {
    setLoading(true);
    const u = await firebaseService.getAllUsers();
    setUsers(u);
    setLoading(false);
  };

  const handleSearch = async () => {
    const q = searchId.trim();
    if (!q) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const found = await firebaseService.findUserByVeeId(q);
      setSearchResult(found);
    } finally {
      setSearching(false);
    }
  };

  const handleGrantDiamonds = async () => {
    const amt = parseInt(diamondAmount, 10);
    if (!diamondUid.trim() || isNaN(amt) || amt <= 0) return;
    try {
      const targetUser = await firebaseService.findUserByVeeId(diamondUid.trim()) ?? await firebaseService.getUserProfile(diamondUid.trim());
      if (!targetUser) { Alert.alert("Error", "User not found"); return; }
      await firebaseService.grantDiamonds(targetUser.uid, amt);
      Alert.alert("Success", `Granted ${amt} 💎 to ${targetUser.displayName}`);
      setDiamondUid(""); setDiamondAmount("");
      loadData();
    } catch {
      Alert.alert("Error", "Failed to grant diamonds");
    }
  };

  const handleToggleAdmin = async (u: VeeUser) => {
    Alert.alert(
      u.isAdmin ? "Remove Admin" : "Make Admin",
      `${u.isAdmin ? "Remove admin from" : "Make"} ${u.displayName}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: async () => {
          try {
            await firebaseService.setAdminRole(u.uid, !u.isAdmin);
            setUsers((prev) => prev.map((x) => x.uid === u.uid ? { ...x, isAdmin: !u.isAdmin, role: !u.isAdmin ? "admin" : "user" } : x));
          } catch {
            Alert.alert("Action blocked", ADMIN_WRITE_HINT);
          }
        }},
      ]
    );
  };

  const handleSendBadge = async (u: VeeUser) => {
    Alert.alert("Send Badge", `Choose a badge for ${u.displayName}`, [
      ...BADGE_PRESETS.map((b) => ({
        text: `${b.icon} ${b.name}`,
        onPress: async () => {
          try {
            await firebaseService.sendBadge(u.uid, { id: b.id, name: b.name, color: b.color, icon: b.icon });
            Alert.alert("Done", `${b.icon} ${b.name} badge sent!`);
          } catch {
            Alert.alert("Action blocked", ADMIN_WRITE_HINT);
          }
        },
      })),
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSendFrame = async (u: VeeUser) => {
    Alert.alert("Send Frame", `Choose an avatar frame for ${u.displayName}`, [
      ...FRAME_PRESETS.map((f) => ({
        text: f.name,
        onPress: async () => {
          try {
            await firebaseService.grantFrame(u.uid, { id: f.id, name: f.name, url: f.color });
            Alert.alert("Done", `${f.name} frame sent!`);
          } catch {
            Alert.alert("Action blocked", ADMIN_WRITE_HINT);
          }
        },
      })),
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleWarn = (u: VeeUser) => {
    setWarnTarget(u);
    setWarnReason("");
    setWarnModal(true);
  };

  const confirmWarn = async () => {
    if (!warnTarget || !warnReason.trim()) return;
    try {
      await firebaseService.warnUser(warnTarget.uid, user!.uid, user!.displayName, warnReason.trim());
      Alert.alert("Done", `Warning sent to ${warnTarget.displayName}`);
      setWarnModal(false);
      loadData();
    } catch {
      Alert.alert("Action blocked", ADMIN_WRITE_HINT);
    }
  };

  const handleBan = (u: VeeUser) => {
    setBanTarget(u);
    setBanReason("");
    setBanModal(true);
  };

  const confirmBan = async () => {
    if (!banTarget) return;
    try {
      await firebaseService.banUser(banTarget.uid, banReason.trim());
      Alert.alert("Done", `${banTarget.displayName} has been banned`);
      setBanModal(false);
      setUsers((prev) => prev.map((x) => x.uid === banTarget.uid ? { ...x, isBanned: true } : x));
    } catch {
      Alert.alert("Action blocked", ADMIN_WRITE_HINT);
    }
  };

  const handleUnban = async (u: VeeUser) => {
    Alert.alert("Unban User", `Unban ${u.displayName}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Unban", onPress: async () => {
        try {
          await firebaseService.unbanUser(u.uid);
          setUsers((prev) => prev.map((x) => x.uid === u.uid ? { ...x, isBanned: false } : x));
        } catch {
          Alert.alert("Action blocked", ADMIN_WRITE_HINT);
        }
      }},
    ]);
  };

  const handleSendAnnouncement = async () => {
    if (!annTitle.trim() || !annBody.trim()) return;
    setSendingAnn(true);
    try {
      await firebaseService.sendAnnouncement(annTitle.trim(), annBody.trim(), user!.uid, user!.displayName);
      Alert.alert("Sent", "Announcement delivered!");
      setAnnTitle(""); setAnnBody("");
    } finally {
      setSendingAnn(false);
    }
  };

  const handleResolveReport = async (r: UserReport, status: "reviewed" | "dismissed") => {
    await firebaseService.resolveReport(r.id, status);
    setReports((prev) => prev.map((x) => x.id === r.id ? { ...x, status } : x));
  };

  const renderUser = (u: VeeUser) => (
    <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <UserAvatar uri={u.avatar} size={44} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <View style={styles.nameRow}>
          <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{u.displayName}</Text>
          {u.isAdmin && <View style={[styles.badge, { backgroundColor: colors.gold + "33" }]}><Text style={[styles.badgeText, { color: colors.gold }]}>ADMIN</Text></View>}
          {u.isBanned && <View style={[styles.badge, { backgroundColor: colors.destructive + "33" }]}><Text style={[styles.badgeText, { color: colors.destructive }]}>BANNED</Text></View>}
          {u.warnings > 0 && <View style={[styles.badge, { backgroundColor: colors.primary + "22" }]}><Text style={[styles.badgeText, { color: colors.primary }]}>⚠️{u.warnings}</Text></View>}
        </View>
        <Text style={[styles.uid, { color: colors.mutedForeground }]}>{u.veeId} · 💎{u.diamonds} · 🪙{u.coins}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => handleToggleAdmin(u)}>
          <Feather name="shield" size={18} color={u.isAdmin ? colors.gold : colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleSendBadge(u)}>
          <Feather name="award" size={18} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleSendFrame(u)}>
          <Feather name="aperture" size={18} color={colors.teal} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleWarn(u)}>
          <Feather name="alert-triangle" size={18} color={colors.gold} />
        </TouchableOpacity>
        {!u.isBanned ? (
          user?.uid !== u.uid && (
            <TouchableOpacity onPress={() => handleBan(u)}>
              <Feather name="slash" size={18} color={colors.destructive} />
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity onPress={() => handleUnban(u)}>
            <Feather name="check-circle" size={18} color={colors.teal} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["users", "reports", "announcements"] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tabItem, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]} onPress={() => setTab(t)}>
            <Text style={[styles.tabLabel, { color: tab === t ? colors.primary : colors.mutedForeground }]}>
              {t === "users" ? "👥 Users" : t === "reports" ? "🚩 Reports" : "📢 Announce"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* USERS TAB */}
      {tab === "users" && (
        <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 16 }} showsVerticalScrollIndicator={false}>
          {/* Search */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>🔍 Search User by Vee ID</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
                placeholder="Vee ID (e.g. v123456)"
                placeholderTextColor={colors.mutedForeground}
                value={searchId}
                onChangeText={setSearchId}
                autoCapitalize="none"
              />
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleSearch}>
                {searching ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="search" size={18} color="#fff" />}
              </TouchableOpacity>
            </View>
            {searchResult && renderUser(searchResult)}
            {searching === false && searchId && !searchResult && (
              <Text style={[styles.noResult, { color: colors.mutedForeground }]}>No user found</Text>
            )}
          </View>

          {/* Grant Diamonds */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>💎 Grant Diamonds</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
              placeholder="Vee ID or UID"
              placeholderTextColor={colors.mutedForeground}
              value={diamondUid}
              onChangeText={setDiamondUid}
              autoCapitalize="none"
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
                placeholder="Amount"
                placeholderTextColor={colors.mutedForeground}
                value={diamondAmount}
                onChangeText={setDiamondAmount}
                keyboardType="number-pad"
              />
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleGrantDiamonds}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Grant</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* User List */}
          <Text style={[styles.listTitle, { color: colors.text }]}>All Users ({users.length})</Text>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : (
            <View style={{ gap: 8, paddingHorizontal: 16 }}>
              {users.map((u) => <View key={u.uid}>{renderUser(u)}</View>)}
            </View>
          )}
        </ScrollView>
      )}

      {/* REPORTS TAB */}
      {tab === "reports" && (
        <FlatList
          data={reports}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 16, gap: 10 }}
          ListEmptyComponent={() => (
            <View style={styles.emptyBox}>
              <Feather name="check-circle" size={36} color={colors.teal} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No pending reports</Text>
            </View>
          )}
          renderItem={({ item: r }) => (
            <View style={[styles.reportCard, { backgroundColor: colors.card, borderColor: r.status === "pending" ? colors.destructive + "55" : colors.border }]}>
              <Text style={[styles.reportTitle, { color: colors.text }]}>
                {r.reporterName} reported {r.reportedName}
              </Text>
              <Text style={[styles.reportReason, { color: colors.primary }]}>Reason: {r.reason}</Text>
              {r.description ? <Text style={[styles.reportDesc, { color: colors.mutedForeground }]}>{r.description}</Text> : null}
              <Text style={[styles.reportStatus, { color: r.status === "pending" ? colors.destructive : colors.teal }]}>
                Status: {r.status.toUpperCase()}
              </Text>
              {r.status === "pending" && (
                <View style={styles.reportActions}>
                  <TouchableOpacity
                    style={[styles.reportBtn, { backgroundColor: colors.teal + "33" }]}
                    onPress={() => handleResolveReport(r, "reviewed")}
                  >
                    <Text style={{ color: colors.teal, fontWeight: "700", fontSize: 13 }}>Mark Reviewed</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reportBtn, { backgroundColor: colors.secondary }]}
                    onPress={() => handleResolveReport(r, "dismissed")}
                  >
                    <Text style={{ color: colors.mutedForeground, fontWeight: "600", fontSize: 13 }}>Dismiss</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reportBtn, { backgroundColor: colors.destructive + "22" }]}
                    onPress={() => handleBan({ uid: r.reportedUid, displayName: r.reportedName } as VeeUser)}
                  >
                    <Text style={{ color: colors.destructive, fontWeight: "700", fontSize: 13 }}>Ban User</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* ANNOUNCEMENTS TAB */}
      {tab === "announcements" && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 16, gap: 12 }}>
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>📢 Send Announcement</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
              placeholder="Title"
              placeholderTextColor={colors.mutedForeground}
              value={annTitle}
              onChangeText={setAnnTitle}
              maxLength={60}
            />
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
              placeholder="Message body…"
              placeholderTextColor={colors.mutedForeground}
              value={annBody}
              onChangeText={setAnnBody}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.fullBtn, { backgroundColor: colors.primary, opacity: sendingAnn ? 0.7 : 1 }]}
              onPress={handleSendAnnouncement}
              disabled={sendingAnn}
            >
              {sendingAnn ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Send Announcement</Text>}
            </TouchableOpacity>
          </View>

          <Text style={[styles.listTitle, { color: colors.text }]}>Past Announcements</Text>
          {announcements.map((a) => (
            <View key={a.id} style={[styles.annCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.annTitle, { color: colors.text }]}>{a.title}</Text>
              <Text style={[styles.annBody, { color: colors.mutedForeground }]}>{a.body}</Text>
              <Text style={[styles.annMeta, { color: colors.mutedForeground }]}>
                Sent by {a.sentByName} · {new Date(a.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Warn Modal */}
      <Modal visible={warnModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Warn {warnTarget?.displayName}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
              placeholder="Reason for warning…"
              placeholderTextColor={colors.mutedForeground}
              value={warnReason}
              onChangeText={setWarnReason}
              multiline
            />
            <View style={styles.row}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.secondary }]} onPress={() => setWarnModal(false)}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.gold }]} onPress={confirmWarn}>
                <Text style={{ color: "#000", fontWeight: "700" }}>Send Warning</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Ban Modal */}
      <Modal visible={banModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Ban {banTarget?.displayName}?</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
              placeholder="Ban reason (optional)…"
              placeholderTextColor={colors.mutedForeground}
              value={banReason}
              onChangeText={setBanReason}
            />
            <View style={styles.row}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.secondary }]} onPress={() => setBanModal(false)}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.destructive }]} onPress={confirmBan}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Ban User</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabLabel: { fontSize: 13, fontWeight: "700" },
  section: { margin: 16, marginBottom: 0, borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "800", marginBottom: 2 },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, height: 46, fontSize: 14 },
  textArea: { height: 80, paddingTop: 12 },
  actionBtn: { width: 46, height: 46, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  fullBtn: { borderRadius: 12, height: 48, alignItems: "center", justifyContent: "center" },
  listTitle: { fontSize: 14, fontWeight: "800", paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  userCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, padding: 10 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  userName: { fontSize: 14, fontWeight: "700" },
  badge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  badgeText: { fontSize: 9, fontWeight: "900" },
  uid: { fontSize: 11, marginTop: 2 },
  actions: { flexDirection: "row", gap: 14, alignItems: "center" },
  noResult: { fontSize: 13, textAlign: "center", marginTop: 8 },
  reportCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  reportTitle: { fontSize: 14, fontWeight: "700" },
  reportReason: { fontSize: 13, fontWeight: "600" },
  reportDesc: { fontSize: 12 },
  reportStatus: { fontSize: 11, fontWeight: "800" },
  reportActions: { flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" },
  reportBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  annCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  annTitle: { fontSize: 14, fontWeight: "800" },
  annBody: { fontSize: 13 },
  annMeta: { fontSize: 11 },
  emptyBox: { alignItems: "center", gap: 10, paddingTop: 60 },
  emptyText: { fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: "#00000088", alignItems: "center", justifyContent: "center" },
  modalCard: { width: "85%", borderRadius: 16, borderWidth: 1, padding: 20, gap: 12 },
  modalTitle: { fontSize: 17, fontWeight: "800" },
  modalBtn: { flex: 1, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
