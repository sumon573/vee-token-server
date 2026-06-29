import React from "react";
import { StyleSheet, Text, View } from "react-native";

const LEVEL_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: "#9E9E9E", text: "#fff" },
  2: { bg: "#4CAF50", text: "#fff" },
  3: { bg: "#2196F3", text: "#fff" },
  4: { bg: "#9C27B0", text: "#fff" },
  5: { bg: "#FF9800", text: "#fff" },
  6: { bg: "#F44336", text: "#fff" },
  7: { bg: "#E91E63", text: "#fff" },
  8: { bg: "#673AB7", text: "#fff" },
  9: { bg: "#F5A623", text: "#000" },
  10: { bg: "#00D4A0", text: "#000" },
};

function getLevelColor(level: number) {
  const key = Math.min(level, 10);
  return LEVEL_COLORS[key] ?? LEVEL_COLORS[10];
}

interface Props {
  level: number;
  small?: boolean;
}

export function LevelBadge({ level, small = false }: Props) {
  const { bg, text } = getLevelColor(level);
  return (
    <View style={[styles.badge, { backgroundColor: bg }, small && styles.small]}>
      <Text style={[styles.label, { color: text }, small && styles.smallLabel]}>
        Lv.{level}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  label: { fontSize: 11, fontWeight: "900", letterSpacing: 0.3 },
  small: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  smallLabel: { fontSize: 9 },
});
