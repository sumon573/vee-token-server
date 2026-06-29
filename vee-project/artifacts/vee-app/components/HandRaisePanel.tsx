import React from "react";
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { HandRaiseRequest } from "../types";
import { UserAvatar } from "./UserAvatar";

interface Props {
  visible: boolean;
  requests: HandRaiseRequest[];
  onClose: () => void;
  onAccept: (req: HandRaiseRequest) => void;
  onReject: (req: HandRaiseRequest) => void;
}

export function HandRaisePanel({ visible, requests, onClose, onAccept, onReject }: Props) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.panel, { backgroundColor: colors.card }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            ✋ Stage Requests ({requests.length})
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {requests.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="users" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No one is requesting to join the stage
            </Text>
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(r) => r.userId}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item }) => (
              <View style={[styles.card, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <UserAvatar uri={item.userAvatar} size={44} />
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                  {item.userName}
                </Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
                    onPress={() => onAccept(item)}
                  >
                    <Feather name="check" size={16} color="#fff" />
                    <Text style={styles.btnText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rejectBtn, { borderColor: colors.border }]}
                    onPress={() => onReject(item)}
                  >
                    <Feather name="x" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#00000060" },
  panel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    gap: 14,
    maxHeight: "65%",
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 17, fontWeight: "800" },
  empty: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 14, textAlign: "center", fontWeight: "500" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  name: { flex: 1, fontSize: 15, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 8, alignItems: "center" },
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
