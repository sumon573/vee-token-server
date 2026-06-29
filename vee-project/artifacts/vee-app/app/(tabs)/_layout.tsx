import { Tabs, useRouter, usePathname } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";

const TAB_ITEMS = [
  { key: "inbox", label: "Inbox", path: "/inbox" },
  { key: "index", label: "Voice Room", path: "/" },
  { key: "contacts", label: "Contacts", path: "/contacts" },
] as const;

function TopBar() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const topPad = insets.top + (Platform.OS === "web" ? 16 : 8);

  return (
    <View
      style={[
        styles.bar,
        { paddingTop: topPad, backgroundColor: colors.background, borderBottomColor: colors.border },
      ]}
    >
      <TouchableOpacity
        onPress={() => router.navigate("/me")}
        activeOpacity={0.8}
        style={styles.avatarBtn}
      >
        <UserAvatar uri={user?.avatar} size={36} borderColor={colors.primary} borderWidth={2} />
      </TouchableOpacity>

      <View style={styles.pills}>
        {TAB_ITEMS.map((t) => {
          const active = pathname === t.path;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.pill, { backgroundColor: active ? colors.primary : colors.secondary }]}
              onPress={() => router.navigate(t.path)}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.pillText, { color: active ? "#fff" : colors.mutedForeground }]}
                numberOfLines={1}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        onPress={() => router.navigate("/leaderboard")}
        style={styles.iconBtn}
        activeOpacity={0.8}
      >
        <Feather name="award" size={22} color={colors.gold} />
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const colors = useColors();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading || !isAuthenticated) return null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar />
      <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }} tabBar={() => null}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="inbox" />
        <Tabs.Screen name="contacts" />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  avatarBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  pills: { flex: 1, flexDirection: "row", gap: 6 },
  pill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: { fontSize: 13, fontWeight: "700" },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
});
