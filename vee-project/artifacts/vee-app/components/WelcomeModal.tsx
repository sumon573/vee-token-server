import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { VoiceRoom } from "../types";
import { UserAvatar } from "./UserAvatar";

interface Props {
  visible: boolean;
  room: VoiceRoom;
  onClose: () => void;
}

export function WelcomeModal({ visible, room, onClose }: Props) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient
            colors={[colors.primary + "44", "transparent"]}
            style={styles.topGrad}
          />
          <UserAvatar uri={room.hostAvatar} size={64} borderColor={colors.gold} borderWidth={2} />
          <Text style={[styles.roomName, { color: colors.text }]}>{room.name}</Text>
          <Text style={[styles.hostedBy, { color: colors.mutedForeground }]}>
            Hosted by {room.hostName}
          </Text>
          {room.topic ? (
            <View style={[styles.topicTag, { backgroundColor: colors.primary + "22" }]}>
              <Text style={[styles.topicText, { color: colors.primary }]}>📌 {room.topic}</Text>
            </View>
          ) : null}
          {room.welcomeMessage && room.welcomeMessageEnabled ? (
            <View style={[styles.welcomeBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="message-circle" size={14} color={colors.mutedForeground} />
              <Text style={[styles.welcomeText, { color: colors.text }]}>{room.welcomeMessage}</Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="users" size={14} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {room.listenerCount} listening
              </Text>
            </View>
            {room.tags?.slice(0, 3).map((t) => (
              <View key={t} style={[styles.tag, { backgroundColor: colors.primary + "22" }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>{t}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.joinBtn, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Feather name="mic" size={18} color="#fff" />
            <Text style={styles.joinText}>Enter Room</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#00000088", alignItems: "center", justifyContent: "center" },
  card: {
    width: "82%",
    borderRadius: 22,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
  },
  topGrad: { position: "absolute", top: 0, left: 0, right: 0, height: 80 },
  roomName: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  hostedBy: { fontSize: 14 },
  topicTag: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  topicText: { fontSize: 13, fontWeight: "600" },
  welcomeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    width: "100%",
  },
  welcomeText: { flex: 1, fontSize: 13, lineHeight: 18 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 12, fontWeight: "600" },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
    marginTop: 4,
    width: "100%",
    justifyContent: "center",
  },
  joinText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
