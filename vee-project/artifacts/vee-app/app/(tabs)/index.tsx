import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useRoom } from "@/contexts/RoomContext";
import { firebaseService } from "@/services/firebase";
import { cloudinaryService } from "@/services/cloudinary";
import { VeeUser, VoiceRoom } from "@/types";
import { RoomCard } from "@/components/RoomCard";
import { UserAvatar } from "@/components/UserAvatar";
import { FloatingRoom } from "@/components/FloatingRoom";

const TAGS = ["Music", "Chat", "Gaming", "Study", "Dating", "Business", "Sport", "Comedy"];

export default function HomeScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const { currentRoom, isMinimized, setMinimized } = useRoom();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<VeeUser | null>(null);
  const [roomResult, setRoomResult] = useState<VoiceRoom | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const unsubRoomsRef = useRef<(() => void) | null>(null);

  // Create Room modal state
  const [createModal, setCreateModal] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomTopic, setRoomTopic] = useState("");
  const [roomDesc, setRoomDesc] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    unsubRoomsRef.current = firebaseService.subscribeToActiveRooms((data) => {
      setRooms(data);
      setLoading(false);
    });
    return () => {
      unsubRoomsRef.current?.();
    };
  }, [user?.uid]);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchResult(null);
    setRoomResult(null);
    setSearchError("");
    try {
      // All-digit queries are treated as a global room-number lookup; anything
      // else is a Vee ID user search.
      if (/^\d{4,}$/.test(q)) {
        const room = await firebaseService.getRoomById(q);
        if (room) {
          setRoomResult(room);
        } else {
          setSearchError(`No room found with number ${q}`);
        }
        return;
      }
      const found = await firebaseService.findUserByVeeId(q);
      if (found) {
        setSearchResult(found);
      } else {
        setSearchError("No user found with that Vee ID");
      }
    } catch {
      setSearchError("Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResult(null);
    setRoomResult(null);
    setSearchError("");
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handlePickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setUploadingCover(true);
    try {
      const url = await cloudinaryService.uploadImage(result.assets[0].uri, "vee/rooms");
      if (!url) throw new Error("No URL returned");
      setCoverImage(url);
    } catch {
      Alert.alert("Upload Failed", "Could not upload image. Check your internet connection and try again.");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleCreate = async () => {
    if (!user || !roomName.trim() || creating) return;
    setCreating(true);
    try {
      const roomId = await firebaseService.createRoom(
        user,
        roomName.trim(),
        roomDesc.trim(),
        selectedTags,
        { topic: roomTopic.trim(), coverImage: coverImage || undefined }
      );
      if (isLocked) {
        await firebaseService.updateRoom(roomId, { isLocked: true });
      }
      setCreateModal(false);
      setRoomName("");
      setRoomTopic("");
      setRoomDesc("");
      setCoverImage("");
      setSelectedTags([]);
      setIsLocked(false);
      router.push(`/room/${roomId}`);
    } catch (e) {
      Alert.alert("Couldn't create room", "Please try again in a moment.");
    } finally {
      setCreating(false);
    }
  };

  const bottomPadding = insets.bottom + (Platform.OS === "web" ? 34 : 16);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search Vee ID or room number"
          placeholderTextColor={colors.mutedForeground}
          value={searchQuery}
          onChangeText={(t) => {
            setSearchQuery(t);
            if (!t) clearSearch();
          }}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
        {searching && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 4 }} />}
      </View>

      {/* Search Result */}
      {searchResult && (
        <TouchableOpacity
          style={[styles.searchResult, { backgroundColor: colors.card, borderColor: colors.primary + "55" }]}
          onPress={() => {
            const uid = searchResult.uid;
            clearSearch();
            router.push(`/profile/${uid}`);
          }}
        >
          <UserAvatar uri={searchResult.avatar} size={44} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.searchResultName, { color: colors.text }]}>{searchResult.displayName}</Text>
            <Text style={[styles.searchResultId, { color: colors.primary }]}>{searchResult.veeId}</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}
      {roomResult && (
        <TouchableOpacity
          style={[styles.searchResult, { backgroundColor: colors.card, borderColor: colors.primary + "55" }]}
          onPress={() => {
            const id = roomResult.id;
            clearSearch();
            router.push(`/room/${id}`);
          }}
        >
          <View style={[styles.roomBadge, { backgroundColor: colors.primary + "22" }]}>
            <Feather name="radio" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.searchResultName, { color: colors.text }]} numberOfLines={1}>
              {roomResult.name}
            </Text>
            <Text style={[styles.searchResultId, { color: colors.primary }]}>
              Room #{roomResult.id}
              {roomResult.topic ? ` · ${roomResult.topic}` : ""}
            </Text>
          </View>
          <View style={[styles.joinPill, { backgroundColor: colors.primary }]}>
            <Text style={styles.joinPillText}>Join</Text>
          </View>
        </TouchableOpacity>
      )}
      {searchError.length > 0 && (
        <View style={[styles.searchError, { backgroundColor: colors.destructive + "22" }]}>
          <Text style={[styles.searchErrorText, { color: colors.destructive }]}>{searchError}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : rooms.length === 0 ? (
        <View style={styles.center}>
          <Feather name="radio" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Live Rooms</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Be the first to start a voice room
          </Text>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={() => setCreateModal(true)}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text style={styles.createBtnText}>Create Room</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: bottomPadding + 16 }}
          renderItem={({ item }) => (
            <RoomCard
              room={item}
              onPress={() => {
                if (currentRoom?.id === item.id && isMinimized) {
                  setMinimized(false);
                }
                router.push(`/room/${item.id}`);
              }}
            />
          )}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <View style={styles.listHeader}>
              <Text style={[styles.listHeaderText, { color: colors.mutedForeground }]}>
                {rooms.length} LIVE ROOM{rooms.length !== 1 ? "S" : ""}
              </Text>
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: colors.primary }]}
                onPress={() => setCreateModal(true)}
              >
                <Feather name="plus" size={16} color="#fff" />
                <Text style={styles.smallBtnText}>New Room</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Create Room Modal */}
      <Modal visible={createModal} animationType="slide" transparent onRequestClose={() => setCreateModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setCreateModal(false)} />
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.modalTitle, { color: colors.text }]}>Create Voice Room</Text>

          <View style={styles.coverRow}>
            <TouchableOpacity
              style={[styles.coverPick, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={handlePickCover}
              disabled={uploadingCover}
              activeOpacity={0.8}
            >
              {uploadingCover ? (
                <ActivityIndicator color={colors.primary} />
              ) : coverImage ? (
                <Image source={{ uri: coverImage }} style={styles.coverImg} />
              ) : (
                <>
                  <Feather name="camera" size={22} color={colors.mutedForeground} />
                  <Text style={[styles.coverHint, { color: colors.mutedForeground }]}>Cover</Text>
                </>
              )}
            </TouchableOpacity>
            <View style={{ flex: 1, gap: 12 }}>
              <TextInput
                style={[styles.inputInline, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
                placeholder="Room name *"
                placeholderTextColor={colors.mutedForeground}
                value={roomName}
                onChangeText={setRoomName}
                maxLength={40}
              />
              <TextInput
                style={[styles.inputInline, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
                placeholder="Topic (optional)"
                placeholderTextColor={colors.mutedForeground}
                value={roomTopic}
                onChangeText={setRoomTopic}
                maxLength={50}
              />
            </View>
          </View>

          <TextInput
            style={[styles.input, styles.inputMulti, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
            placeholder="Description (optional)"
            placeholderTextColor={colors.mutedForeground}
            value={roomDesc}
            onChangeText={setRoomDesc}
            multiline
            maxLength={120}
          />

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Tags</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16 }}>
              {TAGS.map((tag) => {
                const sel = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={[
                      styles.tagBtn,
                      {
                        backgroundColor: sel ? colors.primary : colors.secondary,
                        borderColor: sel ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: sel ? "#fff" : colors.mutedForeground, fontSize: 13, fontWeight: "600" }}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={[styles.toggleRow, { borderColor: colors.border }]}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>Private Room</Text>
            <Switch
              value={isLocked}
              onValueChange={setIsLocked}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity
            style={[styles.createRoomBtn, { backgroundColor: colors.primary, opacity: creating || !roomName.trim() ? 0.5 : 1 }]}
            onPress={handleCreate}
            disabled={creating || !roomName.trim()}
          >
            <Text style={styles.createRoomBtnText}>{creating ? "Creating…" : "Create Room"}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {currentRoom && isMinimized && <FloatingRoom />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 14 },
  searchResult: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  searchResultName: { fontSize: 14, fontWeight: "700" },
  searchResultId: { fontSize: 12, marginTop: 2, fontWeight: "600" },
  roomBadge: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  joinPill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  joinPillText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  searchError: {
    marginHorizontal: 16,
    marginTop: 6,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  searchErrorText: { fontSize: 13 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 8 },
  emptyText: { fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 12,
  },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  listHeaderText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.8 },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  smallBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  overlay: { flex: 1 },
  modal: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "800", paddingHorizontal: 16, marginBottom: 16 },
  input: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 48, fontSize: 14 },
  inputInline: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 48, fontSize: 14 },
  inputMulti: { height: 80, paddingTop: 12 },
  coverRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginBottom: 12 },
  coverPick: { width: 108, height: 108, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4, overflow: "hidden" },
  coverImg: { width: "100%", height: "100%" },
  coverHint: { fontSize: 12, fontWeight: "600" },
  sectionLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.8, paddingHorizontal: 16, marginBottom: 8 },
  tagBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 16, marginBottom: 20, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1 },
  toggleLabel: { fontSize: 15, fontWeight: "600" },
  createRoomBtn: { marginHorizontal: 16, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  createRoomBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
