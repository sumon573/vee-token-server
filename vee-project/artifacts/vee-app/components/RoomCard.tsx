import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { VoiceRoom } from "../types";
import { UserAvatar } from "./UserAvatar";
import { useColors } from "@/hooks/useColors";

interface Props {
  room: VoiceRoom;
  onPress: () => void;
}

export function RoomCard({ room, onPress }: Props) {
  const colors = useColors();
  const filledSeats = room.seats.filter((s) => s.userId).length;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <View style={styles.hostRow}>
          <UserAvatar uri={room.coverImage || room.hostAvatar} size={44} borderColor={colors.gold} borderWidth={2} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={[styles.roomName, { color: colors.text }]} numberOfLines={1}>
              {room.name}
            </Text>
            {room.topic ? (
              <Text style={[styles.topic, { color: colors.primary }]} numberOfLines={1}>
                {room.topic}
              </Text>
            ) : null}
            <Text style={[styles.hostName, { color: colors.mutedForeground }]} numberOfLines={1}>
              {room.hostName} · #{room.id}
            </Text>
          </View>
          {room.isLocked && (
            <Feather name="lock" size={14} color={colors.mutedForeground} style={{ marginLeft: 8 }} />
          )}
          {room.pkBattle?.isActive && (
            <View style={[styles.pkBadge, { backgroundColor: colors.destructive }]}>
              <Text style={styles.pkLabel}>PK</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.seatsRow}>
        {room.seats.slice(0, 6).map((seat) => (
          <View key={seat.index} style={styles.miniSeat}>
            {seat.userId ? (
              <UserAvatar uri={seat.userAvatar} size={28} />
            ) : (
              <View
                style={[
                  styles.emptySeat,
                  { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
              />
            )}
          </View>
        ))}
        {room.seats.length > 6 && (
          <View style={[styles.miniSeat, { alignItems: "center", justifyContent: "center" }]}>
            <Text style={[styles.moreSeats, { color: colors.mutedForeground }]}>
              +{room.seats.length - 6}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.stat}>
          <Feather name="users" size={12} color={colors.mutedForeground} />
          <Text style={[styles.statText, { color: colors.mutedForeground }]}>
            {room.listenerCount}
          </Text>
        </View>
        <View style={styles.stat}>
          <Feather name="gift" size={12} color={colors.gold} />
          <Text style={[styles.statText, { color: colors.gold }]}>{room.totalGifts}</Text>
        </View>
        {room.tags?.slice(0, 2).map((tag) => (
          <View key={tag} style={[styles.tag, { backgroundColor: colors.primary + "22" }]}>
            <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  header: { padding: 14, paddingBottom: 10 },
  hostRow: { flexDirection: "row", alignItems: "center" },
  roomName: { fontSize: 15, fontWeight: "700" },
  topic: { fontSize: 12, fontWeight: "600", marginTop: 1 },
  hostName: { fontSize: 12, marginTop: 2 },
  pkBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  pkLabel: { fontSize: 10, fontWeight: "900", color: "#fff" },
  seatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 6,
  },
  miniSeat: { marginRight: 4 },
  emptySeat: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  moreSeats: { fontSize: 11, fontWeight: "600" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 10,
  },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, fontWeight: "600" },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  tagText: { fontSize: 11, fontWeight: "600" },
});
