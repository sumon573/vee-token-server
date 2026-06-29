import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { RoomPoll } from "../types";

interface Props {
  poll: RoomPoll | null;
  myVote: number | null;
  canCreate: boolean;
  onVote: (optionIndex: number) => void;
  onCreate: (question: string, options: string[]) => void;
  onClose: () => void;
}

function timeLeft(endsAt: number): string {
  const s = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
  if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${s}s`;
}

export function RoomPollPanel({ poll, myVote, canCreate, onVote, onCreate, onClose }: Props) {
  const colors = useColors();
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const totalVotes = poll
    ? Object.values(poll.votes).reduce((a, b) => {
        const count: Record<number, number> = {};
        Object.values(poll.votes).forEach((v) => { count[v] = (count[v] ?? 0) + 1; });
        return Object.values(count).reduce((x, y) => x + y, 0);
      }, 0)
    : 0;

  const voteCounts = poll
    ? poll.options.map((_, i) =>
        Object.values(poll.votes).filter((v) => v === i).length
      )
    : [];

  const realTotal = poll ? Object.values(poll.votes).length : 0;

  const handleCreate = () => {
    const q = question.trim();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!q || opts.length < 2) return;
    onCreate(q, opts);
    setQuestion("");
    setOptions(["", ""]);
    setCreating(false);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.panel, { backgroundColor: colors.card }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {creating ? "Create Poll" : "Room Poll"}
          </Text>
          <View style={styles.headerRight}>
            {canCreate && !creating && !poll && (
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.primary }]}
                onPress={() => setCreating(true)}
              >
                <Feather name="plus" size={14} color="#fff" />
                <Text style={styles.createBtnText}>New Poll</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {creating && (
          <View style={{ gap: 10 }}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
              placeholder="Ask a question…"
              placeholderTextColor={colors.mutedForeground}
              value={question}
              onChangeText={setQuestion}
            />
            {options.map((opt, i) => (
              <TextInput
                key={i}
                style={[styles.input, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
                placeholder={`Option ${i + 1}`}
                placeholderTextColor={colors.mutedForeground}
                value={opt}
                onChangeText={(t) => setOptions((prev) => prev.map((o, j) => j === i ? t : o))}
              />
            ))}
            {options.length < 4 && (
              <TouchableOpacity onPress={() => setOptions((p) => [...p, ""])}>
                <Text style={[styles.addOption, { color: colors.primary }]}>+ Add option</Text>
              </TouchableOpacity>
            )}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.secondary }]}
                onPress={() => setCreating(false)}
              >
                <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary }]}
                onPress={handleCreate}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Start Poll</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {poll && !creating && (
          <View style={{ gap: 10 }}>
            <View style={styles.pollHeader}>
              <Text style={[styles.question, { color: colors.text }]}>{poll.question}</Text>
              <Text style={[styles.timer, { color: colors.gold }]}>{timeLeft(poll.endsAt)}</Text>
            </View>
            {poll.options.map((opt, i) => {
              const count = voteCounts[i] ?? 0;
              const pct = realTotal > 0 ? Math.round((count / realTotal) * 100) : 0;
              const voted = myVote === i;
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: voted ? colors.primary + "33" : colors.secondary,
                      borderColor: voted ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => myVote == null && onVote(i)}
                  activeOpacity={myVote == null ? 0.7 : 1}
                >
                  <View style={[styles.optionBar, { width: `${pct}%` as `${number}%`, backgroundColor: colors.primary + "55" }]} />
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionText, { color: colors.text }]}>{opt}</Text>
                    <Text style={[styles.optionPct, { color: voted ? colors.primary : colors.mutedForeground }]}>
                      {pct}% ({count})
                    </Text>
                  </View>
                  {voted && <Feather name="check-circle" size={16} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
            <Text style={[styles.totalVotes, { color: colors.mutedForeground }]}>
              {realTotal} {realTotal === 1 ? "vote" : "votes"} total
            </Text>
          </View>
        )}

        {!poll && !creating && (
          <View style={styles.empty}>
            <Feather name="bar-chart-2" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No active poll</Text>
          </View>
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
    gap: 12,
    maxHeight: "75%",
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 17, fontWeight: "800" },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  createBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
  },
  addOption: { fontWeight: "600", fontSize: 14, textAlign: "center", paddingVertical: 4 },
  actions: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  pollHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  question: { fontSize: 16, fontWeight: "700", flex: 1, marginRight: 8 },
  timer: { fontSize: 13, fontWeight: "600" },
  optionCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: "hidden",
    position: "relative",
    height: 52,
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  optionBar: { position: "absolute", left: 0, top: 0, bottom: 0 },
  optionContent: { flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  optionText: { fontSize: 14, fontWeight: "600" },
  optionPct: { fontSize: 13, fontWeight: "700" },
  totalVotes: { fontSize: 12, textAlign: "center" },
  empty: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 15, fontWeight: "600" },
});
