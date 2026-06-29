import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";
import { HonorBadge } from "@/components/HonorBadge";
import { LevelBadge } from "@/components/LevelBadge";
import { getLevelProgress } from "@/constants/config";

export default function ProfileScreen() {
  const colors = useColors();
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  if (!user) return null;

  const bottomPadding = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  const lvlInfo = getLevelProgress(user.experience);
  const stats = [
    { label: "Followers", value: user.followersCount ?? user.followers.length },
    { label: "Following", value: user.followingCount ?? user.following.length },
    { label: "Gifts Sent", value: user.totalGiftsSent },
    { label: "Gifts Recv", value: user.totalGiftsReceived },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomPadding + 16 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[colors.primary + "44", colors.background]} style={styles.heroBg} />

        {/* Avatar + name */}
        <Animated.View style={[styles.avatarSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.avatarRingOuter}>
            <Animated.View style={[styles.animatedRing, { borderColor: colors.primary, transform: [{ scale: pulseAnim }] }]} />
            <LinearGradient
              colors={[colors.gold, colors.pink]}
              style={styles.avatarBorderGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.avatarInner, { backgroundColor: colors.background }]}>
                <UserAvatar uri={user.avatar} size={86} />
              </View>
            </LinearGradient>
          </View>

          <View style={styles.nameRow}>
            <Text style={[styles.displayName, { color: colors.text }]}>{user.displayName}</Text>
            <LevelBadge level={user.level} />
          </View>
          <Text style={[styles.veeId, { color: colors.primary }]}>{user.veeId}</Text>
          {user.bio ? <Text style={[styles.bio, { color: colors.mutedForeground }]}>{user.bio}</Text> : null}

          {/* Honor Badges */}
          {user.honorBadges.length > 0 && (
            <View style={styles.badges}>
              {user.honorBadges.slice(0, 5).map((b) => <HonorBadge key={b.id} badge={b} />)}
            </View>
          )}
        </Animated.View>

        {/* Level Progress Bar */}
        <View style={[styles.levelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.levelHeader}>
            <Text style={[styles.levelTitle, { color: colors.text }]}>Level {user.level}</Text>
            <Text style={[styles.levelXP, { color: colors.mutedForeground }]}>
              {user.experience.toLocaleString()} / {lvlInfo.nextXP.toLocaleString()} XP
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.secondary }]}>
            <LinearGradient
              colors={[colors.primary, colors.gold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${Math.round(lvlInfo.progress * 100)}%` as `${number}%` }]}
            />
          </View>
          <Text style={[styles.nextLevel, { color: colors.mutedForeground }]}>
            {Math.round((1 - lvlInfo.progress) * (lvlInfo.nextXP - lvlInfo.currentXP)).toLocaleString()} XP to Level {user.level + 1}
          </Text>
        </View>

        {/* Stats */}
        <Animated.View style={[styles.statsRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {stats.map((s) => (
            <View key={s.label} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>{s.value.toLocaleString()}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Balance Card */}
        <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.balanceItem}>
            <Feather name="zap" size={20} color={colors.primary} />
            <View>
              <Text style={[styles.balValue, { color: colors.text }]}>{user.diamonds.toLocaleString()}</Text>
              <Text style={[styles.balLabel, { color: colors.mutedForeground }]}>Diamonds</Text>
            </View>
          </View>
          <View style={[styles.balDivider, { backgroundColor: colors.border }]} />
          <View style={styles.balanceItem}>
            <Feather name="star" size={20} color={colors.gold} />
            <View>
              <Text style={[styles.balValue, { color: colors.text }]}>{user.coins.toLocaleString()}</Text>
              <Text style={[styles.balLabel, { color: colors.mutedForeground }]}>Coins</Text>
            </View>
          </View>
          <View style={[styles.balDivider, { backgroundColor: colors.border }]} />
          <View style={styles.balanceItem}>
            <Feather name="bar-chart-2" size={20} color={colors.teal} />
            <View>
              <Text style={[styles.balValue, { color: colors.text }]}>Lv.{user.level}</Text>
              <Text style={[styles.balLabel, { color: colors.mutedForeground }]}>Level</Text>
            </View>
          </View>
        </View>

        {/* Menu */}
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push("/friends/search")}>
            <Feather name="user-plus" size={20} color={colors.text} />
            <Text style={[styles.menuLabel, { color: colors.text }]}>Find Friends</Text>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push("/profile/edit")}>
            <Feather name="edit-2" size={20} color={colors.text} />
            <Text style={[styles.menuLabel, { color: colors.text }]}>Edit Profile</Text>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push("/profile/settings-privacy")}>
            <Feather name="settings" size={20} color={colors.text} />
            <Text style={[styles.menuLabel, { color: colors.text }]}>Settings & Privacy</Text>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>

          {user.isAdmin && (
            <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.gold + "55" }]} onPress={() => router.push("/admin")}>
              <Feather name="shield" size={20} color={colors.gold} />
              <Text style={[styles.menuLabel, { color: colors.gold }]}>Admin Panel</Text>
              <Feather name="chevron-right" size={18} color={colors.gold} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.destructive + "44" }]} onPress={logout}>
            <Feather name="log-out" size={20} color={colors.destructive} />
            <Text style={[styles.menuLabel, { color: colors.destructive }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 24, fontWeight: "800" },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  heroBg: { position: "absolute", top: 0, left: 0, right: 0, height: 220 },
  avatarSection: { alignItems: "center", paddingTop: 28, paddingBottom: 20 },
  avatarRingOuter: { position: "relative", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  animatedRing: { position: "absolute", width: 108, height: 108, borderRadius: 54, borderWidth: 2, opacity: 0.4 },
  avatarBorderGradient: { width: 100, height: 100, borderRadius: 50, padding: 3 },
  avatarInner: { flex: 1, borderRadius: 47, overflow: "hidden" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  displayName: { fontSize: 22, fontWeight: "800" },
  veeId: { fontSize: 14, fontWeight: "600" },
  bio: { fontSize: 14, marginTop: 8, textAlign: "center", paddingHorizontal: 40 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10, paddingHorizontal: 16 },
  levelCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  levelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  levelTitle: { fontSize: 15, fontWeight: "800" },
  levelXP: { fontSize: 12, fontWeight: "600" },
  progressTrack: { height: 10, borderRadius: 5, overflow: "hidden" },
  progressFill: { height: 10, borderRadius: 5 },
  nextLevel: { fontSize: 11, textAlign: "center" },
  statsRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  statBox: { flex: 1, alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1 },
  statValue: { fontSize: 16, fontWeight: "800" },
  statLabel: { fontSize: 10, marginTop: 3, fontWeight: "500" },
  balanceCard: { flexDirection: "row", marginHorizontal: 16, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20, alignItems: "center" },
  balanceItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  balDivider: { width: 1, height: 36, marginHorizontal: 8 },
  balValue: { fontSize: 17, fontWeight: "800" },
  balLabel: { fontSize: 11, marginTop: 2 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, borderWidth: 1 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600" },
});
