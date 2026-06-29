import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Seat } from "../types";
import { UserAvatar } from "./UserAvatar";
import { useColors } from "@/hooks/useColors";

interface Props {
  seat: Seat;
  isHost?: boolean;
  isMe?: boolean;
  canManage?: boolean;
  onPress?: () => void;
  label?: string;
}

export function VoiceSeat({ seat, isHost = false, isMe = false, canManage = false, onPress, label }: Props) {
  const colors = useColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!seat.isSpeaking) {
      pulseAnim.setValue(1);
      opacityAnim.setValue(0.3);
      return;
    }
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 0.9, duration: 500, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [seat.isSpeaking]);

  const ringColor = isHost ? colors.gold : seat.roomRole === "admin" ? colors.teal : colors.primary;
  const roleLabel = isHost ? "HOST" : seat.roomRole === "admin" ? "MOD" : null;
  const roleLabelColor = isHost ? "#000" : "#fff";
  const roleBgColor = isHost ? colors.gold : colors.teal;

  if (seat.userId) {
    return (
      <TouchableOpacity style={styles.seatContainer} onPress={onPress} activeOpacity={0.8}>
        <View style={styles.avatarWrapper}>
          {seat.isSpeaking && (
            <Animated.View
              style={[styles.speakRing, { borderColor: ringColor, transform: [{ scale: pulseAnim }], opacity: opacityAnim }]}
            />
          )}
          <View style={[styles.avatarRing, { borderColor: ringColor, borderWidth: isMe ? 2.5 : 2 }]}>
            <UserAvatar uri={seat.userAvatar} size={52} />
          </View>
          {roleLabel && (
            <View style={[styles.roleBadge, { backgroundColor: roleBgColor }]}>
              <Text style={[styles.roleLabel, { color: roleLabelColor }]}>{roleLabel}</Text>
            </View>
          )}
          {seat.isMuted && !roleLabel && (
            <View style={[styles.muteIcon, { backgroundColor: colors.destructive }]}>
              <Feather name="mic-off" size={10} color="#fff" />
            </View>
          )}
          {seat.isMuted && roleLabel && (
            <View style={[styles.muteBadgeSmall, { backgroundColor: colors.destructive }]}>
              <Feather name="mic-off" size={8} color="#fff" />
            </View>
          )}
          {seat.isHandRaised && (
            <View style={[styles.handIcon, { backgroundColor: colors.gold }]}>
              <Text style={{ fontSize: 9 }}>✋</Text>
            </View>
          )}
          {canManage && (
            <View style={[styles.manageOverlay, { backgroundColor: colors.primary + "22" }]}>
              <Feather name="more-vertical" size={12} color={colors.primary} />
            </View>
          )}
        </View>
        <Text
          style={[styles.seatName, { color: isMe ? colors.primary : colors.text }]}
          numberOfLines={1}
        >
          {seat.userName}
        </Text>
      </TouchableOpacity>
    );
  }

  if (seat.isLocked) {
    return (
      <TouchableOpacity style={styles.seatContainer} onPress={canManage ? onPress : undefined} activeOpacity={0.8}>
        <View style={[styles.emptySeat, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="lock" size={22} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.seatName, { color: colors.mutedForeground }]}>
          {label ?? `Seat ${seat.index + 1}`}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.seatContainer} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.emptySeat, { backgroundColor: colors.secondary, borderColor: colors.primary + "44" }]}>
        <Text style={[styles.seatIndex, { color: colors.mutedForeground }]}>{seat.index + 1}</Text>
      </View>
      <Text style={[styles.seatName, { color: colors.mutedForeground }]}>
        {label ?? "Open"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  seatContainer: { alignItems: "center", width: 80, marginBottom: 14 },
  avatarWrapper: { position: "relative", width: 64, height: 64, alignItems: "center", justifyContent: "center" },
  avatarRing: { borderRadius: 32, padding: 2 },
  speakRing: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    zIndex: -1,
  },
  roleBadge: {
    position: "absolute",
    bottom: -4,
    alignSelf: "center",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleLabel: { fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  muteIcon: {
    position: "absolute",
    right: -2,
    bottom: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  muteBadgeSmall: {
    position: "absolute",
    right: -2,
    top: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  handIcon: {
    position: "absolute",
    left: -4,
    top: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  manageOverlay: {
    position: "absolute",
    right: -4,
    bottom: 16,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  seatName: { fontSize: 11, fontWeight: "600", marginTop: 6, textAlign: "center", width: 76 },
  emptySeat: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  seatIndex: { fontSize: 18, fontWeight: "700" },
});
