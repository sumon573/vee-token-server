import React, { useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Gift, VeeUser } from "../types";
import { useColors } from "@/hooks/useColors";
import { useEconomy } from "../contexts/EconomyContext";
import { useAuth } from "../contexts/AuthContext";

interface Props {
  visible: boolean;
  onClose: () => void;
  receiver: VeeUser;
  roomId: string;
}

export function GiftPanel({ visible, onClose, receiver, roomId }: Props) {
  const colors = useColors();
  const { gifts, sendGift, canAfford } = useEconomy();
  const { user } = useAuth();
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [count, setCount] = useState(1);
  const [sending, setSending] = useState(false);

  const total = (selectedGift?.diamondCost ?? 0) * count;

  const handleSend = async () => {
    if (!selectedGift || !user || sending) return;
    setSending(true);
    const success = await sendGift(selectedGift, count, receiver.uid, receiver.displayName, roomId);
    setSending(false);
    if (success) {
      setSelectedGift(null);
      setCount(1);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.panel, { backgroundColor: colors.card }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>🎁 Send Gift to {receiver.displayName}</Text>
          <View style={styles.balanceRow}>
            <Feather name="zap" size={14} color={colors.primary} />
            <Text style={[styles.balance, { color: colors.primary }]}>{(user?.diamonds ?? 0).toLocaleString()}</Text>
          </View>
        </View>

        <FlatList
          data={gifts}
          numColumns={4}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
          renderItem={({ item: gift }) => {
            const selected = selectedGift?.id === gift.id;
            const affordable = canAfford(gift.diamondCost);
            return (
              <TouchableOpacity
                style={[
                  styles.giftItem,
                  {
                    backgroundColor: selected ? colors.primary + "33" : colors.secondary,
                    borderColor: selected ? colors.primary : colors.border,
                    opacity: affordable ? 1 : 0.4,
                  },
                ]}
                onPress={() => affordable && setSelectedGift(gift)}
                activeOpacity={0.8}
              >
                <Text style={styles.giftEmoji}>{gift.emoji}</Text>
                <Text style={[styles.giftName, { color: colors.text }]} numberOfLines={1}>
                  {gift.name}
                </Text>
                <View style={styles.giftCostRow}>
                  <Feather name="zap" size={10} color={colors.primary} />
                  <Text style={[styles.giftCost, { color: colors.primary }]}>{gift.diamondCost}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />

        {selectedGift && (
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedEmoji}>{selectedGift.emoji}</Text>
              <View>
                <Text style={[styles.selectedName, { color: colors.text }]}>{selectedGift.name}</Text>
                <Text style={[styles.selectedCost, { color: colors.mutedForeground }]}>
                  💎 {selectedGift.diamondCost} each
                </Text>
              </View>
            </View>
            <View style={styles.countRow}>
              {[1, 5, 10, 99].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.countBtn, { backgroundColor: count === n ? colors.primary : colors.secondary, borderColor: colors.border }]}
                  onPress={() => setCount(n)}
                >
                  <Text style={[styles.countLabel, { color: count === n ? "#fff" : colors.mutedForeground }]}>×{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: sending ? 0.6 : 1 }]}
              onPress={handleSend}
              disabled={sending}
            >
              <Text style={styles.sendLabel}>
                {sending ? "Sending…" : `Send  💎 ${total.toLocaleString()}`}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "transparent" },
  panel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: "68%",
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 12 },
  title: { fontSize: 15, fontWeight: "700" },
  balanceRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  balance: { fontSize: 14, fontWeight: "700" },
  giftItem: { flex: 1, margin: 6, borderRadius: 12, borderWidth: 1.5, alignItems: "center", padding: 10 },
  giftEmoji: { fontSize: 30 },
  giftName: { fontSize: 11, fontWeight: "600", marginTop: 4, textAlign: "center" },
  giftCostRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  giftCost: { fontSize: 11, fontWeight: "700" },
  footer: { borderTopWidth: 1, padding: 16, gap: 12 },
  selectedInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  selectedEmoji: { fontSize: 36 },
  selectedName: { fontSize: 15, fontWeight: "700" },
  selectedCost: { fontSize: 12 },
  countRow: { flexDirection: "row", gap: 8, justifyContent: "center" },
  countBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  countLabel: { fontSize: 13, fontWeight: "700" },
  sendBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  sendLabel: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
