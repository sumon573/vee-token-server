import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useRoom } from "@/contexts/RoomContext";

export function FloatingRoom() {
  const colors = useColors();
  const router = useRouter();
  const { currentRoom, setMinimized, leaveRoom, isMicEnabled, toggleMic } = useRoom();

  if (!currentRoom) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.primary + "66" }]}>
      <TouchableOpacity
        style={styles.infoArea}
        onPress={() => {
          setMinimized(false);
          router.push(`/room/${currentRoom.id}`);
        }}
      >
        <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.roomName, { color: colors.text }]} numberOfLines={1}>
            {currentRoom.name}
          </Text>
          <Text style={[styles.roomSub, { color: colors.mutedForeground }]}>
            {currentRoom.listenerCount} listening · Tap to expand
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.micBtn, { backgroundColor: isMicEnabled ? colors.primary + "33" : colors.secondary }]}
        onPress={toggleMic}
      >
        <Feather name={isMicEnabled ? "mic" : "mic-off"} size={16} color={isMicEnabled ? colors.primary : colors.mutedForeground} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.closeBtn, { backgroundColor: colors.destructive + "22" }]}
        onPress={leaveRoom}
      >
        <Feather name="phone-off" size={16} color={colors.destructive} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 90,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  infoArea: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  roomName: { fontSize: 13, fontWeight: "700" },
  roomSub: { fontSize: 11, marginTop: 1 },
  micBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
});
