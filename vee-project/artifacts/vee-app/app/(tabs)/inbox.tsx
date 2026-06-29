import React, { useEffect, useRef, useState } from "react";
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
import { FriendRequest, PrivateChat } from "@/types";
import { UserAvatar } from "@/components/UserAvatar";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

export default function InboxScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState<PrivateChat[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"chats" | "requests">("chats");
  const unsubChats = useRef<(() => void) | null>(null);
  const unsubReqs = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    unsubChats.current = firebaseService.subscribeToUserChats(user.uid, (data) => {
      setChats(data);
      setLoading(false);
    });
    unsubReqs.current = firebaseService.subscribeToFriendRequests(user.uid, setRequests);
    return () => {
      unsubChats.current?.();
      unsubReqs.current?.();
    };
  }, [user?.uid]);

  const handleAccept = async (req: FriendRequest) => {
    if (!user) return;
    await firebaseService.acceptFriendRequest(user.uid, req.fromUid);
  };

  const handleReject = async (req: FriendRequest) => {
    if (!user) return;
    await firebaseService.rejectFriendRequest(user.uid, req.fromUid);
  };

  const topPadding = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPadding = insets.bottom + (Platform.OS === "web" ? 34 : 60);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>Inbox</Text>
      </View>

      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "chats" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setTab("chats")}
        >
          <Text style={[styles.tabLabel, { color: tab === "chats" ? colors.primary : colors.mutedForeground }]}>
            Messages
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "requests" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setTab("requests")}
        >
          <Text style={[styles.tabLabel, { color: tab === "requests" ? colors.primary : colors.mutedForeground }]}>
            Requests {requests.length > 0 ? `(${requests.length})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : tab === "chats" ? (
        chats.length === 0 ? (
          <View style={styles.center}>
            <Feather name="message-circle" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No messages yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Find friends and start chatting
            </Text>
            <TouchableOpacity
              style={[styles.searchBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/friends/search")}
            >
              <Text style={styles.searchBtnText}>Find Friends</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={chats}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ paddingBottom: bottomPadding + 16 }}
            renderItem={({ item: chat }) => (
              <TouchableOpacity
                style={[styles.chatItem, { borderBottomColor: colors.border }]}
                onPress={() => router.push(`/chat/${chat.otherUid}`)}
                activeOpacity={0.75}
              >
                <UserAvatar uri={chat.otherUser?.avatar} size={50} />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <View style={styles.chatRow}>
                    <Text style={[styles.chatName, { color: colors.text }]}>
                      {chat.otherUser?.displayName ?? "User"}
                    </Text>
                    <Text style={[styles.chatTime, { color: colors.mutedForeground }]}>
                      {chat.lastTimestamp ? timeAgo(chat.lastTimestamp) : ""}
                    </Text>
                  </View>
                  <Text style={[styles.chatPreview, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {chat.lastMessage ? chat.lastMessage : "Say hi 👋"}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )
      ) : requests.length === 0 ? (
        <View style={styles.center}>
          <Feather name="users" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No friend requests</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding + 16 }}
          renderItem={({ item: req }) => (
            <View
              style={[styles.reqCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <UserAvatar uri={req.fromAvatar} size={46} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.reqName, { color: colors.text }]}>{req.fromName}</Text>
                <Text style={[styles.reqVeeId, { color: colors.primary }]}>{req.fromVeeId}</Text>
              </View>
              <TouchableOpacity
                style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleAccept(req)}
              >
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectBtn, { borderColor: colors.border }]}
                onPress={() => handleReject(req)}
              >
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 24, fontWeight: "800" },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabLabel: { fontSize: 14, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: "700", marginTop: 10 },
  emptyText: { fontSize: 14, textAlign: "center" },
  searchBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 22, marginTop: 8 },
  searchBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  chatItem: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  chatRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chatName: { fontSize: 15, fontWeight: "700" },
  chatTime: { fontSize: 12 },
  chatPreview: { fontSize: 13, marginTop: 3 },
  reqCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  reqName: { fontSize: 15, fontWeight: "700" },
  reqVeeId: { fontSize: 12, marginTop: 2 },
  acceptBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  acceptText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  rejectBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
