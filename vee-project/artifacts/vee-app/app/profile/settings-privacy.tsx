import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
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

export default function SettingsPrivacyScreen() {
  const colors = useColors();
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [allowRequests, setAllowRequests] = useState(user?.allowFriendRequests ?? true);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const toggleAllowRequests = async (next: boolean) => {
    setAllowRequests(next);
    setSaving(true);
    try {
      await firebaseService.updateUserProfile(user.uid, { allowFriendRequests: next });
    } catch {
      setAllowRequests(!next);
      Alert.alert("Couldn't save", "Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => logout() },
    ]);
  };

  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 16 }}
    >
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PRIVACY</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Allow friend requests</Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
              Let others send you a friend request by Vee ID
            </Text>
          </View>
          <Switch
            value={allowRequests}
            onValueChange={toggleAllowRequests}
            disabled={saving}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACCOUNT</Text>
      <View style={{ gap: 10 }}>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/profile/edit")}
        >
          <Feather name="edit-2" size={20} color={colors.text} />
          <Text style={[styles.menuLabel, { color: colors.text }]}>Edit Profile</Text>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/friends/search")}
        >
          <Feather name="user-plus" size={20} color={colors.text} />
          <Text style={[styles.menuLabel, { color: colors.text }]}>Find Friends</Text>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
        {user.isAdmin && (
          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.gold + "55" }]}
            onPress={() => router.push("/admin")}
          >
            <Feather name="shield" size={20} color={colors.gold} />
            <Text style={[styles.menuLabel, { color: colors.gold }]}>Admin Panel</Text>
            <Feather name="chevron-right" size={18} color={colors.gold} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ABOUT</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.infoRow}>
          <Text style={[styles.rowTitle, { color: colors.text }]}>Vee ID</Text>
          <Text style={[styles.infoValue, { color: colors.primary }]}>{user.veeId}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.destructive + "44", marginTop: 20 }]}
        onPress={confirmLogout}
      >
        <Feather name="log-out" size={20} color={colors.destructive} />
        <Text style={[styles.menuLabel, { color: colors.destructive }]}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.8, marginTop: 18, marginBottom: 10 },
  card: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14 },
  switchRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  rowTitle: { fontSize: 15, fontWeight: "600" },
  rowSub: { fontSize: 12, marginTop: 3 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600" },
  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16 },
  infoValue: { fontSize: 14, fontWeight: "700" },
});
