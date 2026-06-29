import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { firebaseService } from "@/services/firebase";
import { VeeUser } from "@/types";
import { UserAvatar } from "@/components/UserAvatar";
import { HonorBadge } from "@/components/HonorBadge";

const REPORT_REASONS = [
  "Inappropriate behavior",
  "Harassment / Bullying",
  "Spam",
  "Fake account",
  "Hate speech",
  "Other",
];

export default function UserProfileScreen() {
  const colors = useColors();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { user: me } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<VeeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reportSending, setReportSending] = useState(false);

  const isMe = uid === me?.uid;

  useEffect(() => {
    if (!uid) return;
    firebaseService.getUserProfile(uid).then((p) => {
      setProfile(p);
      if (p && me) {
        setIsFollowing(p.followers.includes(me.uid));
      }
      setLoading(false);
    });
  }, [uid]);

  const handleFollow = async () => {
    if (!me || !profile) return;
    setActionLoading(true);
    try {
      if (isFollowing) {
        await firebaseService.unfollowUser(me.uid, profile.uid);
        setIsFollowing(false);
        setProfile((prev) => prev ? { ...prev, followersCount: prev.followersCount - 1 } : prev);
      } else {
        await firebaseService.followUser(me.uid, profile.uid);
        setIsFollowing(true);
        setProfile((prev) => prev ? { ...prev, followersCount: prev.followersCount + 1 } : prev);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = () => {
    if (!profile) return;
    router.push(`/chat/${profile.uid}`);
  };

  const handleSendFriendRequest = async () => {
    if (!me || !profile) return;
    setActionLoading(true);
    try {
      await firebaseService.sendFriendRequest(me, profile.uid);
      Alert.alert("Sent!", `Friend request sent to ${profile.displayName}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReport = async () => {
    if (!me || !profile || !reportReason) return;
    setReportSending(true);
    try {
      await firebaseService.sendReport(
        me.uid, me.displayName,
        profile.uid, profile.displayName,
        reportReason, reportDesc.trim()
      );
      Alert.alert("Reported", "Thank you for your report. Our team will review it.");
      setReportModal(false);
      setReportReason("");
      setReportDesc("");
    } finally {
      setReportSending(false);
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Feather name="user-x" size={40} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>User not found</Text>
      </View>
    );
  }

  const stats = [
    { label: "Level", value: `Lv.${profile.level}` },
    { label: "Followers", value: profile.followersCount },
    { label: "Following", value: profile.followingCount },
    { label: "Gifts", value: profile.totalGiftsSent },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 24 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[colors.primary + "44", colors.background]} style={styles.heroBg} />

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <UserAvatar uri={profile.avatar} size={96} borderColor={colors.primary} borderWidth={3} />
          <Text style={[styles.displayName, { color: colors.text }]}>{profile.displayName}</Text>
          <Text style={[styles.veeId, { color: colors.primary }]}>{profile.veeId}</Text>
          {profile.bio ? (
            <Text style={[styles.bio, { color: colors.mutedForeground }]}>{profile.bio}</Text>
          ) : null}
          {profile.isBanned && (
            <View style={[styles.bannedTag, { backgroundColor: colors.destructive + "33" }]}>
              <Text style={[styles.bannedText, { color: colors.destructive }]}>BANNED</Text>
            </View>
          )}
          {/* Badges */}
          {profile.honorBadges.length > 0 && (
            <View style={styles.badges}>
              {profile.honorBadges.slice(0, 5).map((b) => (
                <HonorBadge key={b.id} badge={b} />
              ))}
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {stats.map((s) => (
            <View key={s.label} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Action buttons */}
        {!isMe && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: isFollowing ? colors.secondary : colors.primary, flex: 1 }]}
              onPress={handleFollow}
              disabled={actionLoading}
            >
              <Feather name={isFollowing ? "user-check" : "user-plus"} size={16} color={isFollowing ? colors.text : "#fff"} />
              <Text style={[styles.actionBtnText, { color: isFollowing ? colors.text : "#fff" }]}>
                {isFollowing ? "Following" : "Follow"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, flex: 1 }]}
              onPress={handleMessage}
            >
              <Feather name="message-circle" size={16} color={colors.text} />
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Message</Text>
            </TouchableOpacity>

            {!isFollowing && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, flex: 1 }]}
                onPress={handleSendFriendRequest}
                disabled={actionLoading}
              >
                <Feather name="user-plus" size={16} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>Add Friend</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Wallet info */}
        <View style={[styles.walletCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.walletItem}>
            <Text style={styles.walletEmoji}>💎</Text>
            <View>
              <Text style={[styles.walletValue, { color: colors.text }]}>{profile.totalGiftsSent}</Text>
              <Text style={[styles.walletLabel, { color: colors.mutedForeground }]}>Gifts Sent</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.walletItem}>
            <Text style={styles.walletEmoji}>🎁</Text>
            <View>
              <Text style={[styles.walletValue, { color: colors.text }]}>{profile.totalGiftsReceived}</Text>
              <Text style={[styles.walletLabel, { color: colors.mutedForeground }]}>Gifts Received</Text>
            </View>
          </View>
        </View>

        {/* Report button */}
        {!isMe && (
          <TouchableOpacity
            style={[styles.reportBtn, { borderColor: colors.destructive + "44" }]}
            onPress={() => setReportModal(true)}
          >
            <Feather name="flag" size={15} color={colors.destructive} />
            <Text style={[styles.reportBtnText, { color: colors.destructive }]}>Report User</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Report Modal */}
      <Modal visible={reportModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Report {profile.displayName}</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>Select a reason:</Text>

            <ScrollView style={{ maxHeight: 220 }}>
              {REPORT_REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.reasonRow, { borderColor: reportReason === r ? colors.primary : colors.border }]}
                  onPress={() => setReportReason(r)}
                >
                  <View style={[styles.radioOuter, { borderColor: reportReason === r ? colors.primary : colors.border }]}>
                    {reportReason === r && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Text style={[styles.reasonText, { color: colors.text }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
              placeholder="Additional details (optional)…"
              placeholderTextColor={colors.mutedForeground}
              value={reportDesc}
              onChangeText={setReportDesc}
              multiline
              maxLength={300}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.secondary }]} onPress={() => setReportModal(false)}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: reportReason ? colors.destructive : colors.border }]}
                onPress={handleReport}
                disabled={!reportReason || reportSending}
              >
                {reportSending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Submit Report</Text>
                )}
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
  heroBg: { position: "absolute", top: 0, left: 0, right: 0, height: 220 },
  avatarSection: { alignItems: "center", paddingTop: 24, paddingBottom: 16 },
  displayName: { fontSize: 22, fontWeight: "800", marginTop: 12 },
  veeId: { fontSize: 14, fontWeight: "600", marginTop: 4 },
  bio: { fontSize: 14, marginTop: 8, textAlign: "center", paddingHorizontal: 40 },
  bannedTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  bannedText: { fontSize: 11, fontWeight: "900" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10, justifyContent: "center", paddingHorizontal: 24 },
  statsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 14 },
  statBox: { flex: 1, alignItems: "center", padding: 10, borderRadius: 12, borderWidth: 1 },
  statValue: { fontSize: 16, fontWeight: "800" },
  statLabel: { fontSize: 10, marginTop: 3, fontWeight: "500" },
  actionRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 14 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  actionBtnText: { fontSize: 13, fontWeight: "700" },
  walletCard: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    alignItems: "center",
  },
  walletItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  walletEmoji: { fontSize: 22 },
  walletValue: { fontSize: 18, fontWeight: "800" },
  walletLabel: { fontSize: 11, marginTop: 1 },
  divider: { width: 1, height: 36, marginHorizontal: 10 },
  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    marginTop: 4,
  },
  reportBtnText: { fontSize: 14, fontWeight: "600" },
  notFoundText: { fontSize: 16, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: "#00000099", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 20, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  modalSub: { fontSize: 13 },
  reasonRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 0.5, paddingHorizontal: 4 },
  radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 9, height: 9, borderRadius: 5 },
  reasonText: { fontSize: 14 },
  modalInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, height: 72, paddingTop: 10, fontSize: 14, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 10 },
  modalBtn: { flex: 1, height: 46, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
