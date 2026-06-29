import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { firebaseService } from "@/services/firebase";
import { VeeUser } from "@/types";
import { UserAvatar } from "@/components/UserAvatar";
import { HonorBadge } from "@/components/HonorBadge";

export default function FriendSearchScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  type Relationship = "self" | "friends" | "request-sent" | "request-received" | "none";
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VeeUser | null | "not-found">(null);
  const [status, setStatus] = useState<Relationship | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setStatus(null);
    setIsFollowing(false);
    try {
      const found = await firebaseService.findUserByVeeId(query.trim());
      if (!found) {
        setResult("not-found");
        return;
      }
      setResult(found);
      if (user) {
        setStatus(await firebaseService.getFriendshipStatus(user, found));
        setIsFollowing(user.following.includes(found.uid));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!user || !result || result === "not-found" || busy) return;
    setBusy(true);
    try {
      if (isFollowing) {
        await firebaseService.unfollowUser(user.uid, result.uid);
        setIsFollowing(false);
      } else {
        await firebaseService.followUser(user.uid, result.uid);
        setIsFollowing(true);
      }
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleSendRequest = async () => {
    if (!user || !result || result === "not-found" || busy) return;
    setBusy(true);
    try {
      await firebaseService.sendFriendRequest(user, result.uid);
      setStatus("request-sent");
    } catch (e) {
      Alert.alert(
        "Request not sent",
        e instanceof Error && e.message === "FRIEND_REQUESTS_DISABLED"
          ? "This user isn't accepting friend requests right now."
          : "Something went wrong. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!user || !result || result === "not-found" || busy) return;
    setBusy(true);
    try {
      await firebaseService.acceptFriendRequest(user.uid, result.uid);
      setStatus("friends");
    } catch {
      Alert.alert("Error", "Could not accept the request. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: bottomPad + 16 }]}>
      <View style={styles.searchSection}>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Search by Vee ID (e.g. v123456)
        </Text>
        <View style={styles.searchRow}>
          <View style={[styles.inputWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="at-sign" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Vee ID"
              placeholderTextColor={colors.mutedForeground}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
          </View>
          <TouchableOpacity
            style={[styles.searchBtn, { backgroundColor: colors.primary }]}
            onPress={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Feather name="search" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {result === "not-found" && (
        <View style={styles.center}>
          <Feather name="user-x" size={48} color={colors.mutedForeground} />
          <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>
            No user found with that Vee ID
          </Text>
        </View>
      )}

      {result && result !== "not-found" && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardTop}>
            <UserAvatar uri={result.avatar} size={72} borderColor={colors.primary} borderWidth={2} />
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={[styles.name, { color: colors.text }]}>{result.displayName}</Text>
              <Text style={[styles.veeId, { color: colors.primary }]}>{result.veeId}</Text>
              {result.bio ? (
                <Text style={[styles.bio, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {result.bio}
                </Text>
              ) : null}
            </View>
          </View>

          {result.honorBadges.length > 0 && (
            <View style={styles.badgeRow}>
              {result.honorBadges.slice(0, 4).map((b) => (
                <HonorBadge key={b.id} badge={b} small />
              ))}
            </View>
          )}

          <View style={styles.statsRow}>
            {[
              { label: "Followers", value: result.followers.length },
              { label: "Following", value: result.following.length },
              { label: "Gifts Sent", value: result.totalGiftsSent },
            ].map((s) => (
              <View key={s.label} style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {status && status !== "self" && (
            <View style={styles.actions}>
              {/* Follow / Unfollow */}
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: isFollowing ? colors.secondary : colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={handleToggleFollow}
                disabled={busy}
              >
                <Feather
                  name={isFollowing ? "user-check" : "user-plus"}
                  size={16}
                  color={isFollowing ? colors.mutedForeground : "#fff"}
                />
                <Text style={[styles.actionBtnText, { color: isFollowing ? colors.mutedForeground : "#fff" }]}>
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </TouchableOpacity>

              {/* Friend Request */}
              {status !== "friends" && (
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor:
                        status === "request-sent"
                          ? colors.secondary
                          : status === "request-received"
                          ? colors.primary
                          : colors.card,
                      borderColor: status === "request-sent" ? colors.border : colors.primary,
                    },
                  ]}
                  onPress={status === "request-received" ? handleAcceptRequest : handleSendRequest}
                  disabled={status === "request-sent" || busy}
                >
                  <Feather
                    name={status === "request-received" ? "check" : "user-plus"}
                    size={16}
                    color={
                      status === "request-sent"
                        ? colors.mutedForeground
                        : status === "request-received"
                        ? "#fff"
                        : colors.primary
                    }
                  />
                  <Text
                    style={[
                      styles.actionBtnText,
                      {
                        color:
                          status === "request-sent"
                            ? colors.mutedForeground
                            : status === "request-received"
                            ? "#fff"
                            : colors.primary,
                      },
                    ]}
                  >
                    {status === "request-sent" ? "Request Sent" : status === "request-received" ? "Accept Request" : "Friend Request"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchSection: { padding: 16 },
  hint: { fontSize: 13, marginBottom: 10 },
  searchRow: { flexDirection: "row", gap: 10 },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  input: { flex: 1, fontSize: 15 },
  searchBtn: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFoundText: { fontSize: 15, textAlign: "center" },
  card: { marginHorizontal: 16, borderRadius: 20, borderWidth: 1, padding: 20 },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  name: { fontSize: 20, fontWeight: "800" },
  veeId: { fontSize: 14, fontWeight: "600", marginTop: 3 },
  bio: { fontSize: 13, marginTop: 6 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  statsRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 18 },
  stat: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 12, marginTop: 2 },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 13,
  },
  actionBtnText: { fontWeight: "700", fontSize: 14 },
});
